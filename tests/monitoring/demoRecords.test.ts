import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  excludeDemoData,
  isDemoModel,
  isDemoReportName,
  type DemoFilterInput,
} from "@/utils/monitoring/demoRecords";
import { buildMonitoringSnapshot, type MatchingRun } from "@/utils/monitoring/snapshot";

// Fictional records only. No database or Gemini calls.

const NOW = new Date(2026, 9, 25, 15, 0);
const at = (daysAgo: number) => new Date(2026, 9, 25 - daysAgo, 12, 0).toISOString();

function run(model: string, overrides: Partial<MatchingRun> = {}): MatchingRun {
  return {
    finishedAt: at(0), source: "auto", durationMs: 1000, requests: 1, checked: 1, matched: 0,
    uncertain: 0, noMatch: 1, failed: 0, alreadySaved: 0, remaining: 0, failure: null,
    stoppedForTime: false, model, ...overrides,
  };
}

// Real: L1, F1. Demo: DL1 (lost), DF1 (found). One mixed pair of real + demo.
function input(overrides: Partial<DemoFilterInput> = {}): DemoFilterInput {
  return {
    now: NOW,
    geminiConfigured: true,
    model: "gemini-test",
    reports: [
      { id: "L1", report_type: "lost", created_at: at(2), item_name: "Pencil case" },
      { id: "F1", report_type: "found", created_at: at(2), item_name: "Green pencil case" },
      { id: "DL1", report_type: "lost", created_at: at(1), item_name: "DEMO · Sketchbook" },
      { id: "DF1", report_type: "found", created_at: at(1), item_name: "DEMO — Blue backpack" },
    ],
    pairChecks: [
      { lost_report_id: "L1", found_report_id: "F1", ai_decision: "match", checked_at: at(1) },
      { lost_report_id: "DL1", found_report_id: "DF1", ai_decision: "match", checked_at: at(1) },
      { lost_report_id: "DL1", found_report_id: "F1", ai_decision: "no_match", checked_at: at(1) },
      { lost_report_id: "L1", found_report_id: "DF1", ai_decision: "no_match", checked_at: at(0) },
    ],
    suggestions: [
      { lost_report_id: "L1", found_report_id: "F1", ai_decision: "match", model: "gemini-test" },
      { lost_report_id: "DL1", found_report_id: "DF1", ai_decision: "match", model: "demo-fixture" },
      { lost_report_id: "L1", found_report_id: "DF1", ai_decision: "match", model: "gemini-test" },
    ],
    history: {
      runs: [run("gemini-test"), run("demo-fixture"), run("demo-fixture", { failure: "quota" })],
      total: 3,
      firstAt: at(5),
    },
    claims: [
      { questionCount: 1, answerCount: 1, assessed: true, decision: "approved", lostReportId: "L1", model: "gemini-test" },
      { questionCount: 1, answerCount: 1, assessed: true, decision: "rejected", lostReportId: "DL1", model: "demo-fixture" },
      // Real model, but on a demo report: still demo.
      { questionCount: 1, answerCount: 1, assessed: true, decision: "approved", lostReportId: "DL1", model: "gemini-test" },
      // Demo model on a report with no demo name: still demo.
      { questionCount: 1, answerCount: 1, assessed: true, decision: null, lostReportId: "L1", model: "demo-fixture" },
    ],
    ...overrides,
  };
}

describe("what counts as demo", () => {
  it("recognises names that start with the word DEMO, any separator or case", () => {
    for (const name of [
      "DEMO · Sketchbook",
      "DEMO — Navy canvas backpack",
      "demo - keys",
      "Demo: umbrella",
      "DEMO in a colour Navy backpack",
      "  DEMO Notebook",
    ]) {
      assert.equal(isDemoReportName(name), true, name);
    }
  });

  it("does not guess from names that only contain or resemble the word", () => {
    for (const name of ["Notebook", "Demonstration board", "Remodel kit", "Blue DEMO notebook", "", null, undefined]) {
      assert.equal(isDemoReportName(name), false, String(name));
    }
  });

  it("marks demo models only", () => {
    assert.equal(isDemoModel("demo-fixture"), true);
    assert.equal(isDemoModel("gemini-demo"), true);
    assert.equal(isDemoModel("gemini-3.5-flash-lite"), false);
    assert.equal(isDemoModel(null), false);
  });
});

describe("excludeDemoData", () => {
  it("removes demo reports and drops names from what remains", () => {
    const { input: out, excluded } = excludeDemoData(input());
    assert.deepEqual(out.reports.map((row) => row.id), ["L1", "F1"]);
    assert.ok(out.reports.every((row) => !("item_name" in row)));
    assert.equal(excluded.reports, 2);
  });

  it("removes comparisons and suggestions that involve a demo report, including mixed pairs", () => {
    const { input: out, excluded } = excludeDemoData(input());
    assert.deepEqual(out.pairChecks.map((row) => `${row.lost_report_id}-${row.found_report_id}`), ["L1-F1"]);
    assert.equal(excluded.comparisons, 3);
    assert.deepEqual(out.suggestions.map((row) => `${row.lost_report_id}-${row.found_report_id}`), ["L1-F1"]);
    assert.equal(excluded.suggestions, 2);
  });

  it("removes demo runs and counts those the query already hid", () => {
    const { input: out, excluded } = excludeDemoData(input(), 7);
    assert.equal(out.history?.runs.length, 1);
    assert.equal(out.history?.runs[0].model, "gemini-test");
    assert.equal(excluded.runs, 2 + 7);
  });

  it("removes demo claims by report or model, and with them their decisions", () => {
    const { input: out, excluded } = excludeDemoData(input());
    assert.equal(out.claims?.length, 1);
    assert.equal(out.claims?.[0].decision, "approved");
    assert.equal(excluded.claims, 3);
    assert.ok(out.claims?.every((claim) => !("lostReportId" in claim) && !("model" in claim)));
  });

  it("keeps unavailable data unavailable", () => {
    const { input: out, excluded } = excludeDemoData(input({ claims: null, history: null }));
    assert.equal(out.claims, null);
    assert.equal(out.history, null);
    assert.equal(excluded.claims, 0);
    assert.equal(excluded.runs, 0);
  });

  it("changes nothing when there is no demo data", () => {
    const clean = input({
      reports: input().reports.slice(0, 2),
      pairChecks: input().pairChecks.slice(0, 1),
      suggestions: input().suggestions.slice(0, 1),
      history: { runs: [run("gemini-test")], total: 1, firstAt: at(1) },
      claims: input().claims?.slice(0, 1) ?? null,
    });
    const { excluded } = excludeDemoData(clean);
    assert.deepEqual(excluded, { reports: 0, comparisons: 0, suggestions: 0, runs: 0, claims: 0 });
  });
});

describe("Monitoring totals without demo data", () => {
  const { input: filtered, excluded } = excludeDemoData(input(), 0);
  const snapshot = buildMonitoringSnapshot({ ...filtered, excludedDemo: excluded });

  it("counts pairs, charts, claims, and decisions from real records only", () => {
    assert.deepEqual([snapshot.pairs.lostReports, snapshot.pairs.foundReports, snapshot.pairs.total], [1, 1, 1]);
    assert.equal(snapshot.pairs.checked, 1);
    assert.equal(snapshot.pairs.noMatch, 0);
    assert.equal(snapshot.reportsDaily.total, 2);
    assert.equal(snapshot.comparisonsDaily.total, 1);
    assert.equal(snapshot.claims?.total, 1);
    assert.equal(snapshot.claims?.approved, 1);
    assert.equal(snapshot.claims?.rejected, 0);
    assert.equal(snapshot.matchReview?.reviewed, 1);
  });

  it("uses only real run history", () => {
    assert.equal(snapshot.history.total, 3, "total is whatever the loader supplies");
    assert.equal(snapshot.recentRuns.length, 1);
    assert.equal(snapshot.recentFailures.length, 0);
    assert.equal(snapshot.window?.failed, 0);
    assert.equal(snapshot.health, "working");
  });

  it("reports what was excluded as counts", () => {
    assert.deepEqual(snapshot.demoExcluded, {
      reports: 2, comparisons: 3, suggestions: 2, runs: 2, claims: 3,
    });
  });

  it("never carries report names or IDs", () => {
    const text = JSON.stringify(snapshot);
    for (const secret of ["Sketchbook", "backpack", "pencil", "DL1", "DF1", "L1", "F1"]) {
      assert.ok(!text.toLowerCase().includes(secret.toLowerCase()), `leaked ${secret}`);
    }
  });
});
