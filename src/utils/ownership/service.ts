import {
  GeminiApiError,
  GeminiConfigError,
  type ReportComparisonInput,
} from "@/utils/gemini/compareReports";
import {
  OWNER_ANSWER_MAX,
  type AnsweredQuestion,
  type OwnershipAssessment,
  type OwnershipAssessmentValue,
  type ParsedOwnershipQuestions,
} from "@/utils/gemini/ownershipVerification";
import {
  hashSubmissionCredential,
  isSubmissionCredential,
} from "@/utils/matching/submissionCredential";

// Server-only. Ownership verification for a lost report's highest-ranked "match"
// suggestion. The owner is authorized only by their private submission credential
// and only ever receives an OwnerVerificationView: no found-report text, expected
// details, scores, or AI assessment. Nothing here approves or rejects a match.

export type OwnershipDecisionValue = "approved" | "rejected";
// Staff decisions are an append-only log; "pending_review" resets a decision.
export type DecisionLogValue = OwnershipDecisionValue | "pending_review";

export type VerificationRecord = {
  id: string;
  lostReportId: string;
  reportMatchId: string;
  questions: string[];
  expectedDetails: string[];
  // Sorted by question number.
  answers: { questionNumber: number; answer: string }[];
  assessment: { assessment: OwnershipAssessmentValue; explanation: string } | null;
  // Newest decision-log entry, or null when staff have never decided.
  latestDecision: { id: string; decision: DecisionLogValue } | null;
  // The one optional staff follow-up question, and the owner's answer once given.
  followup: { question: string; answer: string | null } | null;
};

export type MatchReports = {
  matchId: string;
  lost: ReportComparisonInput;
  found: ReportComparisonInput;
};

export type InsertOutcome = "saved" | "duplicate";

export class OwnershipStoreError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "OwnershipStoreError";
    this.code = code;
  }

  // The migration has not been applied yet.
  get isMissingTable() {
    return this.code === "PGRST205" || this.code === "42P01";
  }
}

/** Database access. Methods throw OwnershipStoreError when a request fails. */
export type OwnershipStore = {
  findSubmissionReport(
    tokenHash: string,
  ): Promise<{ reportId: string; reportType: string } | null>;
  findVerificationByLostReport(lostReportId: string): Promise<VerificationRecord | null>;
  findVerificationById(id: string): Promise<VerificationRecord | null>;
  // Highest AI similarity first (unscored last), then newest; ai_decision "match" only.
  findTopMatch(lostReportId: string): Promise<MatchReports | null>;
  findMatchReports(matchId: string): Promise<MatchReports | null>;
  insertVerification(row: {
    lostReportId: string;
    reportMatchId: string;
    questions: string[];
    expectedDetails: string[];
    model: string;
  }): Promise<InsertOutcome>;
  insertAnswer(row: {
    verificationId: string;
    questionNumber: number;
    answer: string;
  }): Promise<InsertOutcome>;
  insertAssessment(row: {
    verificationId: string;
    assessment: OwnershipAssessmentValue;
    explanation: string;
    model: string;
  }): Promise<InsertOutcome>;
  // "duplicate": this claim already has a follow-up question.
  insertFollowup(row: { verificationId: string; question: string }): Promise<InsertOutcome>;
  // "duplicate": the follow-up was already answered.
  insertFollowupAnswer(row: { verificationId: string; answer: string }): Promise<InsertOutcome>;
  // "duplicate" means another staff action was logged after previousDecisionId.
  insertDecision(row: {
    verificationId: string;
    decision: DecisionLogValue;
    note: string | null;
    previousDecisionId: string | null;
    previousDecision: DecisionLogValue | null;
  }): Promise<InsertOutcome>;
};

export type OwnershipAi = {
  model: string;
  generateQuestions(
    lost: ReportComparisonInput,
    found: ReportComparisonInput,
  ): Promise<ParsedOwnershipQuestions>;
  assessAnswers(
    lost: ReportComparisonInput,
    found: ReportComparisonInput,
    answers: AnsweredQuestion[],
  ): Promise<OwnershipAssessment>;
};

type Logger = Pick<Console, "info" | "error">;

export type OwnershipDeps = {
  store: OwnershipStore;
  ai: OwnershipAi;
  // Log lines contain only states, counts, and error kinds, never report text or answers.
  logger?: Logger;
};

export type RetryReason = "busy" | "failed" | "unavailable";

/** Everything the owner may learn about verification. */
export type OwnerVerificationView =
  | { state: "not_needed" }
  | { state: "question"; number: number; total: number; question: string }
  // A staff follow-up question: only the question text, never staff notes.
  | { state: "followup"; question: string }
  | { state: "staff_review" }
  | { state: "answers_received" }
  | { state: "decided"; decision: OwnershipDecisionValue }
  | { state: "retry"; reason: RetryReason };

export type OwnerVerificationResult =
  | { ok: true; view: OwnerVerificationView }
  | { ok: false };

export type SubmitAnswerResult =
  | { ok: true; view: OwnerVerificationView }
  | { ok: false; reason: "invalid_link" }
  | { ok: false; reason: "invalid_answer"; message: string }
  | { ok: false; reason: "save_failed" };

export type AssessmentAttempt = "saved" | "already_assessed" | "not_ready" | RetryReason;

function failureReason(error: unknown): RetryReason {
  if (error instanceof GeminiConfigError) {
    return "unavailable";
  }
  if (error instanceof OwnershipStoreError && error.isMissingTable) {
    return "unavailable";
  }
  if (error instanceof GeminiApiError && error.isQuota) {
    return "busy";
  }
  return "failed";
}

function errorKind(error: unknown) {
  if (error instanceof OwnershipStoreError) {
    return `store:${error.code ?? "unknown"}`;
  }
  return error instanceof Error ? error.name : "unknown";
}

/** The current staff decision; null means pending review. */
export function currentDecision(record: VerificationRecord): OwnershipDecisionValue | null {
  const latest = record.latestDecision?.decision;
  return latest === "approved" || latest === "rejected" ? latest : null;
}

export function ownerView(record: VerificationRecord): OwnerVerificationView {
  const decision = currentDecision(record);
  if (decision) {
    return { state: "decided", decision };
  }
  // The original questions come first; a follow-up is asked after them.
  const next = record.answers.length;
  if (next < record.questions.length) {
    return {
      state: "question",
      number: next + 1,
      total: record.questions.length,
      question: record.questions[next],
    };
  }
  if (record.followup && record.followup.answer === null) {
    return { state: "followup", question: record.followup.question };
  }
  return record.questions.length === 0 ? { state: "staff_review" } : { state: "answers_received" };
}

/** Returns the lost report this credential belongs to, or null. */
async function authorizeLostReport(store: OwnershipStore, credential: unknown) {
  if (!isSubmissionCredential(credential)) {
    return null;
  }
  const submission = await store.findSubmissionReport(hashSubmissionCredential(credential));
  if (!submission || submission.reportType !== "lost") {
    return null;
  }
  return submission.reportId;
}

/**
 * Loads the owner's verification, creating it on first visit from the
 * highest-ranked "match" suggestion. Failures return a retry state and never
 * change the report or its suggestions.
 */
export async function getOwnerVerification(
  { store, ai, logger = console }: OwnershipDeps,
  credential: unknown,
): Promise<OwnerVerificationResult> {
  let lostReportId: string | null;
  try {
    lostReportId = await authorizeLostReport(store, credential);
  } catch (error) {
    logger.error("Ownership: failed to check credential:", errorKind(error));
    return { ok: true, view: { state: "retry", reason: failureReason(error) } };
  }
  if (!lostReportId) {
    return { ok: false };
  }

  try {
    const existing = await store.findVerificationByLostReport(lostReportId);
    if (existing) {
      return { ok: true, view: ownerView(existing) };
    }

    const match = await store.findTopMatch(lostReportId);
    if (!match) {
      return { ok: true, view: { state: "not_needed" } };
    }

    let parsed: ParsedOwnershipQuestions;
    try {
      parsed = await ai.generateQuestions(match.lost, match.found);
    } catch (error) {
      logger.error("Ownership: question generation failed:", errorKind(error));
      return { ok: true, view: { state: "retry", reason: failureReason(error) } };
    }
    logger.info(
      `Ownership: questions prepared kept=${parsed.questions.length} dropped=${parsed.dropped.join(",") || "none"}`,
    );

    // A duplicate means another request created it first; use that one.
    await store.insertVerification({
      lostReportId,
      reportMatchId: match.matchId,
      questions: parsed.questions.map((item) => item.question),
      expectedDetails: parsed.questions.map((item) => item.expectedDetail),
      model: ai.model,
    });
    const created = await store.findVerificationByLostReport(lostReportId);
    if (!created) {
      return { ok: true, view: { state: "retry", reason: "failed" } };
    }
    return { ok: true, view: ownerView(created) };
  } catch (error) {
    logger.error("Ownership: failed to load or save verification:", errorKind(error));
    return { ok: true, view: { state: "retry", reason: failureReason(error) } };
  }
}

/**
 * Runs the AI assessment once every question is answered. The result is a
 * recommendation for staff and is only ever inserted, never used to decide.
 */
export async function assessVerification(
  { store, ai, logger = console }: OwnershipDeps,
  record: VerificationRecord,
): Promise<AssessmentAttempt> {
  if (record.assessment) {
    return "already_assessed";
  }
  if (record.questions.length === 0 || record.answers.length < record.questions.length) {
    return "not_ready";
  }
  try {
    const reports = await store.findMatchReports(record.reportMatchId);
    if (!reports) {
      return "failed";
    }
    const answers = record.questions.map((question, index) => ({
      question,
      expectedDetail: record.expectedDetails[index],
      answer: record.answers.find((item) => item.questionNumber === index + 1)?.answer ?? "",
    }));
    const result = await ai.assessAnswers(reports.lost, reports.found, answers);
    const outcome = await store.insertAssessment({
      verificationId: record.id,
      assessment: result.assessment,
      explanation: result.explanation,
      model: ai.model,
    });
    logger.info(`Ownership: assessment ${outcome} value=${result.assessment}`);
    return outcome === "saved" ? "saved" : "already_assessed";
  } catch (error) {
    logger.error("Ownership: assessment failed:", errorKind(error));
    return failureReason(error);
  }
}

/**
 * Saves one answer, only for the next unanswered question. After the last
 * answer, tries the AI assessment; if that fails the answers stay saved and
 * staff can retry it.
 */
export async function submitOwnerAnswer(
  deps: OwnershipDeps,
  credential: unknown,
  questionNumber: unknown,
  answer: unknown,
): Promise<SubmitAnswerResult> {
  const { store, logger = console } = deps;
  const text = typeof answer === "string" ? answer.trim() : "";
  if (!text) {
    return { ok: false, reason: "invalid_answer", message: "Please write an answer." };
  }
  if (text.length > OWNER_ANSWER_MAX) {
    return {
      ok: false,
      reason: "invalid_answer",
      message: `Please keep your answer under ${OWNER_ANSWER_MAX} characters.`,
    };
  }

  let lostReportId: string | null;
  try {
    lostReportId = await authorizeLostReport(store, credential);
  } catch (error) {
    logger.error("Ownership: failed to check credential:", errorKind(error));
    return { ok: false, reason: "save_failed" };
  }
  if (!lostReportId) {
    return { ok: false, reason: "invalid_link" };
  }

  let record: VerificationRecord | null;
  try {
    record = await store.findVerificationByLostReport(lostReportId);
  } catch (error) {
    logger.error("Ownership: failed to load verification:", errorKind(error));
    return { ok: false, reason: "save_failed" };
  }
  if (!record) {
    return { ok: false, reason: "save_failed" };
  }

  const view = ownerView(record);
  // Already answered (for example in another tab), decided, or not a question:
  // show the current state instead of saving.
  if (view.state !== "question" || questionNumber !== view.number) {
    return { ok: true, view };
  }

  try {
    await store.insertAnswer({
      verificationId: record.id,
      questionNumber: view.number,
      answer: text,
    });
    record = await store.findVerificationByLostReport(lostReportId);
  } catch (error) {
    logger.error("Ownership: failed to save answer:", errorKind(error));
    return { ok: false, reason: "save_failed" };
  }
  if (!record) {
    return { ok: false, reason: "save_failed" };
  }

  if (record.answers.length === record.questions.length) {
    await assessVerification(deps, record);
  }
  return { ok: true, view: ownerView(record) };
}

/** Staff retry of a missing AI assessment (local admin only). */
export async function retryAssessment(
  deps: OwnershipDeps,
  verificationId: string,
): Promise<AssessmentAttempt> {
  try {
    const record = await deps.store.findVerificationById(verificationId);
    if (!record) {
      return "failed";
    }
    return await assessVerification(deps, record);
  } catch (error) {
    (deps.logger ?? console).error("Ownership: failed to load verification:", errorKind(error));
    return failureReason(error);
  }
}

export const FOLLOWUP_QUESTION_MAX = 500;

export type FollowupResult =
  | "saved"
  | "invalid"
  | "already_asked"
  | "already_decided"
  | "not_set_up"
  | "failed";

/**
 * Staff asks one optional follow-up question on a claim with no current
 * decision. It is plain text written by staff: no AI is involved, and asking
 * never approves or rejects anything. At most one per claim.
 */
export async function askFollowup(
  { store, logger = console }: OwnershipDeps,
  verificationId: string,
  question: unknown,
): Promise<FollowupResult> {
  const text = typeof question === "string" ? question.trim() : "";
  if (!text || text.length > FOLLOWUP_QUESTION_MAX) {
    return "invalid";
  }
  try {
    const record = await store.findVerificationById(verificationId);
    if (!record) {
      return "failed";
    }
    if (currentDecision(record)) {
      return "already_decided";
    }
    if (record.followup) {
      return "already_asked";
    }
    const outcome = await store.insertFollowup({ verificationId, question: text });
    logger.info(`Ownership: follow-up ${outcome}`);
    return outcome === "saved" ? "saved" : "already_asked";
  } catch (error) {
    logger.error("Ownership: failed to save follow-up:", errorKind(error));
    return error instanceof OwnershipStoreError && error.isMissingTable ? "not_set_up" : "failed";
  }
}

/**
 * Saves the owner's one answer to a staff follow-up, authorized by their
 * private credential. It only saves the answer: no assessment, no decision.
 */
export async function submitFollowupAnswer(
  { store, logger = console }: OwnershipDeps,
  credential: unknown,
  answer: unknown,
): Promise<SubmitAnswerResult> {
  const text = typeof answer === "string" ? answer.trim() : "";
  if (!text) {
    return { ok: false, reason: "invalid_answer", message: "Please write an answer." };
  }
  if (text.length > OWNER_ANSWER_MAX) {
    return {
      ok: false,
      reason: "invalid_answer",
      message: `Please keep your answer under ${OWNER_ANSWER_MAX} characters.`,
    };
  }

  let lostReportId: string | null;
  try {
    lostReportId = await authorizeLostReport(store, credential);
  } catch (error) {
    logger.error("Ownership: failed to check credential:", errorKind(error));
    return { ok: false, reason: "save_failed" };
  }
  if (!lostReportId) {
    return { ok: false, reason: "invalid_link" };
  }

  try {
    let record = await store.findVerificationByLostReport(lostReportId);
    if (!record) {
      return { ok: false, reason: "save_failed" };
    }
    // Only while a follow-up is waiting for its answer. Otherwise (already
    // answered, decided, or never asked) show the current state instead.
    if (ownerView(record).state !== "followup") {
      return { ok: true, view: ownerView(record) };
    }
    await store.insertFollowupAnswer({ verificationId: record.id, answer: text });
    record = await store.findVerificationByLostReport(lostReportId);
    if (!record) {
      return { ok: false, reason: "save_failed" };
    }
    return { ok: true, view: ownerView(record) };
  } catch (error) {
    logger.error("Ownership: failed to save follow-up answer:", errorKind(error));
    return { ok: false, reason: "save_failed" };
  }
}

export const DECISION_NOTE_MAX = 1000;

export type DecisionResult =
  | "saved"
  | "already_decided"
  | "not_decided"
  | "changed"
  | "invalid"
  | "failed";

function validNote(note: unknown) {
  const text = typeof note === "string" ? note.trim() : "";
  return text.length > DECISION_NOTE_MAX ? null : text;
}

/**
 * Appends one staff action to the decision log, after the current newest
 * entry. If another action was logged first, nothing is saved ("changed").
 */
async function appendDecision(
  { store, logger = console }: OwnershipDeps,
  verificationId: string,
  decision: DecisionLogValue,
  note: string,
): Promise<DecisionResult> {
  try {
    const record = await store.findVerificationById(verificationId);
    if (!record) {
      return "failed";
    }
    const current = currentDecision(record);
    if (decision === "pending_review" ? !current : current) {
      return decision === "pending_review" ? "not_decided" : "already_decided";
    }
    const outcome = await store.insertDecision({
      verificationId,
      decision,
      note: note || null,
      previousDecisionId: record.latestDecision?.id ?? null,
      previousDecision: record.latestDecision?.decision ?? null,
    });
    logger.info(`Ownership: decision ${decision} ${outcome}`);
    return outcome === "saved" ? "saved" : "changed";
  } catch (error) {
    logger.error("Ownership: failed to save decision:", errorKind(error));
    return "failed";
  }
}

/**
 * Records a staff decision while the claim is pending review. It never
 * triggers an item return, and staff can reset it to pending review.
 */
export async function recordDecision(
  deps: OwnershipDeps,
  verificationId: string,
  decision: unknown,
  note: unknown,
): Promise<DecisionResult> {
  const noteText = validNote(note);
  if ((decision !== "approved" && decision !== "rejected") || noteText === null) {
    return "invalid";
  }
  return appendDecision(deps, verificationId, decision, noteText);
}

/**
 * Resets an approved or rejected decision back to pending review. The earlier
 * decision stays in the log.
 */
export async function resetDecision(
  deps: OwnershipDeps,
  verificationId: string,
  note: unknown,
): Promise<DecisionResult> {
  const noteText = validNote(note);
  if (noteText === null) {
    return "invalid";
  }
  return appendDecision(deps, verificationId, "pending_review", noteText);
}
