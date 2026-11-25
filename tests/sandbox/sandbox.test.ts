import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLocalDb, seedRows, type LocalDb } from "@/utils/db/local";
import { hasUncertainSuggestion, toPublicStatus } from "@/utils/matching/publicStatus";
import type { OwnershipDeps } from "@/utils/ownership/service";
import { isSandboxMode, SANDBOX_RETENTION_DAYS } from "@/utils/sandbox";
import { cleanupSandbox } from "@/utils/sandbox/cleanup";
import { ensureSampleReports, SAMPLE_REPORTS } from "@/utils/sandbox/samples";
import { sandboxQuickAnswerWith } from "@/utils/sandbox/quickAnswer";
import { SANDBOX_DECISION_NOTE, tryStaffDecisionWith } from "@/utils/sandbox/staffDecision";
import { GET as cleanupRoute } from "@/app/api/sandbox/cleanup/route";
import { createMemoryStore } from "../ownership/memoryStore";

// Test mode: sample reports, cleanup, the cleanup route, the visitor's staff
// role, and the "uncertain" threshold. A local in-memory Postgres with the real schema.

const NOW = new Date("2026-11-24T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const silent = { info() {}, error() {} };

function daysAgo(days: number) {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString();
}

const OLD_LOST = "00000000-0000-4000-8000-0000000000a1";
const OLD_FOUND = "00000000-0000-4000-8000-0000000000a2";
const NEW_LOST = "00000000-0000-4000-8000-0000000000a3";

function report(id: string, type: "lost" | "found", createdAt: string) {
  return { id, report_type: type, item_name: "Item", description: "Description", location: "Location", created_at: createdAt };
}

async function ids(db: LocalDb, table: "reports" | "report_matches" | "ownership_verifications" | "ownership_decisions") {
  return (await db.query<{ id: string }>(`select id from public.${table}`)).map((row) => row.id);
}

async function submissionReportIds(db: LocalDb) {
  return (await db.query<{ report_id: string }>("select report_id from public.report_submissions")).map(
    (row) => row.report_id,
  );
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
    const db = await createLocalDb();
    assert.equal(await ensureSampleReports(db), SAMPLE_REPORTS.length);
    assert.equal(await ensureSampleReports(db), 0);
    assert.equal((await ids(db, "reports")).length, SAMPLE_REPORTS.length);
    await db.close();
  });
});

describe("cleanupSandbox", () => {
  async function seeded() {
    const db = await createLocalDb();
    await seedRows(db, {
      // A sample older than the retention period must survive.
      reports: [
        { ...SAMPLE_REPORTS[0], created_at: daysAgo(30) },
        report(OLD_LOST, "lost", daysAgo(SANDBOX_RETENTION_DAYS + 1)),
        report(OLD_FOUND, "found", daysAgo(SANDBOX_RETENTION_DAYS + 0.5)),
        report(NEW_LOST, "lost", daysAgo(1)),
      ],
      report_matches: [
        {
          id: "00000000-0000-4000-8000-0000000000b1",
          lost_report_id: OLD_LOST,
          found_report_id: SAMPLE_REPORTS[0].id,
          explanation: "Same item",
          model: "test-model",
          ai_decision: "match",
        },
      ],
      ownership_verifications: [
        {
          id: "00000000-0000-4000-8000-0000000000c1",
          lost_report_id: OLD_LOST,
          report_match_id: "00000000-0000-4000-8000-0000000000b1",
          model: "test-model",
        },
      ],
      ownership_decisions: [
        {
          id: "00000000-0000-4000-8000-0000000000d1",
          verification_id: "00000000-0000-4000-8000-0000000000c1",
          decision: "approved",
        },
      ],
      report_submissions: [
        { report_id: OLD_LOST, token_hash: "1".repeat(64) },
        { report_id: NEW_LOST, token_hash: "2".repeat(64) },
      ],
    });
    return db;
  }

  it("deletes only non-sample reports older than the retention period, with their rows", async () => {
    const db = await seeded();
    const summary = await cleanupSandbox(db, NOW);
    assert.deepEqual(summary, {
      mode: "expired",
      deletedReports: 2,
      samplesAdded: SAMPLE_REPORTS.length - 1,
    });
    const reportIds = await ids(db, "reports");
    assert.ok(reportIds.includes(NEW_LOST));
    assert.ok(!reportIds.includes(OLD_LOST) && !reportIds.includes(OLD_FOUND));
    assert.ok(SAMPLE_REPORTS.every((sample) => reportIds.includes(sample.id)));
    assert.equal((await ids(db, "report_matches")).length, 0);
    assert.equal((await ids(db, "ownership_verifications")).length, 0);
    assert.equal((await ids(db, "ownership_decisions")).length, 0);
    assert.deepEqual(await submissionReportIds(db), [NEW_LOST]);
    await db.close();
  });

  it("purges every non-sample report regardless of age in mode 'all'", async () => {
    const db = await seeded();
    const summary = await cleanupSandbox(db, NOW, "all");
    assert.equal(summary.mode, "all");
    assert.equal(summary.deletedReports, 3);
    assert.equal((await ids(db, "reports")).length, SAMPLE_REPORTS.length);
    assert.equal((await submissionReportIds(db)).length, 0);
    await db.close();
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

describe("sandboxQuickAnswer (one-tap owner's answer)", () => {
  const SANDBOX = { AMANAH_SANDBOX: "1" };

  function setup() {
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
      questions: ["Q1?", "Q2?"],
      expectedDetails: ["yellow handle", "small tear"],
    });
    return { memory, deps, credential };
  }

  it("gives the detail behind the current question in test mode only", async () => {
    const { memory, deps, credential } = setup();
    assert.equal(await sandboxQuickAnswerWith(deps, credential, 1, {}), null);
    assert.equal(await sandboxQuickAnswerWith(deps, credential, 1, SANDBOX), "yellow handle");
    // Never for another question than the one the owner is on.
    assert.equal(await sandboxQuickAnswerWith(deps, credential, 2, SANDBOX), null);
    memory.answers.push({ verificationId: "ver-1", questionNumber: 1, answer: "a" });
    assert.equal(await sandboxQuickAnswerWith(deps, credential, 2, SANDBOX), "small tear");
  });

  it("refuses a bad or found reporter's credential", async () => {
    const { memory, deps } = setup();
    assert.equal(await sandboxQuickAnswerWith(deps, "nope", 1, SANDBOX), null);
    const found = memory.addSubmission("found-1", "found");
    assert.equal(await sandboxQuickAnswerWith(deps, found, 1, SANDBOX), null);
  });
});
