import {
  answeringModel,
  compareLostAndFoundReports,
  compareReportWithCandidates,
  GeminiApiError,
  GeminiConfigError,
  GeminiInvalidResponseError,
  getGeminiModel,
  MAX_CANDIDATES_PER_REQUEST,
  type GeminiAttempt,
} from "@/utils/gemini/compareReports";
import { GeminiUsageLimitError } from "@/utils/limits/usageLimit";
import { currentUsageScope, runWithUsageScope } from "@/utils/limits/usageScope";
import {
  MATCHING_BATCH_SIZE,
  pairKey,
  runCandidateBatch,
  runMatchingBatch,
  type BatchCompareOutcome,
  type CompareOutcome,
  type ComparisonDetails,
  type MatchReport,
  type MatchingFailure,
  type MatchingRunSummary,
  type ReportPair,
  type SaveOutcome,
} from "@/utils/matching/runMatchingBatch";
import type { createAdminClient } from "@/utils/supabase/admin";
import { recordMatchingRun, toRunRow } from "@/utils/monitoring/runLog";
import { isSandboxMode } from "@/utils/sandbox";
import { compareBatchLocally, isBusyGeminiError } from "@/utils/sandbox/localMatch";

// Server-only: uses the admin client and the Gemini key. Never import from client components.

type AdminClient = ReturnType<typeof createAdminClient>;
type Source = "admin" | "auto";

export const REPORT_COLUMNS = "id, item_name, description, location, created_at";

function failureKind(error: unknown): MatchingFailure {
  if (error instanceof GeminiUsageLimitError) {
    return "usage_limit";
  }
  if (error instanceof GeminiConfigError) {
    return "config";
  }
  if (error instanceof GeminiApiError) {
    if (error.isQuota) {
      return "quota";
    }
    return error.isTimeout ? "timeout" : "api";
  }
  if (error instanceof GeminiInvalidResponseError) {
    return "invalid_response";
  }
  return "api";
}

export function elapsedSince(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}

function formatAttempts(attempts: GeminiAttempt[]) {
  return (
    attempts
      .map((attempt) => `${attempt.ms}ms/${attempt.status}${attempt.fallback ? "@fallback" : ""}`)
      .join(",") || "none"
  );
}

export function checkedKeysFrom(
  rows: { lost_report_id: string; found_report_id: string }[],
) {
  return new Set(rows.map((row) => pairKey(row.lost_report_id, row.found_report_id)));
}

function toComparisonInput(report: MatchReport) {
  return {
    itemName: report.item_name,
    description: report.description,
    location: report.location,
  };
}

// Automatic matching sends this many Gemini requests at once per step.
const AUTO_PARALLEL_REQUESTS = 3;

/** Inserts suggestions and pair checks, tracking total save time. */
function createSaver(supabase: AdminClient, source: Source) {
  const model = getGeminiModel();
  const timing = { saveMs: 0 };

  const timedInsert = async (
    table: "report_matches" | "report_pair_checks",
    row: Record<string, unknown>,
  ): Promise<SaveOutcome> => {
    const startedAt = performance.now();
    const { error } = await supabase.from(table).insert(row);
    const ms = elapsedSince(startedAt);
    timing.saveMs += ms;
    if (!error) {
      return "saved";
    }
    if (error.code === "23505") {
      return "duplicate";
    }
    console.error(`Matching (${source}) failed to save to ${table}:`, error.code, `${ms}ms`);
    return "error";
  };

  const saveMatch = (pair: ReportPair, result: ComparisonDetails) =>
    timedInsert("report_matches", {
      lost_report_id: pair.lost.id,
      found_report_id: pair.found.id,
      explanation: result.reason,
      model: result.model ?? model,
      ai_decision: result.decision,
      supporting_details: result.supportingDetails,
      contradictions: result.contradictions,
      missing_information: result.missingInformation,
      ai_similarity_score: result.similarityScore,
    });

  const recordCheck = (pair: ReportPair, result: ComparisonDetails) =>
    timedInsert("report_pair_checks", {
      lost_report_id: pair.lost.id,
      found_report_id: pair.found.id,
      ai_decision: result.decision,
      model: result.model ?? model,
    });

  return { saveMatch, recordCheck, timing };
}

function logRunSummary({
  source,
  totalMs,
  loadMs,
  geminiMs,
  saveMs,
  requests,
  summary,
}: {
  source: Source;
  totalMs: number;
  loadMs: number;
  geminiMs: number;
  saveMs: number;
  requests: number;
  summary: MatchingRunSummary;
}) {
  console.info(
    `Matching (${source}) run finished in ${totalMs}ms:`,
    `load=${loadMs}ms gemini=${geminiMs}ms requests=${requests} saves=${saveMs}ms`,
    `checked=${summary.checked} matched=${summary.matched} uncertain=${summary.uncertain}`,
    `no_match=${summary.noMatch} failed=${summary.failed} already_saved=${summary.alreadySaved}`,
    `remaining=${summary.remaining} failure=${summary.failure ?? "none"}`,
    `stopped_for_time=${summary.stoppedForTime}`,
  );
}

/**
 * Compares one bounded batch of unchecked pairs with Gemini, one request per
 * pair (used by /admin). Logs contain only the source label, durations,
 * statuses, decisions, and counts.
 */
export async function runMatchingPairs({
  supabase,
  pairs,
  checkedKeys,
  source,
  loadMs,
}: {
  supabase: AdminClient;
  pairs: ReportPair[];
  checkedKeys: Set<string>;
  source: Source;
  loadMs: number;
}): Promise<MatchingRunSummary> {
  const runStartedAt = performance.now();
  const saver = createSaver(supabase, source);
  let pairNumber = 0;
  let geminiMs = 0;

  const compare = async (pair: ReportPair): Promise<CompareOutcome> => {
    pairNumber += 1;
    const attempts: GeminiAttempt[] = [];
    const startedAt = performance.now();
    try {
      const parent = currentUsageScope();
      const result = await runWithUsageScope(
        { ipKey: parent?.ipKey ?? "unknown", reportId: pair.lost.id },
        () =>
          compareLostAndFoundReports(
            toComparisonInput(pair.lost),
            toComparisonInput(pair.found),
            { onAttempt: (attempt) => attempts.push(attempt) },
          ),
      );
      const ms = elapsedSince(startedAt);
      geminiMs += ms;
      console.info(
        `Matching (${source}) pair ${pairNumber}: gemini=${ms}ms attempts=${formatAttempts(attempts)} decision=${result.decision}`,
      );
      return { ok: true, result: { ...result, model: answeringModel(attempts) } };
    } catch (error) {
      const ms = elapsedSince(startedAt);
      geminiMs += ms;
      const failure = failureKind(error);
      console.error(
        `Matching (${source}) pair ${pairNumber} failed: gemini=${ms}ms attempts=${formatAttempts(attempts)} failure=${failure}`,
      );
      return { ok: false, failure };
    }
  };

  const summary = await runMatchingBatch({
    pairs,
    checkedKeys,
    batchSize: MATCHING_BATCH_SIZE,
    compare,
    saveMatch: saver.saveMatch,
    recordCheck: saver.recordCheck,
  });

  const totalMs = elapsedSince(runStartedAt) + loadMs;
  logRunSummary({
    source,
    totalMs,
    loadMs,
    geminiMs,
    saveMs: saver.timing.saveMs,
    requests: pairNumber,
    summary,
  });
  await recordMatchingRun(
    supabase,
    toRunRow(source, summary, { durationMs: totalMs, requests: pairNumber, model: getGeminiModel() }),
  );
  return summary;
}

/**
 * Compares the new report with up to MAX_CANDIDATES_PER_REQUEST unchecked
 * opposite-type reports in one Gemini request (used by automatic matching).
 * Every pair must involve the same new report on the given side.
 */
export async function runNewReportMatching({
  supabase,
  side,
  pairs,
  checkedKeys,
  loadMs,
}: {
  supabase: AdminClient;
  side: "lost" | "found";
  pairs: ReportPair[];
  checkedKeys: Set<string>;
  loadMs: number;
}): Promise<MatchingRunSummary> {
  const runStartedAt = performance.now();
  const saver = createSaver(supabase, "auto");
  const otherSide = side === "lost" ? "found" : "lost";
  let requests = 0;
  let geminiMs = 0;

  const compareBatch = async (batch: ReportPair[]): Promise<BatchCompareOutcome> => {
    requests += 1;
    const attempts: GeminiAttempt[] = [];
    const startedAt = performance.now();
    try {
      const parent = currentUsageScope();
      const results = await runWithUsageScope(
        { ipKey: parent?.ipKey ?? "unknown", reportId: batch[0][side].id },
        () =>
          compareReportWithCandidates(
            { reportType: side, report: toComparisonInput(batch[0][side]) },
            batch.map((pair) => toComparisonInput(pair[otherSide])),
            { onAttempt: (attempt) => attempts.push(attempt) },
          ),
      );
      geminiMs = elapsedSince(startedAt);
      const count = (decision: ComparisonDetails["decision"]) =>
        results.filter((result) => result.decision === decision).length;
      console.info(
        `Matching (auto) request: candidates=${batch.length} gemini=${geminiMs}ms attempts=${formatAttempts(attempts)}`,
        `match=${count("match")} insufficient=${count("insufficient_information")} no_match=${count("no_match")}`,
      );
      const model = answeringModel(attempts);
      return { ok: true, results: results.map((result) => ({ ...result, model })) };
    } catch (error) {
      geminiMs = elapsedSince(startedAt);
      const failure = failureKind(error);
      console.error(
        `Matching (auto) request failed: candidates=${batch.length} gemini=${geminiMs}ms attempts=${formatAttempts(attempts)} failure=${failure}`,
      );
      // Test mode: when Gemini is busy, compare this batch word by word instead,
      // so the visitor gets a result. Saved like any other, with model "local-fallback".
      if (isSandboxMode() && isBusyGeminiError(error)) {
        console.info(`Matching: local fallback used candidates=${batch.length}`);
        return { ok: true, results: compareBatchLocally(batch) };
      }
      return { ok: false, failure };
    }
  };

  const summary = await runCandidateBatch({
    pairs,
    checkedKeys,
    batchSize: MAX_CANDIDATES_PER_REQUEST,
    // Up to three Gemini requests side by side: 30 candidates in about the
    // time of one request, instead of one request per page step.
    parallelRequests: AUTO_PARALLEL_REQUESTS,
    compareBatch,
    saveMatch: saver.saveMatch,
    recordCheck: saver.recordCheck,
  });

  const totalMs = elapsedSince(runStartedAt) + loadMs;
  logRunSummary({
    source: "auto",
    totalMs,
    loadMs,
    geminiMs,
    saveMs: saver.timing.saveMs,
    requests,
    summary,
  });
  await recordMatchingRun(
    supabase,
    toRunRow("auto", summary, { durationMs: totalMs, requests, model: getGeminiModel() }),
  );
  return summary;
}
