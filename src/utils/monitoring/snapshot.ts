import { pairKey } from "@/utils/matching/runMatchingBatch";
import type { RunFailure, RunSource } from "@/utils/monitoring/runLog";

// Aggregate monitoring for the local admin. Inputs may contain report IDs so
// pairs can be counted, but the snapshot itself holds counts, times, and
// failure kinds only.

// Charts and check statistics cover the last 14 days, including today.
export const TREND_DAYS = 14;
// Fewer active days than this is described as "not a trend yet".
export const MIN_TREND_DAYS = 3;
// The table shows this many of the newest recorded checks.
export const RECENT_CHECKS_SHOWN = 10;

export type MatchingRun = {
  finishedAt: string;
  source: RunSource;
  durationMs: number;
  requests: number;
  checked: number;
  matched: number;
  uncertain: number;
  noMatch: number;
  failed: number;
  alreadySaved: number;
  remaining: number | null;
  failure: RunFailure | null;
  stoppedForTime: boolean;
  model: string;
};

export type ClaimSummaryInput = {
  questionCount: number;
  answerCount: number;
  assessed: boolean;
  // Current staff decision; null means pending review (including a reset).
  decision: "approved" | "rejected" | null;
  // AI similarity score (0-100) of the suggestion the claim was made for;
  // null or missing when that suggestion was never scored.
  similarityScore?: number | null;
};

// Bands group similarity scores. They are not calibrated confidence levels.
export const SCORE_BANDS = [
  { key: "85-100", label: "85–100", min: 85 },
  { key: "70-84", label: "70–84", min: 70 },
  { key: "below-70", label: "Below 70", min: -Infinity },
] as const;
export type ScoreBandKey = (typeof SCORE_BANDS)[number]["key"];

// A band or total with fewer decisions than this is flagged as a small sample.
export const MIN_RELIABLE_REVIEWS = 10;

export type ReviewRate = {
  approved: number;
  rejected: number;
  reviewed: number;
  // Whole percent approved; null when nothing has been decided.
  rate: number | null;
  smallSample: boolean;
};

export type MatchReview = ReviewRate & {
  bands: (ReviewRate & { key: ScoreBandKey; label: string })[];
  // Reviewed claims whose suggestion has no score; in the total, not in a band.
  unscored: number;
};

function reviewRate(approved: number, rejected: number): ReviewRate {
  const reviewed = approved + rejected;
  return {
    approved,
    rejected,
    reviewed,
    rate: reviewed > 0 ? Math.round((approved / reviewed) * 100) : null,
    smallSample: reviewed < MIN_RELIABLE_REVIEWS,
  };
}

/**
 * Staff approval rate of AI-suggested matches, overall and by similarity band.
 * Only claims with a current approved or rejected decision count; pending
 * claims and claims reset to pending are excluded. Unscored claims count in
 * the total but not in any band. A staff-decision signal, not ground truth.
 */
export function summarizeMatchReview(claims: ClaimSummaryInput[]): MatchReview {
  const decided = claims.filter((claim) => claim.decision !== null);
  const count = (items: ClaimSummaryInput[]) =>
    reviewRate(
      items.filter((claim) => claim.decision === "approved").length,
      items.filter((claim) => claim.decision === "rejected").length,
    );
  const scored = decided.filter(
    (claim): claim is ClaimSummaryInput & { similarityScore: number } =>
      typeof claim.similarityScore === "number" && Number.isFinite(claim.similarityScore),
  );
  const bands = SCORE_BANDS.map((band, index) => {
    const above = index === 0 ? Infinity : SCORE_BANDS[index - 1].min;
    return {
      key: band.key,
      label: band.label,
      ...count(scored.filter((claim) => claim.similarityScore >= band.min && claim.similarityScore < above)),
    };
  });
  return { ...count(decided), bands, unscored: decided.length - scored.length };
}

export type RunHistoryInput = {
  // Newest first; at most the latest few hundred.
  runs: MatchingRun[];
  // All recorded checks, ever.
  total: number;
  // When the oldest recorded check finished.
  firstAt: string | null;
};

export type MonitoringInput = {
  now: Date;
  geminiConfigured: boolean;
  model: string;
  reports: { id: string; report_type: string; created_at: string }[];
  pairChecks: {
    lost_report_id: string;
    found_report_id: string;
    ai_decision: string;
    checked_at: string;
  }[];
  suggestions: { lost_report_id: string; found_report_id: string; ai_decision: string }[];
  // null: the run history table is not available.
  history: RunHistoryInput | null;
  // null: ownership data is not available.
  claims: ClaimSummaryInput[] | null;
};

export type MatchingHealth =
  | "not_configured"
  | "history_unavailable"
  // No lost/found pair exists to compare.
  | "nothing_to_check"
  // No comparison and no recorded check, ever.
  | "never_run"
  // Comparisons exist from before run history began; no check recorded since.
  | "no_recorded_checks"
  | "last_run_failed"
  | "last_run_partial"
  | "working";

export type DailyPoint<K extends string> = {
  key: string;
  // e.g. "24 Oct" (server locale) and the day of the month for axis ticks.
  label: string;
  short: string;
  values: Record<K, number>;
  total: number;
};

export type DailySeries<K extends string> = {
  points: DailyPoint<K>[];
  total: number;
  activeDays: number;
};

export type ReportSeriesKey = "lost" | "found";
export type ComparisonSeriesKey = "match" | "insufficient_information" | "no_match";

export type MonitoringSnapshot = {
  health: MatchingHealth;
  geminiConfigured: boolean;
  model: string;
  pairs: {
    total: number;
    // Pairs with a completed comparison or a saved suggestion.
    checked: number;
    // Never compared, or compared and failed: not "no match".
    unchecked: number;
    possible: number;
    uncertain: number;
    noMatch: number;
  };
  // Newest completed comparison stored per pair (exists before run history).
  lastComparisonAt: string | null;
  history: {
    available: boolean;
    total: number;
    firstAt: string | null;
  };
  lastRun: MatchingRun | null;
  lastSuccessfulRunAt: string | null;
  recentRuns: MatchingRun[];
  // Recorded checks in the trend window; null when history is unavailable.
  window: {
    checks: number;
    completed: number;
    failed: number;
    stoppedEarly: number;
    failureKinds: Partial<Record<RunFailure, number>>;
    // True when more checks exist in the window than were loaded.
    truncated: boolean;
  } | null;
  reportsDaily: DailySeries<ReportSeriesKey>;
  comparisonsDaily: DailySeries<ComparisonSeriesKey>;
  claims: {
    total: number;
    awaitingDecision: number;
    assessmentRetry: number;
    awaitingAnswers: number;
    noQuestions: number;
    approved: number;
    rejected: number;
  } | null;
  // Staff-reviewed match rate; null when ownership data is not available.
  matchReview: MatchReview | null;
};

function newest(times: string[]) {
  return times.reduce<string | null>(
    (latest, time) => (!latest || Date.parse(time) > Date.parse(latest) ? time : latest),
    null,
  );
}

/** Local calendar day, e.g. "2026-10-24". */
export function localDayKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function windowStart(now: Date, days: number) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
}

/** Daily counts per category for the last `days` days, oldest first, zero-filled. */
export function dailySeries<K extends string>(
  rows: { at: string; category: string }[],
  categories: readonly K[],
  now: Date,
  days = TREND_DAYS,
): DailySeries<K> {
  const start = windowStart(now, days);
  const points: DailyPoint<K>[] = Array.from({ length: days }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return {
      key: localDayKey(date),
      label: date.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      short: String(date.getDate()),
      values: Object.fromEntries(categories.map((category) => [category, 0])) as Record<K, number>,
      total: 0,
    };
  });
  const byKey = new Map(points.map((point) => [point.key, point]));
  for (const row of rows) {
    const point = byKey.get(localDayKey(new Date(row.at)));
    if (point && (categories as readonly string[]).includes(row.category)) {
      point.values[row.category as K] += 1;
      point.total += 1;
    }
  }
  return {
    points,
    total: points.reduce((sum, point) => sum + point.total, 0),
    activeDays: points.filter((point) => point.total > 0).length,
  };
}

export function buildMonitoringSnapshot(input: MonitoringInput): MonitoringSnapshot {
  const lost = new Set(input.reports.filter((row) => row.report_type === "lost").map((row) => row.id));
  const found = new Set(input.reports.filter((row) => row.report_type === "found").map((row) => row.id));
  const current = (row: { lost_report_id: string; found_report_id: string }) =>
    lost.has(row.lost_report_id) && found.has(row.found_report_id);

  // Same rule as matching: a pair is checked when it has a completed comparison
  // or a saved suggestion. Failed comparisons are never recorded.
  const currentChecks = input.pairChecks.filter(current);
  const suggestions = input.suggestions.filter(current);
  const checkedKeys = new Set(
    [...currentChecks, ...suggestions].map((row) => pairKey(row.lost_report_id, row.found_report_id)),
  );
  const total = lost.size * found.size;

  const history = input.history;
  const runs = history
    ? [...history.runs].sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))
    : [];
  const lastRun = runs[0] ?? null;
  const lastComparisonAt = newest(currentChecks.map((row) => row.checked_at));

  let health: MatchingHealth;
  if (!input.geminiConfigured) {
    health = "not_configured";
  } else if (!history) {
    health = "history_unavailable";
  } else if (lastRun) {
    health = lastRun.failure ? "last_run_failed" : lastRun.stoppedForTime ? "last_run_partial" : "working";
  } else if (checkedKeys.size > 0 || input.pairChecks.length > 0) {
    health = "no_recorded_checks";
  } else if (total === 0) {
    health = "nothing_to_check";
  } else {
    health = "never_run";
  }

  const since = windowStart(input.now, TREND_DAYS).getTime();
  const windowRuns = runs.filter((run) => Date.parse(run.finishedAt) >= since);
  const failureKinds: Partial<Record<RunFailure, number>> = {};
  for (const run of windowRuns) {
    if (run.failure) {
      failureKinds[run.failure] = (failureKinds[run.failure] ?? 0) + 1;
    }
  }

  const claims = input.claims;

  return {
    health,
    geminiConfigured: input.geminiConfigured,
    model: input.model,
    pairs: {
      total,
      checked: checkedKeys.size,
      unchecked: Math.max(0, total - checkedKeys.size),
      possible: suggestions.filter((row) => row.ai_decision === "match").length,
      uncertain: suggestions.filter((row) => row.ai_decision === "insufficient_information").length,
      noMatch: currentChecks.filter((row) => row.ai_decision === "no_match").length,
    },
    lastComparisonAt,
    history: {
      available: Boolean(history),
      total: history?.total ?? 0,
      firstAt: history?.firstAt ?? null,
    },
    lastRun,
    lastSuccessfulRunAt: runs.find((run) => !run.failure)?.finishedAt ?? null,
    recentRuns: runs.slice(0, RECENT_CHECKS_SHOWN),
    window: history
      ? {
          checks: windowRuns.length,
          completed: windowRuns.filter((run) => !run.failure && !run.stoppedForTime).length,
          failed: windowRuns.filter((run) => run.failure).length,
          stoppedEarly: windowRuns.filter((run) => !run.failure && run.stoppedForTime).length,
          failureKinds,
          truncated: history.runs.length < history.total && windowRuns.length === runs.length,
        }
      : null,
    // Every report ever saved, by the day it was created.
    reportsDaily: dailySeries(
      input.reports.map((row) => ({ at: row.created_at, category: row.report_type })),
      ["lost", "found"] as const,
      input.now,
    ),
    // Completed comparisons stored per pair, including pairs whose reports
    // were later removed. Failed comparisons are not stored per pair.
    comparisonsDaily: dailySeries(
      input.pairChecks.map((row) => ({ at: row.checked_at, category: row.ai_decision })),
      ["match", "insufficient_information", "no_match"] as const,
      input.now,
    ),
    claims: claims
      ? {
          total: claims.length,
          awaitingDecision: claims.filter((claim) => !claim.decision).length,
          assessmentRetry: claims.filter(
            (claim) =>
              claim.questionCount > 0 && claim.answerCount >= claim.questionCount && !claim.assessed,
          ).length,
          awaitingAnswers: claims.filter(
            (claim) => !claim.decision && claim.answerCount < claim.questionCount,
          ).length,
          noQuestions: claims.filter((claim) => !claim.decision && claim.questionCount === 0).length,
          approved: claims.filter((claim) => claim.decision === "approved").length,
          rejected: claims.filter((claim) => claim.decision === "rejected").length,
        }
      : null,
    matchReview: claims ? summarizeMatchReview(claims) : null,
  };
}

type RunRow = {
  finished_at: string;
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

export const MATCHING_RUN_COLUMNS =
  "finished_at, source, duration_ms, requests, checked, matched, uncertain, no_match, failed, already_saved, remaining, failure, stopped_for_time, model";

export function toMatchingRun(row: RunRow): MatchingRun {
  return {
    finishedAt: row.finished_at,
    source: row.source,
    durationMs: row.duration_ms,
    requests: row.requests,
    checked: row.checked,
    matched: row.matched,
    uncertain: row.uncertain,
    noMatch: row.no_match,
    failed: row.failed,
    alreadySaved: row.already_saved,
    remaining: row.remaining,
    failure: row.failure,
    stoppedForTime: row.stopped_for_time,
    model: row.model,
  };
}
