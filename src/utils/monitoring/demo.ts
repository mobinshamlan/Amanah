import {
  buildMonitoringSnapshot,
  type ClaimSummaryInput,
  type MatchingRun,
  type MonitoringInput,
  type MonitoringSnapshot,
} from "@/utils/monitoring/snapshot";

// Development-only synthetic Monitoring data. Deterministic for a given `now`.
// Builds the same MonitoringInput shape the live loader uses, then runs it
// through buildMonitoringSnapshot. Never reads or writes Supabase, never calls
// Gemini, and never puts report names, descriptions, locations, or IDs into
// the snapshot that the screen shows.
//
// The story (for the fixture author only): a small school lost-and-found over
// two weeks — water bottle, backpack, notebook, keys, scarf, earbuds, and a
// few other everyday items. Those names stay in this comment; the data below
// is aggregate-safe IDs and counts.

export const DEMO_MODEL = "gemini-demo";

/** How many decided claims the default fixture includes. Raise or lower to toggle the small-sample warning on the overall rate (needs fewer than MIN_RELIABLE_REVIEWS). */
export const DEMO_DECIDED_CLAIMS = 25;

type DemoEnv = {
  NODE_ENV?: string;
  AMANAH_MONITORING_DEMO?: string;
};

/**
 * Demo mode is development-only. Enable with ?demo=1 on the monitoring URL, or
 * set AMANAH_MONITORING_DEMO=1 in .env.local. Turn off with ?demo=0 (overrides
 * the env flag) or by clearing the env and omitting the query.
 */
export function isMonitoringDemoEnabled(
  demoParam?: string | string[] | null,
  env: DemoEnv = process.env,
) {
  if (env.NODE_ENV !== "development") {
    return false;
  }
  const raw = Array.isArray(demoParam) ? demoParam[0] : demoParam;
  if (raw === "0" || raw === "false") {
    return false;
  }
  if (raw === "1" || raw === "true") {
    return true;
  }
  return env.AMANAH_MONITORING_DEMO === "1";
}

function at(now: Date, daysAgo: number, hour = 12, minute = 0) {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysAgo,
    hour,
    minute,
  ).toISOString();
}

function reportId(kind: "lost" | "found", n: number) {
  // Prefixed so a real UUID can never collide if someone mis-wires the fixture.
  return `demo-${kind}-${String(n).padStart(2, "0")}`;
}

function run(
  now: Date,
  daysAgo: number,
  hour: number,
  overrides: Partial<MatchingRun>,
): MatchingRun {
  return {
    finishedAt: at(now, daysAgo, hour),
    source: "auto",
    durationMs: 8200,
    requests: 4,
    checked: 4,
    matched: 0,
    uncertain: 1,
    noMatch: 3,
    failed: 0,
    alreadySaved: 0,
    remaining: 6,
    failure: null,
    stoppedForTime: false,
    model: DEMO_MODEL,
    ...overrides,
  };
}

/**
 * Everyday school lost-and-found activity for the last 14 days, built as
 * MonitoringInput and then snapshotted. Report IDs exist only so pairs can be
 * counted; the snapshot strips them.
 */
export function buildDemoMonitoringInput(now: Date): MonitoringInput {
  // Lost reports across quiet and busy days (comments name the fictional items).
  const reports: MonitoringInput["reports"] = [
    { id: reportId("lost", 1), report_type: "lost", created_at: at(now, 12, 9) }, // water bottle
    { id: reportId("lost", 2), report_type: "lost", created_at: at(now, 10, 14) }, // backpack
    { id: reportId("lost", 3), report_type: "lost", created_at: at(now, 8, 11) }, // notebook
    { id: reportId("lost", 4), report_type: "lost", created_at: at(now, 5, 10) }, // keys
    { id: reportId("lost", 5), report_type: "lost", created_at: at(now, 5, 16) }, // scarf
    { id: reportId("lost", 6), report_type: "lost", created_at: at(now, 2, 9) }, // earbuds
    { id: reportId("lost", 7), report_type: "lost", created_at: at(now, 2, 15) }, // lunchbox
    { id: reportId("lost", 8), report_type: "lost", created_at: at(now, 0, 10) }, // hoodie
    { id: reportId("found", 1), report_type: "found", created_at: at(now, 12, 11) },
    { id: reportId("found", 2), report_type: "found", created_at: at(now, 10, 16) },
    { id: reportId("found", 3), report_type: "found", created_at: at(now, 8, 13) },
    { id: reportId("found", 4), report_type: "found", created_at: at(now, 7, 9) },
    { id: reportId("found", 5), report_type: "found", created_at: at(now, 5, 11) },
    { id: reportId("found", 6), report_type: "found", created_at: at(now, 5, 17) },
    { id: reportId("found", 7), report_type: "found", created_at: at(now, 3, 12) },
    { id: reportId("found", 8), report_type: "found", created_at: at(now, 2, 10) },
    { id: reportId("found", 9), report_type: "found", created_at: at(now, 2, 14) },
    { id: reportId("found", 10), report_type: "found", created_at: at(now, 0, 11) },
  ];

  const L = (n: number) => reportId("lost", n);
  const F = (n: number) => reportId("found", n);

  // Completed comparisons: mix of possible match, not enough information, no match.
  const pairChecks: MonitoringInput["pairChecks"] = [
    { lost_report_id: L(1), found_report_id: F(1), ai_decision: "match", checked_at: at(now, 11, 10) },
    { lost_report_id: L(1), found_report_id: F(2), ai_decision: "no_match", checked_at: at(now, 11, 10) },
    { lost_report_id: L(2), found_report_id: F(2), ai_decision: "match", checked_at: at(now, 9, 15) },
    { lost_report_id: L(2), found_report_id: F(3), ai_decision: "insufficient_information", checked_at: at(now, 9, 15) },
    { lost_report_id: L(2), found_report_id: F(4), ai_decision: "no_match", checked_at: at(now, 9, 16) },
    { lost_report_id: L(3), found_report_id: F(3), ai_decision: "match", checked_at: at(now, 7, 12) },
    { lost_report_id: L(3), found_report_id: F(5), ai_decision: "no_match", checked_at: at(now, 7, 12) },
    { lost_report_id: L(4), found_report_id: F(5), ai_decision: "match", checked_at: at(now, 4, 11) },
    { lost_report_id: L(4), found_report_id: F(6), ai_decision: "insufficient_information", checked_at: at(now, 4, 11) },
    { lost_report_id: L(5), found_report_id: F(6), ai_decision: "match", checked_at: at(now, 4, 17) },
    { lost_report_id: L(5), found_report_id: F(7), ai_decision: "no_match", checked_at: at(now, 4, 17) },
    { lost_report_id: L(6), found_report_id: F(8), ai_decision: "match", checked_at: at(now, 1, 10) },
    { lost_report_id: L(6), found_report_id: F(9), ai_decision: "no_match", checked_at: at(now, 1, 10) },
    { lost_report_id: L(7), found_report_id: F(8), ai_decision: "insufficient_information", checked_at: at(now, 1, 16) },
    { lost_report_id: L(7), found_report_id: F(9), ai_decision: "no_match", checked_at: at(now, 1, 16) },
    { lost_report_id: L(7), found_report_id: F(7), ai_decision: "no_match", checked_at: at(now, 1, 16) },
    { lost_report_id: L(8), found_report_id: F(10), ai_decision: "match", checked_at: at(now, 0, 12) },
    { lost_report_id: L(8), found_report_id: F(9), ai_decision: "no_match", checked_at: at(now, 0, 12) },
    { lost_report_id: L(3), found_report_id: F(4), ai_decision: "no_match", checked_at: at(now, 6, 9) },
    { lost_report_id: L(1), found_report_id: F(3), ai_decision: "insufficient_information", checked_at: at(now, 10, 11) },
  ];

  const suggestions: MonitoringInput["suggestions"] = pairChecks
    .filter((row) => row.ai_decision === "match" || row.ai_decision === "insufficient_information")
    .map((row) => ({
      lost_report_id: row.lost_report_id,
      found_report_id: row.found_report_id,
      ai_decision: row.ai_decision,
    }));

  // Newest first. Mostly completed; one rate-limit failure; one early stop.
  const runs: MatchingRun[] = [
    run(now, 0, 13, {
      source: "admin",
      durationMs: 18400,
      requests: 4,
      checked: 4,
      matched: 1,
      uncertain: 0,
      noMatch: 3,
      remaining: 12,
    }),
    run(now, 0, 10, {
      source: "auto",
      durationMs: 6100,
      requests: 2,
      checked: 2,
      matched: 1,
      uncertain: 0,
      noMatch: 1,
      remaining: 8,
    }),
    run(now, 1, 16, {
      source: "auto",
      durationMs: 22100,
      requests: 4,
      checked: 3,
      matched: 0,
      uncertain: 1,
      noMatch: 2,
      failed: 1,
      remaining: 14,
      failure: "quota", // rate limit mid-run
    }),
    run(now, 2, 11, {
      source: "admin",
      durationMs: 30100,
      requests: 3,
      checked: 3,
      matched: 1,
      uncertain: 1,
      noMatch: 1,
      remaining: 18,
      stoppedForTime: true,
    }),
    run(now, 3, 14, {
      source: "auto",
      durationMs: 9400,
      requests: 4,
      checked: 4,
      matched: 0,
      uncertain: 1,
      noMatch: 3,
      remaining: 10,
    }),
    run(now, 5, 12, {
      source: "admin",
      durationMs: 15600,
      requests: 4,
      checked: 4,
      matched: 2,
      uncertain: 0,
      noMatch: 2,
      remaining: 8,
    }),
    run(now, 5, 9, {
      source: "auto",
      durationMs: 7200,
      requests: 3,
      checked: 3,
      matched: 1,
      uncertain: 1,
      noMatch: 1,
      remaining: 5,
    }),
    run(now, 7, 15, {
      source: "auto",
      durationMs: 11200,
      requests: 4,
      checked: 4,
      matched: 1,
      uncertain: 0,
      noMatch: 3,
      remaining: 6,
    }),
    run(now, 9, 10, {
      source: "admin",
      durationMs: 19800,
      requests: 4,
      checked: 4,
      matched: 1,
      uncertain: 1,
      noMatch: 2,
      remaining: 4,
    }),
    run(now, 11, 11, {
      source: "auto",
      durationMs: 5400,
      requests: 2,
      checked: 2,
      matched: 1,
      uncertain: 0,
      noMatch: 1,
      remaining: 2,
    }),
  ];

  const claims = buildDemoClaims();

  return {
    now,
    geminiConfigured: true,
    model: DEMO_MODEL,
    reports,
    pairChecks,
    suggestions,
    history: {
      runs,
      total: runs.length,
      firstAt: runs[runs.length - 1].finishedAt,
    },
    claims,
  };
}

/**
 * Decided claims across the three similarity bands, plus a few pending.
 * Higher scores lean approved, with deliberate exceptions. Change
 * DEMO_DECIDED_CLAIMS or this list to turn the overall small-sample flag on
 * or off (threshold: MIN_RELIABLE_REVIEWS in snapshot.ts).
 */
function buildDemoClaims(): ClaimSummaryInput[] {
  // 85–100: mostly approved; two staff rejections as exceptions (11 decided).
  const high: ClaimSummaryInput[] = [
    ...Array.from({ length: 7 }, () => decided("approved", 92)),
    decided("approved", 88),
    decided("approved", 97),
    decided("rejected", 86), // high score, staff still rejected
    decided("rejected", 91),
  ];
  // 70–84: mixed; one soft rejection at the top of the band (8 decided).
  const mid: ClaimSummaryInput[] = [
    decided("approved", 82),
    decided("approved", 78),
    decided("approved", 74),
    decided("approved", 80),
    decided("approved", 70),
    decided("rejected", 76),
    decided("rejected", 72),
    decided("rejected", 84), // edge of band, rejected
  ];
  // Below 70: mostly rejected; two unexpected approvals (6 decided).
  const low: ClaimSummaryInput[] = [
    decided("rejected", 55),
    decided("rejected", 42),
    decided("rejected", 61),
    decided("rejected", 38),
    decided("approved", 64), // exception: staff approved a lower score
    decided("approved", 48),
  ];
  // Pending (including one awaiting answers and one assessment retry shape).
  const pending: ClaimSummaryInput[] = [
    { questionCount: 2, answerCount: 2, assessed: true, decision: null, similarityScore: 90 },
    { questionCount: 2, answerCount: 1, assessed: false, decision: null, similarityScore: 77 },
    { questionCount: 2, answerCount: 2, assessed: false, decision: null, similarityScore: 83 }, // assessment retry
    { questionCount: 0, answerCount: 0, assessed: false, decision: null, similarityScore: 71 },
    { questionCount: 2, answerCount: 0, assessed: false, decision: null, similarityScore: 58 },
  ];

  const decidedClaims = [...high, ...mid, ...low];
  if (decidedClaims.length !== DEMO_DECIDED_CLAIMS) {
    throw new Error(
      `Demo fixture expected ${DEMO_DECIDED_CLAIMS} decided claims, got ${decidedClaims.length}`,
    );
  }
  return [...decidedClaims, ...pending];
}

function decided(
  decision: "approved" | "rejected",
  similarityScore: number,
): ClaimSummaryInput {
  return {
    questionCount: 2,
    answerCount: 2,
    assessed: true,
    decision,
    similarityScore,
  };
}

/** Full demo snapshot for the Monitoring panel. No I/O. */
export function buildDemoMonitoringSnapshot(now = new Date()): MonitoringSnapshot {
  return buildMonitoringSnapshot(buildDemoMonitoringInput(now));
}
