import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMonitoringSnapshot,
  dailySeries,
  localDayKey,
  RECENT_CHECKS_SHOWN,
  summarizeMatchReview,
  type ClaimSummaryInput,
  TREND_DAYS,
  toMatchingRun,
  type MatchingRun,
  type MonitoringInput,
} from "@/utils/monitoring/snapshot";

// Fictional IDs only. No database or Gemini calls. Times are built from local
// dates so day grouping does not depend on the machine's time zone.

const NOW = new Date(2026, 9, 24, 15, 0); // 24 Oct 2026, 15:00 local
const at = (daysAgo: number, hour = 12) =>
  new Date(2026, 9, 24 - daysAgo, hour, 0).toISOString();

function run(overrides: Partial<MatchingRun> = {}): MatchingRun {
  return {
    finishedAt: at(0, 10),
    source: "admin",
    durationMs: 4200,
    requests: 4,
    checked: 4,
    matched: 1,
    uncertain: 1,
    noMatch: 2,
    failed: 0,
    alreadySaved: 0,
    remaining: 2,
    failure: null,
    stoppedForTime: false,
    model: "gemini-test",
    ...overrides,
  };
}

function input(overrides: Partial<MonitoringInput> = {}): MonitoringInput {
  return {
    now: NOW,
    geminiConfigured: true,
    model: "gemini-test",
    // 2 lost × 3 found = 6 pairs.
    reports: [
      { id: "L1", report_type: "lost", created_at: at(1) },
      { id: "L2", report_type: "lost", created_at: at(0) },
      { id: "F1", report_type: "found", created_at: at(1) },
      { id: "F2", report_type: "found", created_at: at(1) },
      { id: "F3", report_type: "found", created_at: at(20) },
    ],
    pairChecks: [
      { lost_report_id: "L1", found_report_id: "F1", ai_decision: "match", checked_at: at(1, 9) },
      { lost_report_id: "L1", found_report_id: "F2", ai_decision: "no_match", checked_at: at(0, 9) },
      { lost_report_id: "L2", found_report_id: "F1", ai_decision: "insufficient_information", checked_at: at(0, 8) },
    ],
    suggestions: [
      { lost_report_id: "L1", found_report_id: "F1", ai_decision: "match" },
      { lost_report_id: "L2", found_report_id: "F1", ai_decision: "insufficient_information" },
      // Saved before pair tracking existed: counts as checked without a check row.
      { lost_report_id: "L2", found_report_id: "F3", ai_decision: "match" },
    ],
    history: { runs: [run()], total: 1, firstAt: at(0, 10) },
    claims: [],
    ...overrides,
  };
}

describe("pair coverage", () => {
  it("counts checked pairs from completed comparisons and saved suggestions", () => {
    const { pairs, lastComparisonAt } = buildMonitoringSnapshot(input());
    assert.deepEqual(pairs, {
      total: 6,
      checked: 4,
      unchecked: 2,
      possible: 2,
      uncertain: 1,
      noMatch: 1,
    });
    assert.equal(lastComparisonAt, at(0, 9));
  });

  it("never counts an unchecked or failed pair as no match", () => {
    // A failed comparison leaves no check row, so the pair stays unchecked.
    const snapshot = buildMonitoringSnapshot(
      input({
        pairChecks: [],
        suggestions: [],
        history: { runs: [run({ failure: "timeout", checked: 0, noMatch: 0, failed: 1 })], total: 1, firstAt: at(0) },
      }),
    );
    assert.equal(snapshot.pairs.noMatch, 0);
    assert.equal(snapshot.pairs.unchecked, 6);
    assert.equal(snapshot.comparisonsDaily.total, 0);
  });

  it("ignores pair rows for reports that no longer exist", () => {
    const snapshot = buildMonitoringSnapshot(
      input({
        pairChecks: [{ lost_report_id: "L9", found_report_id: "F1", ai_decision: "no_match", checked_at: at(0) }],
        suggestions: [{ lost_report_id: "L1", found_report_id: "F9", ai_decision: "match" }],
      }),
    );
    assert.equal(snapshot.pairs.checked, 0);
    assert.equal(snapshot.pairs.noMatch, 0);
    assert.equal(snapshot.lastComparisonAt, null);
  });
});

describe("matching health", () => {
  const empty = { runs: [], total: 0, firstAt: null };
  const cases: [string, Partial<MonitoringInput>, string][] = [
    ["missing key", { geminiConfigured: false }, "not_configured"],
    ["history table unreadable", { history: null }, "history_unavailable"],
    ["last run failed", { history: { runs: [run({ failure: "quota" })], total: 1, firstAt: at(0) } }, "last_run_failed"],
    ["last run stopped early", { history: { runs: [run({ stoppedForTime: true })], total: 1, firstAt: at(0) } }, "last_run_partial"],
    ["last run completed", {}, "working"],
    // The mismatch case: comparisons exist from before run history began.
    ["comparisons but no recorded checks", { history: empty }, "no_recorded_checks"],
    ["nothing has ever run", { history: empty, pairChecks: [], suggestions: [] }, "never_run"],
    [
      "no pairs to compare",
      { history: empty, pairChecks: [], suggestions: [], reports: [{ id: "L1", report_type: "lost", created_at: at(0) }] },
      "nothing_to_check",
    ],
  ];
  for (const [name, overrides, expected] of cases) {
    it(name, () => {
      assert.equal(buildMonitoringSnapshot(input(overrides)).health, expected);
    });
  }

  it("judges by the newest run and remembers the last success", () => {
    const snapshot = buildMonitoringSnapshot(
      input({
        history: {
          runs: [run({ finishedAt: at(1) }), run({ finishedAt: at(0, 11), failure: "api", source: "auto" })],
          total: 2,
          firstAt: at(1),
        },
      }),
    );
    assert.equal(snapshot.health, "last_run_failed");
    assert.equal(snapshot.lastRun?.finishedAt, at(0, 11));
    assert.equal(snapshot.lastSuccessfulRunAt, at(1));
    assert.deepEqual(snapshot.history, { available: true, total: 2, firstAt: at(1) });
  });
});

describe("check statistics", () => {
  it("summarises recorded checks in the last 14 days only", () => {
    const snapshot = buildMonitoringSnapshot(
      input({
        history: {
          runs: [
            run({ finishedAt: at(0) }),
            run({ finishedAt: at(2), failure: "quota" }),
            run({ finishedAt: at(3), failure: "quota" }),
            run({ finishedAt: at(5), stoppedForTime: true }),
            run({ finishedAt: at(TREND_DAYS + 2), failure: "timeout" }),
          ],
          total: 5,
          firstAt: at(TREND_DAYS + 2),
        },
      }),
    );
    assert.deepEqual(snapshot.window, {
      checks: 4,
      completed: 1,
      failed: 2,
      stoppedEarly: 1,
      failureKinds: { quota: 2 },
      truncated: false,
    });
  });

  it("flags when more checks exist than were loaded", () => {
    const runs = Array.from({ length: 3 }, (_, index) => run({ finishedAt: at(0, 10 - index) }));
    const snapshot = buildMonitoringSnapshot(input({ history: { runs, total: 500, firstAt: at(30) } }));
    assert.equal(snapshot.window?.truncated, true);
  });

  it("shows at most the newest checks in the table", () => {
    const runs = Array.from({ length: 15 }, (_, index) => run({ finishedAt: at(0, 23 - index) }));
    const snapshot = buildMonitoringSnapshot(input({ history: { runs, total: 15, firstAt: at(0, 9) } }));
    assert.equal(snapshot.recentRuns.length, RECENT_CHECKS_SHOWN);
    assert.equal(snapshot.recentRuns[0].finishedAt, at(0, 23));
  });

  it("has no window when history is unavailable", () => {
    assert.equal(buildMonitoringSnapshot(input({ history: null })).window, null);
  });
});

describe("daily series", () => {
  it("zero-fills the last 14 days, oldest first", () => {
    const series = dailySeries(
      [
        { at: at(0), category: "lost" },
        { at: at(0, 8), category: "found" },
        { at: at(13), category: "lost" },
        { at: at(14), category: "lost" }, // outside the window
        { at: at(2), category: "other" }, // unknown category
      ],
      ["lost", "found"] as const,
      NOW,
    );
    assert.equal(series.points.length, TREND_DAYS);
    assert.equal(series.points[0].key, localDayKey(new Date(2026, 9, 11)));
    assert.equal(series.points[13].key, localDayKey(NOW));
    assert.deepEqual(series.points[13].values, { lost: 1, found: 1 });
    assert.equal(series.points[0].total, 1);
    assert.equal(series.total, 3);
    assert.equal(series.activeDays, 2);
  });

  it("counts reports and comparisons by day from stored timestamps", () => {
    const snapshot = buildMonitoringSnapshot(input());
    // F3 was saved 20 days ago, outside the window.
    assert.equal(snapshot.reportsDaily.total, 4);
    assert.deepEqual(snapshot.reportsDaily.points[12].values, { lost: 1, found: 2 });
    assert.deepEqual(snapshot.comparisonsDaily.points[13].values, {
      match: 0,
      insufficient_information: 1,
      no_match: 1,
    });
  });
});

describe("claims", () => {
  it("counts claims by what staff need to do, and decisions as plain counts", () => {
    const snapshot = buildMonitoringSnapshot(
      input({
        claims: [
          { questionCount: 2, answerCount: 2, assessed: false, decision: null },
          { questionCount: 2, answerCount: 1, assessed: false, decision: null },
          { questionCount: 0, answerCount: 0, assessed: false, decision: null },
          { questionCount: 2, answerCount: 2, assessed: true, decision: "approved" },
          { questionCount: 2, answerCount: 2, assessed: true, decision: "rejected" },
        ],
      }),
    );
    assert.deepEqual(snapshot.claims, {
      total: 5,
      awaitingDecision: 3,
      assessmentRetry: 1,
      awaitingAnswers: 1,
      noQuestions: 1,
      approved: 1,
      rejected: 1,
    });
  });

  it("reports unavailable ownership data as null, not zero", () => {
    assert.equal(buildMonitoringSnapshot(input({ claims: null })).claims, null);
  });
});

describe("privacy", () => {
  it("keeps report IDs out of the snapshot", () => {
    const text = JSON.stringify(buildMonitoringSnapshot(input()));
    for (const id of ["L1", "L2", "F1", "F2", "F3"]) {
      assert.ok(!text.includes(`"${id}"`), `snapshot leaked ${id}`);
    }
  });

  it("maps stored run rows field by field", () => {
    assert.deepEqual(
      toMatchingRun({
        finished_at: at(0, 10),
        source: "auto",
        duration_ms: 900,
        requests: 1,
        checked: 3,
        matched: 0,
        uncertain: 1,
        no_match: 2,
        failed: 0,
        already_saved: 0,
        remaining: 0,
        failure: null,
        stopped_for_time: false,
        model: "gemini-test",
      }),
      run({ source: "auto", durationMs: 900, requests: 1, checked: 3, matched: 0, uncertain: 1, noMatch: 2, remaining: 0 }),
    );
  });
});

describe("staff-reviewed match rate", () => {
  const claim = (
    decision: ClaimSummaryInput["decision"],
    similarityScore?: number | null,
  ): ClaimSummaryInput => ({ questionCount: 1, answerCount: 1, assessed: true, decision, similarityScore });

  it("shows no rate, not 0%, when nothing is decided", () => {
    const review = summarizeMatchReview([claim(null, 90), claim(null, 50)]);
    assert.equal(review.rate, null);
    assert.equal(review.reviewed, 0);
    assert.ok(review.bands.every((band) => band.rate === null && band.reviewed === 0));
    assert.equal(summarizeMatchReview([]).rate, null);
  });

  it("is approved over approved plus rejected, as a rounded percent", () => {
    const review = summarizeMatchReview([
      claim("approved", 90),
      claim("approved", 90),
      claim("rejected", 90),
    ]);
    assert.equal(review.approved, 2);
    assert.equal(review.rejected, 1);
    assert.equal(review.reviewed, 3);
    assert.equal(review.rate, 67);
    assert.equal(summarizeMatchReview([claim("rejected", 80)]).rate, 0);
    assert.equal(summarizeMatchReview([claim("approved", 80)]).rate, 100);
  });

  it("leaves out pending claims, including ones reset to pending", () => {
    // A reset claim arrives with decision null, the same as a never-decided one.
    const review = summarizeMatchReview([claim("approved", 90), claim(null, 90), claim(null, 40)]);
    assert.equal(review.reviewed, 1);
    assert.equal(review.rate, 100);
  });

  it("groups by score at the band edges", () => {
    const review = summarizeMatchReview([
      claim("approved", 100),
      claim("rejected", 85),
      claim("approved", 84),
      claim("approved", 70),
      claim("rejected", 69),
      claim("rejected", 0),
    ]);
    const [high, mid, low] = review.bands;
    assert.deepEqual([high.key, high.approved, high.rejected, high.rate], ["85-100", 1, 1, 50]);
    assert.deepEqual([mid.key, mid.approved, mid.rejected, mid.rate], ["70-84", 2, 0, 100]);
    assert.deepEqual([low.key, low.approved, low.rejected, low.rate], ["below-70", 0, 2, 0]);
  });

  it("counts unscored decisions in the total but in no band", () => {
    const review = summarizeMatchReview([
      claim("approved", null),
      claim("rejected"),
      claim("approved", 90),
    ]);
    assert.equal(review.reviewed, 3);
    assert.equal(review.unscored, 2);
    assert.equal(review.bands.reduce((sum, band) => sum + band.reviewed, 0), 1);
    assert.equal(review.bands[0].reviewed, 1);
  });

  it("flags small samples and marks empty bands with no data", () => {
    const small = summarizeMatchReview([claim("approved", 90)]);
    assert.equal(small.smallSample, true);
    assert.equal(small.bands[1].rate, null);
    assert.equal(small.bands[1].reviewed, 0);
    const many = summarizeMatchReview(Array.from({ length: 10 }, () => claim("approved", 90)));
    assert.equal(many.smallSample, false);
    assert.equal(many.bands[0].smallSample, false);
  });

  it("is on the snapshot, and null when ownership data is unavailable", () => {
    const withClaims = buildMonitoringSnapshot(input({ claims: [claim("approved", 90)] }));
    assert.equal(withClaims.matchReview?.rate, 100);
    assert.equal(buildMonitoringSnapshot(input({ claims: null })).matchReview, null);
  });

  it("holds counts only, never report details", () => {
    const review = summarizeMatchReview([claim("approved", 90)]);
    assert.deepEqual(Object.keys(review).sort(), [
      "approved", "bands", "rate", "rejected", "reviewed", "smallSample", "unscored",
    ]);
  });
});
