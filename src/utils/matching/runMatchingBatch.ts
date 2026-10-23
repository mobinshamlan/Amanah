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

export type SaveOutcome = "saved" | "duplicate" | "error";

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

/**
 * Compares up to batchSize pairs that have not been checked yet. match and
 * insufficient_information results are saved for review, and every completed
 * comparison (including no_match) is recorded so it is not repeated. The first
 * failure stops the batch without recording that pair, so it is retried on the
 * next run.
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
  saveMatch: (pair: ReportPair, result: ComparisonDetails) => Promise<SaveOutcome>;
  recordCheck: (pair: ReportPair, result: ComparisonDetails) => Promise<SaveOutcome>;
}): Promise<MatchingRunSummary> {
  const summary: MatchingRunSummary = {
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

    const { result } = outcome;
    if (result.decision !== "no_match") {
      const saveOutcome = await saveMatch(pair, result);
      if (saveOutcome === "error") {
        summary.failed += 1;
        summary.failure = "save";
        break;
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
      break;
    }
    checked.add(pair.key);

    if (result.decision === "no_match") {
      summary.noMatch += 1;
    }
    summary.checked += 1;
  }

  summary.remaining = pairs.filter((pair) => !checked.has(pair.key)).length;
  return summary;
}
