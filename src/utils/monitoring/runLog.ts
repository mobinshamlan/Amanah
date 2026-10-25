import type {
  MatchingFailure,
  MatchingRunSummary,
} from "@/utils/matching/runMatchingBatch";

// Server-only. Records one aggregate row per matching run for the local admin
// monitoring view. Rows hold counts, timings, and failure kinds only: never
// report IDs, report text, credentials, or keys.

export type RunSource = "admin" | "auto";
// "load": the run could not load its data, so nothing was compared.
export type RunFailure = MatchingFailure | "load";

export type MatchingRunRow = {
  source: RunSource;
  duration_ms: number;
  requests: number;
  checked: number;
  matched: number;
  uncertain: number;
  no_match: number;
  failed: number;
  already_saved: number;
  remaining: number | null;
  failure: RunFailure | null;
  stopped_for_time: boolean;
  model: string;
};

type Insertable = {
  from(table: "matching_runs"): {
    insert(row: MatchingRunRow): PromiseLike<{ error: { code?: string } | null }>;
  };
};

type Logger = Pick<Console, "error">;

// The matching_runs table does not exist until its migration is applied.
export function isMissingTableCode(code: string | undefined) {
  return code === "PGRST205" || code === "42P01";
}

function count(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

/** Builds the stored row from a run summary. Only these fields are ever stored. */
export function toRunRow(
  source: RunSource,
  summary: MatchingRunSummary,
  { durationMs, requests, model }: { durationMs: number; requests: number; model: string },
): MatchingRunRow {
  return {
    source,
    duration_ms: count(durationMs),
    requests: count(requests),
    checked: count(summary.checked),
    matched: count(summary.matched),
    uncertain: count(summary.uncertain),
    no_match: count(summary.noMatch),
    failed: count(summary.failed),
    already_saved: count(summary.alreadySaved),
    remaining: count(summary.remaining),
    failure: summary.failure,
    stopped_for_time: summary.stoppedForTime,
    model: model.slice(0, 100),
  };
}

/** A run that stopped before comparing anything because its data did not load. */
export function loadFailureRow(
  source: RunSource,
  { durationMs, model }: { durationMs: number; model: string },
): MatchingRunRow {
  return {
    source,
    duration_ms: count(durationMs),
    requests: 0,
    checked: 0,
    matched: 0,
    uncertain: 0,
    no_match: 0,
    failed: 0,
    already_saved: 0,
    remaining: null,
    failure: "load",
    stopped_for_time: false,
    model: model.slice(0, 100),
  };
}

/**
 * Saves the row. Monitoring must never break matching, so errors are logged by
 * code only. A missing table (migration not applied yet) is expected and not
 * logged; the monitoring view says history is not set up.
 */
export async function recordMatchingRun(
  supabase: Insertable,
  row: MatchingRunRow,
  logger: Logger = console,
): Promise<boolean> {
  try {
    const { error } = await supabase.from("matching_runs").insert(row);
    if (error) {
      if (!isMissingTableCode(error.code)) {
        logger.error("Monitoring: failed to record matching run:", error.code ?? "unknown");
      }
      return false;
    }
    return true;
  } catch {
    logger.error("Monitoring: failed to record matching run:", "exception");
    return false;
  }
}
