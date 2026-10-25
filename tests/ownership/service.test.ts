import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GeminiApiError,
  GeminiConfigError,
  GeminiInvalidResponseError,
  type ReportComparisonInput,
} from "@/utils/gemini/compareReports";
import type {
  AnsweredQuestion,
  OwnershipAssessment,
  ParsedOwnershipQuestions,
} from "@/utils/gemini/ownershipVerification";
import {
  askFollowup,
  FOLLOWUP_QUESTION_MAX,
  getOwnerVerification,
  recordDecision,
  resetDecision,
  retryAssessment,
  submitFollowupAnswer,
  submitOwnerAnswer,
  type OwnershipAi,
  type OwnershipDeps,
} from "@/utils/ownership/service";
import { latestDecision } from "@/utils/ownership/supabaseStore";
import { createMemoryStore, FOUND } from "./memoryStore";

// Controlled tests only: an in-memory store and a fake AI. No Gemini or database calls.

const QUESTIONS: ParsedOwnershipQuestions = {
  questions: [
    {
      question: "Does your bottle have any stickers or markings? Please describe them.",
      expectedDetail: "blue NASA sticker",
    },
    {
      question: "Is anything written or engraved on your bottle? Please describe it.",
      expectedDetail: "initials R.K. engraved on the lid",
    },
  ],
  dropped: [],
};

const silent = { info() {}, error() {} };

function fakeAi({
  questions = async () => QUESTIONS,
  assess = async () => ({ assessment: "supports", explanation: "Both answers agree." }),
}: {
  questions?: () => Promise<ParsedOwnershipQuestions>;
  assess?: () => Promise<OwnershipAssessment>;
} = {}) {
  const calls = { generate: 0, assess: [] as AnsweredQuestion[][] };
  const ai: OwnershipAi = {
    model: "fake-model",
    async generateQuestions(lost: ReportComparisonInput, found: ReportComparisonInput) {
      calls.generate += 1;
      assert.ok(lost && found);
      return questions();
    },
    async assessAnswers(_lost, _found, answers) {
      calls.assess.push(answers);
      return assess();
    },
  };
  return { ai, calls };
}

function setup(aiOptions?: Parameters<typeof fakeAi>[0]) {
  const memory = createMemoryStore();
  const { ai, calls } = fakeAi(aiOptions);
  const deps: OwnershipDeps = { store: memory.store, ai, logger: silent };
  const credential = memory.addSubmission("lost-1", "lost");
  memory.addMatch("match-top", "lost-1");
  return { memory, deps, calls, credential };
}

// Nothing private may appear in what the owner receives.
function assertOwnerSafe(value: unknown) {
  const text = JSON.stringify(value);
  for (const secret of [
    FOUND.description,
    FOUND.itemName,
    "blue NASA sticker",
    "R.K.",
    "Both answers agree",
    "supports",
    "match-top",
  ]) {
    assert.ok(!text.includes(secret), `owner view leaked: ${secret}`);
  }
}

describe("authorization", () => {
  it("rejects malformed, unknown, and found-report credentials", async () => {
    const { memory, deps, calls } = setup();
    const foundCredential = memory.addSubmission("found-1", "found");

    for (const credential of [
      "",
      "lost-1",
      "x".repeat(43) + "!",
      "A".repeat(43),
      foundCredential,
      undefined,
    ]) {
      assert.deepEqual(await getOwnerVerification(deps, credential), { ok: false });
      assert.deepEqual(await submitOwnerAnswer(deps, credential, 1, "Blue sticker"), {
        ok: false,
        reason: "invalid_link",
      });
    }
    assert.equal(calls.generate, 0);
    assert.equal(memory.verifications.length, 0);
    assert.equal(memory.answers.length, 0);
  });

  it("never accepts a report ID in place of the credential", async () => {
    const { deps } = setup();
    assert.deepEqual(await getOwnerVerification(deps, "lost-1"), { ok: false });
  });
});

describe("question creation", () => {
  it("creates questions from the top match and shows only the first question", async () => {
    const { memory, deps, calls, credential } = setup();
    const result = await getOwnerVerification(deps, credential);

    assert.deepEqual(result, {
      ok: true,
      view: {
        state: "question",
        number: 1,
        total: 2,
        question: QUESTIONS.questions[0].question,
      },
    });
    assertOwnerSafe(result);
    assert.equal(calls.generate, 1);
    assert.deepEqual(memory.verifications[0], {
      id: "verification-1",
      lostReportId: "lost-1",
      reportMatchId: "match-top",
      questions: QUESTIONS.questions.map((item) => item.question),
      expectedDetails: ["blue NASA sticker", "initials R.K. engraved on the lid"],
      model: "fake-model",
    });
  });

  it("does not ask Gemini again once questions exist", async () => {
    const { deps, calls, credential } = setup();
    await getOwnerVerification(deps, credential);
    await getOwnerVerification(deps, credential);
    assert.equal(calls.generate, 1);
  });

  it("asks for staff review instead of inventing a question", async () => {
    const { memory, deps, credential } = setup({
      questions: async () => ({ questions: [], dropped: ["reveals_answer"] }),
    });
    const result = await getOwnerVerification(deps, credential);
    assert.deepEqual(result, { ok: true, view: { state: "staff_review" } });
    assert.deepEqual(memory.verifications[0].questions, []);
    assert.deepEqual(memory.verifications[0].expectedDetails, []);
  });

  it("does nothing when there is no match suggestion", async () => {
    const memory = createMemoryStore();
    const { ai, calls } = fakeAi();
    const credential = memory.addSubmission("lost-2", "lost");
    const result = await getOwnerVerification({ store: memory.store, ai, logger: silent }, credential);
    assert.deepEqual(result, { ok: true, view: { state: "not_needed" } });
    assert.equal(calls.generate, 0);
  });

  it("uses the existing verification when another request created it first", async () => {
    const { memory, deps, credential } = setup();
    memory.addVerification({
      id: "verification-existing",
      lostReportId: "lost-1",
      reportMatchId: "match-top",
      questions: ["Existing question?"],
      expectedDetails: ["existing detail"],
    });
    const result = await getOwnerVerification(deps, credential);
    assert.deepEqual(result, {
      ok: true,
      view: { state: "question", number: 1, total: 1, question: "Existing question?" },
    });
    assert.equal(memory.verifications.length, 1);
  });
});

describe("question creation failures", () => {
  const cases: [string, Error, string][] = [
    ["rate limit", new GeminiApiError("busy", 429), "busy"],
    ["timeout", new GeminiApiError("timeout", undefined, true), "failed"],
    ["invalid response", new GeminiInvalidResponseError(), "failed"],
    ["missing key", new GeminiConfigError(), "unavailable"],
  ];

  for (const [name, error, reason] of cases) {
    it(`shows a retry state on ${name} and saves nothing`, async () => {
      const { memory, deps, credential } = setup({
        questions: async () => {
          throw error;
        },
      });
      const result = await getOwnerVerification(deps, credential);
      assert.deepEqual(result, { ok: true, view: { state: "retry", reason } });
      assert.equal(memory.verifications.length, 0);
      assert.ok(!JSON.stringify(result).includes("no_match"));
    });
  }

  it("can be retried after a failure", async () => {
    let fail = true;
    const { deps, credential } = setup({
      questions: async () => {
        if (fail) {
          throw new GeminiApiError("busy", 429);
        }
        return QUESTIONS;
      },
    });
    assert.equal((await getOwnerVerification(deps, credential)).ok, true);
    fail = false;
    const result = await getOwnerVerification(deps, credential);
    assert.equal(result.ok && result.view.state, "question");
  });

  it("reports unavailable when the migration is not applied", async () => {
    const { memory, deps, credential } = setup();
    memory.failures.add("findVerificationByLostReport");
    memory.failures.add("missing_table");
    assert.deepEqual(await getOwnerVerification(deps, credential), {
      ok: true,
      view: { state: "retry", reason: "unavailable" },
    });
  });

  it("shows a retry state when saving the questions fails", async () => {
    const { memory, deps, credential } = setup();
    memory.failures.add("insertVerification");
    assert.deepEqual(await getOwnerVerification(deps, credential), {
      ok: true,
      view: { state: "retry", reason: "failed" },
    });
  });
});

describe("answers", () => {
  it("accepts one answer at a time, then assesses without deciding", async () => {
    const { memory, deps, calls, credential } = setup();
    await getOwnerVerification(deps, credential);

    const first = await submitOwnerAnswer(deps, credential, 1, "  A blue space sticker  ");
    assert.deepEqual(first, {
      ok: true,
      view: {
        state: "question",
        number: 2,
        total: 2,
        question: QUESTIONS.questions[1].question,
      },
    });
    assert.equal(calls.assess.length, 0);

    const second = await submitOwnerAnswer(deps, credential, 2, "RK on the lid");
    assert.deepEqual(second, { ok: true, view: { state: "answers_received" } });
    assertOwnerSafe(second);

    assert.deepEqual(memory.answers, [
      { verificationId: "verification-1", questionNumber: 1, answer: "A blue space sticker" },
      { verificationId: "verification-1", questionNumber: 2, answer: "RK on the lid" },
    ]);
    assert.deepEqual(calls.assess[0], [
      {
        question: QUESTIONS.questions[0].question,
        expectedDetail: "blue NASA sticker",
        answer: "A blue space sticker",
      },
      {
        question: QUESTIONS.questions[1].question,
        expectedDetail: "initials R.K. engraved on the lid",
        answer: "RK on the lid",
      },
    ]);
    assert.equal(memory.assessments[0].assessment, "supports");
    // A supporting assessment never approves anything.
    assert.equal(memory.decisions.length, 0);
    assert.ok(!memory.calls.includes("insertDecision"));
  });

  it("ignores an answer for the wrong question", async () => {
    const { memory, deps, credential } = setup();
    await getOwnerVerification(deps, credential);
    for (const number of [2, 0, 3, "1", null]) {
      const result = await submitOwnerAnswer(deps, credential, number, "Answer");
      assert.equal(result.ok && result.view.state, "question");
    }
    assert.equal(memory.answers.length, 0);
  });

  it("does not let an answer be changed after it is saved", async () => {
    const { memory, deps, credential } = setup();
    await getOwnerVerification(deps, credential);
    await submitOwnerAnswer(deps, credential, 1, "First answer");
    await submitOwnerAnswer(deps, credential, 1, "Changed answer");
    assert.deepEqual(
      memory.answers.map((item) => item.answer),
      ["First answer"],
    );
  });

  it("rejects empty and overlong answers", async () => {
    const { memory, deps, credential } = setup();
    await getOwnerVerification(deps, credential);
    for (const answer of ["", "   ", "x".repeat(1001), 42]) {
      const result = await submitOwnerAnswer(deps, credential, 1, answer);
      assert.equal(result.ok, false);
      assert.equal(!result.ok && result.reason, "invalid_answer");
    }
    assert.equal(memory.answers.length, 0);
  });

  it("reports a save failure without losing earlier answers", async () => {
    const { memory, deps, credential } = setup();
    await getOwnerVerification(deps, credential);
    await submitOwnerAnswer(deps, credential, 1, "First answer");
    memory.failures.add("insertAnswer");
    assert.deepEqual(await submitOwnerAnswer(deps, credential, 2, "Second"), {
      ok: false,
      reason: "save_failed",
    });
    assert.deepEqual(memory.answers.map((item) => item.answer), ["First answer"]);
    assert.equal(memory.verifications.length, 1);
  });

  it("keeps answers when the assessment fails, and staff can retry it", async () => {
    let fail = true;
    const { memory, deps, credential } = setup({
      assess: async () => {
        if (fail) {
          throw new GeminiInvalidResponseError();
        }
        return { assessment: "conflicts", explanation: "Answer 2 names other initials." };
      },
    });
    await getOwnerVerification(deps, credential);
    await submitOwnerAnswer(deps, credential, 1, "Blue sticker");
    const result = await submitOwnerAnswer(deps, credential, 2, "AB");

    assert.deepEqual(result, { ok: true, view: { state: "answers_received" } });
    assert.equal(memory.answers.length, 2);
    assert.equal(memory.assessments.length, 0);

    fail = false;
    assert.equal(await retryAssessment(deps, "verification-1"), "saved");
    assert.equal(memory.assessments[0].assessment, "conflicts");
    // A conflicting assessment never rejects anything either.
    assert.equal(memory.decisions.length, 0);
    assert.equal(await retryAssessment(deps, "verification-1"), "already_assessed");
  });

  it("does not assess before every question is answered", async () => {
    const { deps, calls, credential } = setup();
    await getOwnerVerification(deps, credential);
    assert.equal(await retryAssessment(deps, "verification-1"), "not_ready");
    assert.equal(calls.assess.length, 0);
  });
});

describe("staff decisions", () => {
  async function answeredClaim() {
    const context = setup();
    await getOwnerVerification(context.deps, context.credential);
    await submitOwnerAnswer(context.deps, context.credential, 1, "Blue sticker");
    await submitOwnerAnswer(context.deps, context.credential, 2, "RK on the lid");
    return context;
  }

  it("records a decision and shows it to the owner", async () => {
    const { memory, deps, credential } = await answeredClaim();
    assert.equal(
      await recordDecision(deps, "verification-1", "approved", " Checked ID at desk "),
      "saved",
    );
    assert.equal(await recordDecision(deps, "verification-1", "rejected", ""), "already_decided");
    assert.deepEqual(
      memory.decisions.map(({ decision, note, previousDecisionId }) => ({
        decision,
        note,
        previousDecisionId,
      })),
      [{ decision: "approved", note: "Checked ID at desk", previousDecisionId: null }],
    );
    assert.deepEqual(await getOwnerVerification(deps, credential), {
      ok: true,
      view: { state: "decided", decision: "approved" },
    });
  });

  it("resets an approved or rejected decision to pending review and keeps the record", async () => {
    const { memory, deps, credential } = await answeredClaim();

    assert.equal(await recordDecision(deps, "verification-1", "approved", ""), "saved");
    assert.equal(
      await resetDecision(deps, "verification-1", "Approved the wrong claim"),
      "saved",
    );
    // Back to pending: the owner sees their answers are with staff again.
    assert.deepEqual(await getOwnerVerification(deps, credential), {
      ok: true,
      view: { state: "answers_received" },
    });

    assert.equal(await recordDecision(deps, "verification-1", "rejected", "Initials differ"), "saved");
    assert.deepEqual(await getOwnerVerification(deps, credential), {
      ok: true,
      view: { state: "decided", decision: "rejected" },
    });
    assert.equal(await resetDecision(deps, "verification-1", ""), "saved");

    // Every decision and reset stays in the log, each pointing at the one before.
    assert.deepEqual(
      memory.decisions.map(({ id, decision, note, previousDecisionId, previousDecision }) => ({
        id,
        decision,
        note,
        previousDecisionId,
        previousDecision,
      })),
      [
        { id: "decision-1", decision: "approved", note: null, previousDecisionId: null, previousDecision: null },
        {
          id: "decision-2",
          decision: "pending_review",
          note: "Approved the wrong claim",
          previousDecisionId: "decision-1",
          previousDecision: "approved",
        },
        {
          id: "decision-3",
          decision: "rejected",
          note: "Initials differ",
          previousDecisionId: "decision-2",
          previousDecision: "pending_review",
        },
        {
          id: "decision-4",
          decision: "pending_review",
          note: null,
          previousDecisionId: "decision-3",
          previousDecision: "rejected",
        },
      ],
    );
  });

  it("returns an unanswered claim to its next question after a reset", async () => {
    const { deps, credential } = setup();
    await getOwnerVerification(deps, credential);
    await recordDecision(deps, "verification-1", "rejected", "");
    await resetDecision(deps, "verification-1", "");
    const result = await getOwnerVerification(deps, credential);
    assert.equal(result.ok && result.view.state, "question");
  });

  it("only resets a claim that has a decision", async () => {
    const { memory, deps } = await answeredClaim();
    assert.equal(await resetDecision(deps, "verification-1", ""), "not_decided");
    await recordDecision(deps, "verification-1", "approved", "");
    await resetDecision(deps, "verification-1", "");
    assert.equal(await resetDecision(deps, "verification-1", ""), "not_decided");
    assert.equal(memory.decisions.length, 2);
  });

  it("does not save when another staff action was logged first", async () => {
    const { memory, deps } = await answeredClaim();
    const stale = await memory.store.findVerificationById("verification-1");
    await recordDecision(deps, "verification-1", "approved", "");
    // A second tab still holding the old (pending) state tries to decide.
    const outcome = await memory.store.insertDecision({
      verificationId: "verification-1",
      decision: "rejected",
      note: null,
      previousDecisionId: stale?.latestDecision?.id ?? null,
      previousDecision: null,
    });
    assert.equal(outcome, "duplicate");
    assert.equal(memory.decisions.length, 1);
  });

  it("reports a concurrent change instead of overwriting it", async () => {
    const { memory, deps } = await answeredClaim();
    const insert = memory.store.insertDecision;
    memory.store.insertDecision = async (row) => {
      await insert({ ...row, decision: "approved" });
      return insert(row);
    };
    assert.equal(await recordDecision(deps, "verification-1", "rejected", ""), "changed");
    assert.deepEqual(memory.decisions.map((item) => item.decision), ["approved"]);
  });

  it("rejects invalid input and reports failures", async () => {
    const { memory, deps } = await answeredClaim();
    assert.equal(await recordDecision(deps, "verification-1", "approve", ""), "invalid");
    assert.equal(await recordDecision(deps, "verification-1", "pending_review", ""), "invalid");
    assert.equal(
      await recordDecision(deps, "verification-1", "approved", "x".repeat(1001)),
      "invalid",
    );
    assert.equal(await resetDecision(deps, "verification-1", "x".repeat(1001)), "invalid");
    assert.equal(await recordDecision(deps, "verification-unknown", "approved", ""), "failed");
    memory.failures.add("insertDecision");
    assert.equal(await recordDecision(deps, "verification-1", "rejected", ""), "failed");
    assert.equal(memory.decisions.length, 0);
  });

  it("never changes answers or the AI assessment", async () => {
    const { memory, deps } = await answeredClaim();
    await recordDecision(deps, "verification-1", "approved", "");
    await resetDecision(deps, "verification-1", "");
    assert.equal(memory.answers.length, 2);
    assert.equal(memory.assessments.length, 1);
  });
});

describe("latestDecision", () => {
  it("follows the log chain regardless of row order", () => {
    const rows = [
      { id: "c", decision: "rejected", previous_decision_id: "b", created_at: "2026-01-01T00:02:00Z" },
      { id: "a", decision: "approved", previous_decision_id: null, created_at: "2026-01-01T00:00:00Z" },
      { id: "b", decision: "pending_review", previous_decision_id: "a", created_at: "2026-01-01T00:01:00Z" },
    ] as const;
    assert.deepEqual(latestDecision([...rows]), { id: "c", decision: "rejected" });
    assert.deepEqual(latestDecision([rows[1], rows[2]]), { id: "b", decision: "pending_review" });
    assert.equal(latestDecision([]), null);
  });
});

describe("staff follow-up question", () => {
  const FOLLOWUP = "Where did you buy the bottle?";

  // A claim whose two questions are both answered, ready for staff.
  async function answered() {
    const ctx = setup();
    await getOwnerVerification(ctx.deps, ctx.credential);
    await submitOwnerAnswer(ctx.deps, ctx.credential, 1, "Blue sticker");
    await submitOwnerAnswer(ctx.deps, ctx.credential, 2, "R.K. on the lid");
    return ctx;
  }

  it("is optional: staff can decide without ever asking one", async () => {
    const { memory, deps } = await answered();
    assert.equal(await recordDecision(deps, "verification-1", "approved", ""), "saved");
    assert.equal(memory.followups.length, 0);
  });

  it("saves one trimmed question and shows only its text to the owner", async () => {
    const { memory, deps, credential } = await answered();
    assert.equal(await askFollowup(deps, "verification-1", `  ${FOLLOWUP}  `), "saved");
    assert.deepEqual(memory.followups, [{ verificationId: "verification-1", question: FOLLOWUP }]);

    const result = await getOwnerVerification(deps, credential);
    assert.deepEqual(result, { ok: true, view: { state: "followup", question: FOLLOWUP } });
    assertOwnerSafe(result);
  });

  it("rejects blank and too-long questions without saving", async () => {
    const { memory, deps } = await answered();
    for (const question of ["", "   ", undefined, 7, "x".repeat(FOLLOWUP_QUESTION_MAX + 1)]) {
      assert.equal(await askFollowup(deps, "verification-1", question), "invalid");
    }
    assert.equal(await askFollowup(deps, "verification-1", "x".repeat(FOLLOWUP_QUESTION_MAX)), "saved");
    assert.equal(memory.followups.length, 1);
  });

  it("allows at most one follow-up per claim, even if asked twice", async () => {
    const { memory, deps } = await answered();
    assert.equal(await askFollowup(deps, "verification-1", FOLLOWUP), "saved");
    assert.equal(await askFollowup(deps, "verification-1", "A different question?"), "already_asked");
    assert.equal(memory.followups.length, 1);
    assert.equal(memory.followups[0].question, FOLLOWUP);
  });

  it("stays at one when two staff actions race", async () => {
    const { memory, deps } = await answered();
    const results = await Promise.all([
      askFollowup(deps, "verification-1", "First?"),
      askFollowup(deps, "verification-1", "Second?"),
    ]);
    assert.equal(results.filter((item) => item === "saved").length, 1);
    assert.equal(memory.followups.length, 1);
  });

  it("is refused once the claim has a decision, and unknown claims fail", async () => {
    const { memory, deps } = await answered();
    await recordDecision(deps, "verification-1", "rejected", "");
    assert.equal(await askFollowup(deps, "verification-1", FOLLOWUP), "already_decided");
    assert.equal(memory.followups.length, 0);
    assert.equal(await askFollowup(deps, "nope", FOLLOWUP), "failed");
  });

  it("can be asked again after a reset only if none was asked before", async () => {
    const { deps } = await answered();
    await recordDecision(deps, "verification-1", "approved", "");
    await resetDecision(deps, "verification-1", "");
    assert.equal(await askFollowup(deps, "verification-1", FOLLOWUP), "saved");
    assert.equal(await askFollowup(deps, "verification-1", "Another?"), "already_asked");
  });

  it("asking never approves, rejects, assesses, or calls Gemini", async () => {
    const { memory, deps, calls } = await answered();
    const assessmentsBefore = calls.assess.length;
    const generateBefore = calls.generate;
    await askFollowup(deps, "verification-1", FOLLOWUP);
    assert.equal(memory.decisions.length, 0);
    assert.equal(calls.assess.length, assessmentsBefore);
    assert.equal(calls.generate, generateBefore);
  });

  it("shows the original questions first when the owner has not finished them", async () => {
    const { memory, deps, credential } = setup();
    await getOwnerVerification(deps, credential);
    await askFollowup(deps, "verification-1", FOLLOWUP);
    const view = await getOwnerVerification(deps, credential);
    assert.equal(view.ok && view.view.state, "question");
    await submitOwnerAnswer(deps, credential, 1, "Blue sticker");
    assert.equal(memory.followupAnswers.length, 0);
    await submitOwnerAnswer(deps, credential, 2, "R.K. on the lid");
    const next = await getOwnerVerification(deps, credential);
    assert.deepEqual(next, { ok: true, view: { state: "followup", question: FOLLOWUP } });
  });

  it("saves the owner's single answer and returns the claim to staff review", async () => {
    const { memory, deps, calls, credential } = await answered();
    await askFollowup(deps, "verification-1", FOLLOWUP);
    const assessments = calls.assess.length;

    const result = await submitFollowupAnswer(deps, credential, "  At the campus shop  ");
    assert.deepEqual(result, { ok: true, view: { state: "answers_received" } });
    assert.deepEqual(memory.followupAnswers, [
      { verificationId: "verification-1", answer: "At the campus shop" },
    ]);
    // No decision, no new AI work.
    assert.equal(memory.decisions.length, 0);
    assert.equal(calls.assess.length, assessments);
    assertOwnerSafe(result);

    // A second answer is not saved; the owner just sees the current state.
    assert.deepEqual(await submitFollowupAnswer(deps, credential, "Changed my mind"), {
      ok: true,
      view: { state: "answers_received" },
    });
    assert.equal(memory.followupAnswers.length, 1);
    assert.equal(memory.followupAnswers[0].answer, "At the campus shop");
  });

  it("returns a no-question claim to staff review after the follow-up is answered", async () => {
    const { memory, deps, credential } = setup();
    memory.addVerification({
      id: "verification-1",
      lostReportId: "lost-1",
      reportMatchId: "match-top",
      questions: [],
      expectedDetails: [],
    });
    await askFollowup(deps, "verification-1", FOLLOWUP);
    assert.equal((await getOwnerVerification(deps, credential)).ok && true, true);
    const result = await submitFollowupAnswer(deps, credential, "At the campus shop");
    assert.deepEqual(result, { ok: true, view: { state: "staff_review" } });
  });

  it("validates the answer and keeps nothing on invalid input", async () => {
    const { memory, deps, credential } = await answered();
    await askFollowup(deps, "verification-1", FOLLOWUP);
    for (const answer of ["", "   ", undefined, 7]) {
      assert.deepEqual(await submitFollowupAnswer(deps, credential, answer), {
        ok: false,
        reason: "invalid_answer",
        message: "Please write an answer.",
      });
    }
    const tooLong = await submitFollowupAnswer(deps, credential, "x".repeat(1001));
    assert.equal(tooLong.ok === false && tooLong.reason, "invalid_answer");
    assert.equal(memory.followupAnswers.length, 0);
  });

  it("does not save an answer when no follow-up was asked or after a decision", async () => {
    const { memory, deps, credential } = await answered();
    const none = await submitFollowupAnswer(deps, credential, "Unasked");
    assert.deepEqual(none, { ok: true, view: { state: "answers_received" } });
    assert.equal(memory.followupAnswers.length, 0);

    await askFollowup(deps, "verification-1", FOLLOWUP);
    await recordDecision(deps, "verification-1", "approved", "");
    const decided = await submitFollowupAnswer(deps, credential, "Too late");
    assert.deepEqual(decided, { ok: true, view: { state: "decided", decision: "approved" } });
    assert.equal(memory.followupAnswers.length, 0);
  });

  it("only the matching private credential can answer", async () => {
    const { memory, deps } = await answered();
    const other = memory.addSubmission("lost-2", "lost");
    const foundCredential = memory.addSubmission("found-1", "found");
    await askFollowup(deps, "verification-1", FOLLOWUP);
    for (const credential of ["", "lost-1", "A".repeat(43), foundCredential, undefined]) {
      assert.deepEqual(await submitFollowupAnswer(deps, credential, "Answer"), {
        ok: false,
        reason: "invalid_link",
      });
    }
    // A different owner has no claim, so nothing is saved against this one.
    const result = await submitFollowupAnswer(deps, other, "Answer");
    assert.equal(result.ok, false);
    assert.equal(memory.followupAnswers.length, 0);
  });

  it("reports save failures without losing the question", async () => {
    const { memory, deps, credential } = await answered();
    await askFollowup(deps, "verification-1", FOLLOWUP);
    memory.failures.add("insertFollowupAnswer");
    assert.deepEqual(await submitFollowupAnswer(deps, credential, "Answer"), {
      ok: false,
      reason: "save_failed",
    });
    memory.failures.delete("insertFollowupAnswer");
    assert.equal((await submitFollowupAnswer(deps, credential, "Answer")).ok, true);
  });

  it("says when the follow-up tables are not set up, and keeps other failures generic", async () => {
    const { memory, deps } = await answered();
    memory.failures.add("insertFollowup");
    assert.equal(await askFollowup(deps, "verification-1", FOLLOWUP), "failed");
    memory.failures.add("missing_table");
    assert.equal(await askFollowup(deps, "verification-1", FOLLOWUP), "not_set_up");
  });
});
