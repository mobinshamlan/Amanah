import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmptyDb, createFakeSupabase, type FixtureDb } from "@/utils/fixtures/fakeSupabase";
import { hasUncertainSuggestion, toPublicStatus } from "@/utils/matching/publicStatus";
import type { OwnershipDeps } from "@/utils/ownership/service";
import { isSandboxMode, SANDBOX_RETENTION_DAYS } from "@/utils/sandbox";
import { cleanupSandbox } from "@/utils/sandbox/cleanup";
import { ensureSampleReports, SAMPLE_REPORTS } from "@/utils/sandbox/samples";
import { SANDBOX_DECISION_NOTE, tryStaffDecisionWith } from "@/utils/sandbox/staffDecision";
import { GET as cleanupRoute } from "@/app/api/sandbox/cleanup/route";
import { createMemoryStore } from "../ownership/memoryStore";

// Test mode: sample reports, cleanup, the cleanup route, the visitor's staff
// role, and the "uncertain" threshold. In-memory data only.

type Client = Parameters<typeof cleanupSandbox>[0];

const NOW = new Date("2026-11-24T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const silent = { info() {}, error() {} };

function daysAgo(days: number) {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString();
}

function sandboxDb() {
  const db = createEmptyDb();
  const client = createFakeSupabase(db) as unknown as Client;
  return { db, client };
}

function addReport(db: FixtureDb, id: string, type: "lost" | "found", createdAt: string) {
  db.tables.reports.push({
    id,
    report_type: type,
    item_name: "Item",
    description: "Description",
    location: "Location",
    created_at: createdAt,
  });
}

describe("test mode switch", () => {
  it("is on only with AMANAH_SANDBOX=1", () => {
    assert.equal(isSandboxMode({ AMANAH_SANDBOX: "1" }), true);
    assert.equal(isSandboxMode({ AMANAH_SANDBOX: "true" }), false);
    assert.equal(isSandboxMode({}), false);
  });
});

describe("sample reports", () => {
  it("are found reports with fixed, unique ids, including the three lost-form examples", () => {
    assert.ok(SAMPLE_REPORTS.length >= 8);
    assert.equal(new Set(SAMPLE_REPORTS.map((report) => report.id)).size, SAMPLE_REPORTS.length);
    assert.ok(SAMPLE_REPORTS.every((report) => report.report_type === "found"));
    const text = SAMPLE_REPORTS.map((report) => `${report.item_name} ${report.description}`).join(" ");
    for (const word of ["مظلة", "محفظة", "مفاتيح"]) {
      assert.ok(text.includes(word), word);
    }
  });

  it("are added once and never duplicated", async () => {
    const { db, client } = sandboxDb();
    assert.equal(await ensureSampleReports(client), SAMPLE_REPORTS.length);
    assert.equal(await ensureSampleReports(client), 0);
    assert.equal(db.tables.reports.length, SAMPLE_REPORTS.length);
  });
});

describe("cleanupSandbox", () => {
  function seeded() {
    const { db, client } = sandboxDb();
    // A sample older than the retention period must survive.
    db.tables.reports.push({ ...SAMPLE_REPORTS[0], created_at: daysAgo(30) });
    addReport(db, "old-lost", "lost", daysAgo(SANDBOX_RETENTION_DAYS + 1));
    addReport(db, "old-found", "found", daysAgo(SANDBOX_RETENTION_DAYS + 0.5));
    addReport(db, "new-lost", "lost", daysAgo(1));
    db.tables.report_matches.push({
      id: "match-old",
      lost_report_id: "old-lost",
      lost_report_type: "lost",
      found_report_id: SAMPLE_REPORTS[0].id,
      found_report_type: "found",
      ai_decision: "match",
    });
    db.tables.ownership_verifications.push({ id: "ver-old", lost_report_id: "old-lost", report_match_id: "match-old", match_ai_decision: "match" });
    db.tables.ownership_decisions.push({ id: "dec-old", verification_id: "ver-old", decision: "approved" });
    db.tables.report_submissions.push({ report_id: "old-lost", token_hash: "h1" });
    db.tables.report_submissions.push({ report_id: "new-lost", token_hash: "h2" });
    return { db, client };
  }

  it("deletes only non-sample reports older than the retention period, with their rows", async () => {
    const { db, client } = seeded();
    const summary = await cleanupSandbox(client, NOW);
    assert.deepEqual(summary, {
      mode: "expired",
      deletedReports: 2,
      samplesAdded: SAMPLE_REPORTS.length - 1,
    });
    const ids = db.tables.reports.map((row) => row.id);
    assert.ok(ids.includes("new-lost"));
    assert.ok(!ids.includes("old-lost") && !ids.includes("old-found"));
    assert.ok(SAMPLE_REPORTS.every((report) => ids.includes(report.id)));
    assert.equal(db.tables.report_matches.length, 0);
    assert.equal(db.tables.ownership_verifications.length, 0);
    assert.equal(db.tables.ownership_decisions.length, 0);
    assert.deepEqual(db.tables.report_submissions.map((row) => row.report_id), ["new-lost"]);
  });

  it("purges every non-sample report regardless of age in mode 'all'", async () => {
    const { db, client } = seeded();
    const summary = await cleanupSandbox(client, NOW, "all");
    assert.equal(summary.mode, "all");
    assert.equal(summary.deletedReports, 3);
    assert.equal(db.tables.reports.length, SAMPLE_REPORTS.length);
    assert.equal(db.tables.report_submissions.length, 0);
  });
});

describe("cleanup route", () => {
  async function call(env: Record<string, string | undefined>, headers: Record<string, string> = {}) {
    const saved = { AMANAH_SANDBOX: process.env.AMANAH_SANDBOX, CRON_SECRET: process.env.CRON_SECRET };
    Object.assign(process.env, env);
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) {
        delete process.env[key];
      }
    }
    try {
      return await cleanupRoute(new Request("http://localhost/api/sandbox/cleanup", { headers }));
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  }

  it("does not exist outside test mode, even with the secret", async () => {
    const response = await call(
      { AMANAH_SANDBOX: undefined, CRON_SECRET: "s3cret" },
      { authorization: "Bearer s3cret" },
    );
    assert.equal(response.status, 404);
  });

  it("refuses a missing or wrong secret", async () => {
    assert.equal((await call({ AMANAH_SANDBOX: "1", CRON_SECRET: "s3cret" })).status, 401);
    assert.equal(
      (await call({ AMANAH_SANDBOX: "1", CRON_SECRET: "s3cret" }, { authorization: "Bearer nope" })).status,
      401,
    );
  });

  it("refuses everything when CRON_SECRET is not set", async () => {
    const response = await call(
      { AMANAH_SANDBOX: "1", CRON_SECRET: undefined },
      { authorization: "Bearer undefined" },
    );
    assert.equal(response.status, 401);
  });
});

describe("tryStaffDecision (visitor plays staff)", () => {
  const SANDBOX = { AMANAH_SANDBOX: "1" };

  function setup(questions: string[] = ["Q1?", "Q2?"]) {
    const memory = createMemoryStore();
    const deps: OwnershipDeps = {
      store: memory.store,
      ai: {
        model: "fake-model",
        generateQuestions: async () => ({ questions: [], dropped: [] }),
        assessAnswers: async () => ({ assessment: "supports", explanation: "ok" }),
      },
      logger: silent,
    };
    const credential = memory.addSubmission("lost-1", "lost");
    memory.addMatch("match-1", "lost-1");
    memory.addVerification({
      id: "ver-1",
      lostReportId: "lost-1",
      reportMatchId: "match-1",
      questions,
      expectedDetails: questions.map(() => "detail"),
    });
    return { memory, deps, credential };
  }

  function answerAll(memory: ReturnType<typeof createMemoryStore>) {
    memory.answers.push(
      { verificationId: "ver-1", questionNumber: 1, answer: "a" },
      { verificationId: "ver-1", questionNumber: 2, answer: "b" },
    );
  }

  it("is refused outside test mode", async () => {
    const { memory, deps, credential } = setup();
    answerAll(memory);
    const result = await tryStaffDecisionWith(deps, credential, "approved", {});
    assert.deepEqual(result, { ok: false, reason: "not_sandbox" });
    assert.equal(memory.decisions.length, 0);
  });

  it("rejects a bad credential and a found reporter's credential", async () => {
    const { memory, deps } = setup();
    assert.deepEqual(await tryStaffDecisionWith(deps, "nope", "approved", SANDBOX), {
      ok: false,
      reason: "invalid_link",
    });
    const found = memory.addSubmission("found-1", "found");
    assert.deepEqual(await tryStaffDecisionWith(deps, found, "approved", SANDBOX), {
      ok: false,
      reason: "invalid_link",
    });
  });

  it("waits until the owner has answered every question", async () => {
    const { memory, deps, credential } = setup();
    assert.deepEqual(await tryStaffDecisionWith(deps, credential, "approved", SANDBOX), {
      ok: false,
      reason: "not_ready",
    });
    assert.equal(memory.decisions.length, 0);
  });

  it("is not ready when there is no claim yet", async () => {
    const memory = createMemoryStore();
    const credential = memory.addSubmission("lost-2", "lost");
    const deps = { ...setup().deps, store: memory.store };
    assert.deepEqual(await tryStaffDecisionWith(deps, credential, "approved", SANDBOX), {
      ok: false,
      reason: "not_ready",
    });
  });

  it("approves, then switches to rejected through a logged reset", async () => {
    const { memory, deps, credential } = setup();
    answerAll(memory);

    const approved = await tryStaffDecisionWith(deps, credential, "approved", SANDBOX);
    assert.deepEqual(approved, { ok: true, view: { state: "decided", decision: "approved" } });
    assert.equal(memory.decisions.at(-1)?.note, SANDBOX_DECISION_NOTE);

    // The same decision again changes nothing.
    await tryStaffDecisionWith(deps, credential, "approved", SANDBOX);
    assert.equal(memory.decisions.length, 1);

    const rejected = await tryStaffDecisionWith(deps, credential, "rejected", SANDBOX);
    assert.deepEqual(rejected, { ok: true, view: { state: "decided", decision: "rejected" } });
    assert.deepEqual(
      memory.decisions.map((row) => row.decision),
      ["approved", "pending_review", "rejected"],
    );
  });

  it("works on a claim with no questions (staff review)", async () => {
    const { deps, credential } = setup([]);
    const result = await tryStaffDecisionWith(deps, credential, "rejected", SANDBOX);
    assert.deepEqual(result, { ok: true, view: { state: "decided", decision: "rejected" } });
  });
});

describe("uncertain threshold", () => {
  const insufficient = (score: number | null) => ({
    ai_decision: "insufficient_information",
    ai_similarity_score: score,
  });

  it("counts only 'not enough information' pairs scored 40 or more", () => {
    assert.equal(hasUncertainSuggestion([insufficient(40)]), true);
    assert.equal(hasUncertainSuggestion([insufficient(39), insufficient(null)]), false);
    assert.equal(hasUncertainSuggestion([{ ai_decision: "match", ai_similarity_score: 90 }]), false);
    assert.equal(hasUncertainSuggestion([]), false);
  });

  it("reports 'no match' when every pair is checked and only weak pairs remain", () => {
    const status = (hasUncertain: boolean, remaining = 0) =>
      toPublicStatus({ reportType: "lost", remaining, failure: null, hasMatch: false, hasUncertain });
    assert.deepEqual(status(hasUncertainSuggestion([insufficient(25)])), {
      phase: "complete",
      outcome: "no_match",
    });
    assert.deepEqual(status(hasUncertainSuggestion([insufficient(55)])), {
      phase: "complete",
      outcome: "uncertain",
    });
    // Not finished is never "no match".
    assert.deepEqual(status(false, 2), { phase: "checking" });
  });
});
