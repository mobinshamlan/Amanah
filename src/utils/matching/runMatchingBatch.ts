export const MATCHING_BATCH_SIZE = 4;
// No new comparison starts after this much time; the rest stay unchecked.
export const MATCHING_TIME_BUDGET_MS = 30_000;

export type MatchReport = {
  id: string;
  item_name: string;
  description: string;
  location: string;
  created_at: string;
};

export type ReportPair = {
  key: string;
  lost: MatchReport;
  found: MatchReport;
};

export type MatchingFailure =
  | "quota"
  | "timeout"
  | "api"
  | "invalid_response"
  | "config"
  | "save";

export type ComparisonDetails = {
  decision: "match" | "no_match" | "insufficient_information";
  reason: string;
  supportingDetails: string[];
  contradictions: string[];
  missingInformation: string[];
  similarityScore: number;
};

export type CompareOutcome =
  | { ok: true; result: ComparisonDetails }
  | { ok: false; failure: MatchingFailure };

export type BatchCompareOutcome =
  | { ok: true; results: ComparisonDetails[] }
  | { ok: false; failure: MatchingFailure };

export type SaveOutcome = "saved" | "duplicate" | "error";

type SaveMatch = (pair: ReportPair, result: ComparisonDetails) => Promise<SaveOutcome>;
type RecordCheck = (pair: ReportPair, result: ComparisonDetails) => Promise<SaveOutcome>;

export type MatchingRunSummary = {
  checked: number;
  matched: number;
  uncertain: number;
  noMatch: number;
  failed: number;
  alreadySaved: number;
  remaining: number;
  failure: MatchingFailure | null;
  stoppedForTime: boolean;
};

export function pairKey(lostId: string, foundId: string) {
  return `${lostId}:${foundId}`;
}

function newerFirst(a: MatchReport, b: MatchReport) {
  if (a.created_at !== b.created_at) {
    return a.created_at < b.created_at ? 1 : -1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * A pair is as new as its older report, so pairs made only of the newest
 * reports are checked first.
 */
export function buildPairs(
  lostReports: MatchReport[],
  foundReports: MatchReport[],
): ReportPair[] {
  const pairs: ReportPair[] = [];
  for (const lost of lostReports) {
    for (const found of foundReports) {
      pairs.push({ key: pairKey(lost.id, found.id), lost, found });
    }
  }

  return pairs.sort((a, b) => {
    const [aOlder, aNewer] = [a.lost, a.found].sort(newerFirst).reverse();
    const [bOlder, bNewer] = [b.lost, b.found].sort(newerFirst).reverse();
    return (
      newerFirst(aOlder, bOlder) ||
      newerFirst(aNewer, bNewer) ||
      (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
    );
  });
}

function emptySummary(): MatchingRunSummary {
  return {
    checked: 0,
    matched: 0,
    uncertain: 0,
    noMatch: 0,
    failed: 0,
    alreadySaved: 0,
    remaining: 0,
    failure: null,
    stoppedForTime: false,
  };
}

/**
 * Saves match and insufficient_information results for review and records every
 * completed comparison (including no_match) so it is not repeated. Returns false
 * when saving fails; that pair stays unrecorded and is retried later.
 */
async function saveResult({
  pair,
  result,
  summary,
  checked,
  saveMatch,
  recordCheck,
}: {
  pair: ReportPair;
  result: ComparisonDetails;
  summary: MatchingRunSummary;
  checked: Set<string>;
  saveMatch: SaveMatch;
  recordCheck: RecordCheck;
}): Promise<boolean> {
  if (result.decision !== "no_match") {
    const saveOutcome = await saveMatch(pair, result);
    if (saveOutcome === "error") {
      summary.failed += 1;
      summary.failure = "save";
      return false;
    }
    if (saveOutcome === "duplicate") {
      summary.alreadySaved += 1;
    } else if (result.decision === "match") {
      summary.matched += 1;
    } else {
      summary.uncertain += 1;
    }
    // A saved suggestion already counts as checked, even if recording below fails.
    checked.add(pair.key);
  }

  if ((await recordCheck(pair, result)) === "error") {
    summary.failed += 1;
    summary.failure = "save";
    return false;
  }
  checked.add(pair.key);

  if (result.decision === "no_match") {
    summary.noMatch += 1;
  }
  summary.checked += 1;
  return true;
}

/**
 * Compares up to batchSize pairs that have not been checked yet, one Gemini
 * request per pair. The first failure stops the batch without recording that
 * pair, so it is retried on the next run.
 */
export async function runMatchingBatch({
  pairs,
  checkedKeys,
  batchSize,
  timeBudgetMs = MATCHING_TIME_BUDGET_MS,
  now = Date.now,
  compare,
  saveMatch,
  recordCheck,
}: {
  pairs: ReportPair[];
  checkedKeys: Set<string>;
  batchSize: number;
  timeBudgetMs?: number;
  now?: () => number;
  compare: (pair: ReportPair) => Promise<CompareOutcome>;
  saveMatch: SaveMatch;
  recordCheck: RecordCheck;
}): Promise<MatchingRunSummary> {
  const summary = emptySummary();
  const startedAt = now();
  const checked = new Set(checkedKeys);
  const batch = pairs.filter((pair) => !checked.has(pair.key)).slice(0, batchSize);

  for (const pair of batch) {
    if (summary.checked > 0 && now() - startedAt >= timeBudgetMs) {
      summary.stoppedForTime = true;
      break;
    }

    const outcome = await compare(pair);
    if (!outcome.ok) {
      summary.failed += 1;
      summary.failure = outcome.failure;
      break;
    }

    const saved = await saveResult({
      pair,
      result: outcome.result,
      summary,
      checked,
      saveMatch,
      recordCheck,
    });
    if (!saved) {
      break;
    }
  }

  summary.remaining = pairs.filter((pair) => !checked.has(pair.key)).length;
  return summary;
}

/**
 * Compares up to batchSize unchecked pairs that share one new report with a
 * single Gemini request. A failed or rejected answer records nothing, so every
 * pair in the batch stays unchecked and is retried later.
 */
export async function runCandidateBatch({
  pairs,
  checkedKeys,
  batchSize,
  compareBatch,
  saveMatch,
  recordCheck,
}: {
  pairs: ReportPair[];
  checkedKeys: Set<string>;
  batchSize: number;
  compareBatch: (batch: ReportPair[]) => Promise<BatchCompareOutcome>;
  saveMatch: SaveMatch;
  recordCheck: RecordCheck;
}): Promise<MatchingRunSummary> {
  const summary = emptySummary();
  const checked = new Set(checkedKeys);
  const batch = pairs.filter((pair) => !checked.has(pair.key)).slice(0, batchSize);

  if (batch.length > 0) {
    const outcome = await compareBatch(batch);
    if (!outcome.ok) {
      summary.failed += 1;
      summary.failure = outcome.failure;
    } else if (outcome.results.length !== batch.length) {
      summary.failed += 1;
      summary.failure = "invalid_response";
    } else {
      for (const [index, pair] of batch.entries()) {
        const saved = await saveResult({
          pair,
          result: outcome.results[index],
          summary,
          checked,
          saveMatch,
          recordCheck,
        });
        if (!saved) {
          break;
        }
      }
    }
  }

  summary.remaining = pairs.filter((pair) => !checked.has(pair.key)).length;
  return summary;
}
