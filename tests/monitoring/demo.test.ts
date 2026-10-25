import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDemoMonitoringInput,
  buildDemoMonitoringSnapshot,
  DEMO_DECIDED_CLAIMS,
  DEMO_MODEL,
  isMonitoringDemoEnabled,
} from "@/utils/monitoring/demo";
import {
  MIN_RELIABLE_REVIEWS,
  MIN_TREND_DAYS,
  RECENT_CHECKS_SHOWN,
  TREND_DAYS,
} from "@/utils/monitoring/snapshot";

const NOW = new Date(2026, 9, 24, 15, 0); // 24 Oct 2026, local

describe("isMonitoringDemoEnabled", () => {
  it("is off outside development", () => {
    assert.equal(isMonitoringDemoEnabled("1", { NODE_ENV: "production" }), false);
    assert.equal(
      isMonitoringDemoEnabled(undefined, {
        NODE_ENV: "production",
        AMANAH_MONITORING_DEMO: "1",
      }),
      false,
    );
    assert.equal(isMonitoringDemoEnabled("1", { NODE_ENV: "test" }), false);
  });

  it("turns on with ?demo=1 in development", () => {
    assert.equal(isMonitoringDemoEnabled("1", { NODE_ENV: "development" }), true);
    assert.equal(isMonitoringDemoEnabled("true", { NODE_ENV: "development" }), true);
    assert.equal(isMonitoringDemoEnabled(["1"], { NODE_ENV: "development" }), true);
  });

  it("turns on from AMANAH_MONITORING_DEMO in development", () => {
    assert.equal(
      isMonitoringDemoEnabled(undefined, {
        NODE_ENV: "development",
        AMANAH_MONITORING_DEMO: "1",
      }),
      true,
    );
  });

  it("lets ?demo=0 override the env flag", () => {
    assert.equal(
      isMonitoringDemoEnabled("0", {
        NODE_ENV: "development",
        AMANAH_MONITORING_DEMO: "1",
      }),
      false,
    );
    assert.equal(
      isMonitoringDemoEnabled("false", {
        NODE_ENV: "development",
        AMANAH_MONITORING_DEMO: "1",
      }),
      false,
    );
  });

  it("stays off with no query and no env in development", () => {
    assert.equal(isMonitoringDemoEnabled(undefined, { NODE_ENV: "development" }), false);
    assert.equal(isMonitoringDemoEnabled(null, { NODE_ENV: "development" }), false);
  });
});

describe("demo monitoring fixture", () => {
  const snapshot = buildDemoMonitoringSnapshot(NOW);
  const input = buildDemoMonitoringInput(NOW);

  it("is deterministic for a fixed now", () => {
    assert.deepEqual(buildDemoMonitoringSnapshot(NOW), snapshot);
  });

  it("looks like a working configured matcher with demo model", () => {
    assert.equal(snapshot.geminiConfigured, true);
    assert.equal(snapshot.model, DEMO_MODEL);
    assert.equal(snapshot.health, "working");
    assert.equal(snapshot.history.available, true);
    assert.ok(snapshot.history.total >= RECENT_CHECKS_SHOWN);
  });

  it("spreads reports across at least five days in the trend window", () => {
    assert.ok(snapshot.reportsDaily.activeDays >= 5);
    assert.ok(snapshot.reportsDaily.activeDays <= TREND_DAYS);
    assert.ok(snapshot.reportsDaily.total >= 10);
    assert.ok(snapshot.reportsDaily.points.some((point) => point.values.lost > 0));
    assert.ok(snapshot.reportsDaily.points.some((point) => point.values.found > 0));
    // Uneven days: at least one busy day with more than one report.
    assert.ok(snapshot.reportsDaily.points.some((point) => point.total > 1));
  });

  it("includes possible match, not enough information, and no match", () => {
    assert.ok(snapshot.pairs.possible > 0);
    assert.ok(snapshot.pairs.uncertain > 0);
    assert.ok(snapshot.pairs.noMatch > 0);
    assert.ok(snapshot.comparisonsDaily.total >= MIN_TREND_DAYS);
    assert.ok(
      snapshot.comparisonsDaily.points.some((point) => point.values.match > 0),
    );
    assert.ok(
      snapshot.comparisonsDaily.points.some(
        (point) => point.values.insufficient_information > 0,
      ),
    );
    assert.ok(
      snapshot.comparisonsDaily.points.some((point) => point.values.no_match > 0),
    );
  });

  it("records mostly completed checks plus one failure and one early stop", () => {
    assert.ok(snapshot.window);
    assert.ok(snapshot.window.completed >= 5);
    assert.equal(snapshot.window.failed, 1);
    assert.equal(snapshot.window.stoppedEarly, 1);
    assert.equal(snapshot.window.failureKinds.quota, 1);

    const recent = snapshot.recentRuns;
    assert.ok(recent.some((run) => run.source === "admin" && !run.failure && !run.stoppedForTime));
    assert.ok(recent.some((run) => run.source === "auto" && !run.failure && !run.stoppedForTime));
    assert.ok(recent.some((run) => run.failure === "quota"));
    assert.ok(recent.some((run) => run.stoppedForTime && !run.failure));
    // Plausible durations: seconds, not zero, not multi-minute.
    for (const check of recent) {
      assert.ok(check.durationMs >= 1000 && check.durationMs <= 60_000);
    }
  });

  it("has about 25 decided claims across all score bands, with pending left", () => {
    assert.ok(snapshot.claims);
    assert.ok(snapshot.matchReview);
    assert.equal(snapshot.matchReview.reviewed, DEMO_DECIDED_CLAIMS);
    assert.ok(snapshot.claims.awaitingDecision > 0);
    assert.ok(snapshot.claims.approved > 0);
    assert.ok(snapshot.claims.rejected > 0);
    assert.ok(snapshot.claims.assessmentRetry > 0);

    for (const band of snapshot.matchReview.bands) {
      assert.ok(band.reviewed > 0, `band ${band.key} should have reviews`);
      assert.ok(band.approved + band.rejected === band.reviewed);
      assert.notEqual(band.rate, null);
    }

    // Overall sample is large enough; the lowest band stays a small sample.
    assert.equal(snapshot.matchReview.smallSample, false);
    assert.ok(snapshot.matchReview.reviewed >= MIN_RELIABLE_REVIEWS);
    const low = snapshot.matchReview.bands.find((band) => band.key === "below-70");
    assert.ok(low);
    assert.equal(low.smallSample, true);
  });

  it("leans approval toward higher scores but keeps exceptions", () => {
    const [high, mid, low] = snapshot.matchReview!.bands;
    assert.ok((high.rate ?? 0) > (mid.rate ?? 0));
    assert.ok((mid.rate ?? 0) > (low.rate ?? 0));
    assert.ok(high.rejected > 0);
    assert.ok(low.approved > 0);
  });

  it("keeps report details out of the snapshot", () => {
    const text = JSON.stringify(snapshot);
    assert.equal(text.includes("demo-lost"), false);
    assert.equal(text.includes("demo-found"), false);
    assert.equal(text.includes("backpack"), false);
    assert.equal(text.includes("water bottle"), false);
    assert.equal(text.includes("item_name"), false);
    assert.equal(text.includes("description"), false);
    assert.equal(text.includes("location"), false);
    // Input may hold synthetic IDs for pairing; the snapshot must not.
    assert.ok(input.reports.some((row) => row.id.startsWith("demo-")));
  });
});
