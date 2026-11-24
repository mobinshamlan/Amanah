import { latestDecision } from "@/utils/ownership/supabaseStore";
import type { AdminMessages } from "@/i18n/messages/admin";

// Types and status rules for the staff workspace. Everything here is derived
// from saved rows only; nothing is generated and no AI is called.

export type MatchedReport = {
  item_name: string;
  description: string;
  location: string;
};

export type ReportMatch = {
  id: string;
  lost_report_id: string;
  found_report_id: string;
  explanation: string;
  model: string;
  created_at: string;
  ai_decision: "match" | "insufficient_information";
  supporting_details: string[];
  contradictions: string[];
  missing_information: string[];
  ai_similarity_score: number | null;
  status: "pending_review";
  lost: MatchedReport | null;
  found: MatchedReport | null;
};

export type VerificationAssessment = {
  assessment: "supports" | "unclear" | "conflicts";
  explanation: string;
  model: string;
  created_at: string;
};

// One entry of the append-only decision log. "pending_review" is a reset.
export type DecisionEntry = {
  id: string;
  decision: "approved" | "rejected" | "pending_review";
  note: string | null;
  previous_decision_id: string | null;
  created_at: string;
};

export type Verification = {
  id: string;
  lost_report_id: string;
  report_match_id: string;
  questions: string[];
  expected_details: string[];
  model: string;
  created_at: string;
  answers: { question_number: number; answer: string; created_at: string }[] | null;
  assessment: VerificationAssessment | VerificationAssessment[] | null;
  decisions: DecisionEntry[] | null;
  // The optional staff follow-up; loaded separately, so it is absent until
  // its migration is applied.
  followup?: {
    question: string;
    created_at: string;
    answer: string | null;
    answered_at: string | null;
  } | null;
};

export type Report = {
  id: string;
  report_type: string;
  item_name: string;
  description: string;
  location: string;
  created_at: string;
};

export type Filter = "all" | "lost" | "found";

/** One-to-one embeds may come back as an object or a one-item array. */
export function single<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function byScoreThenNewest(a: ReportMatch, b: ReportMatch) {
  const aScore = a.ai_similarity_score ?? -1;
  const bScore = b.ai_similarity_score ?? -1;
  if (aScore !== bScore) {
    return bScore - aScore;
  }
  return a.created_at < b.created_at ? 1 : -1;
}

/** The current staff decision; null means pending review. */
export function currentDecision(verification: Verification) {
  const decisions = verification.decisions ?? [];
  const latest = latestDecision(decisions);
  const entry = latest ? decisions.find((item) => item.id === latest.id) : undefined;
  return entry && entry.decision !== "pending_review" ? entry : null;
}

export function answeredCount(verification: Verification) {
  return (verification.answers ?? []).length;
}

/** A follow-up question the owner has not answered yet. */
export function followupPending(verification: Verification) {
  return Boolean(verification.followup && verification.followup.answer === null);
}

export function allAnswered(verification: Verification) {
  return (
    verification.questions.length === 0 ||
    answeredCount(verification) >= verification.questions.length
  );
}

/** Undecided, every question and any follow-up answered: staff can decide now. */
export function readyForDecision(verification: Verification) {
  return !currentDecision(verification) && !followupPending(verification) && allAnswered(verification);
}

/** Undecided and still waiting on the owner (a question or a follow-up). */
export function waitingOnOwner(verification: Verification) {
  return !currentDecision(verification) && (!allAnswered(verification) || followupPending(verification));
}

/** When the claim became ready for staff: the last answer, or when questions were prepared. */
export function readySince(verification: Verification) {
  const times = [
    verification.created_at,
    ...(verification.answers ?? []).map((answer) => answer.created_at),
    verification.followup?.answered_at ?? null,
  ].filter((value): value is string => Boolean(value));
  return times.sort().at(-1) ?? verification.created_at;
}

/** Oldest-ready first, so the claim that has waited longest is decided next. */
export function byReadySince(a: Verification, b: Verification) {
  return readySince(a) < readySince(b) ? -1 : 1;
}

/** When the current decision was saved. */
export function decidedAt(verification: Verification) {
  return currentDecision(verification)?.created_at ?? verification.created_at;
}

export function assessmentMissing(verification: Verification) {
  return (
    verification.questions.length > 0 &&
    answeredCount(verification) >= verification.questions.length &&
    single(verification.assessment) === null
  );
}

/** Staff-facing review status, derived only from saved questions, answers and decisions. */
export function reviewStatus(verification: Verification, t: AdminMessages) {
  const decision = currentDecision(verification);
  if (decision) {
    return t.decision[decision.decision];
  }
  if (verification.questions.length === 0) {
    return t.status.staffReviewRequired;
  }
  const answered = answeredCount(verification);
  if (answered < verification.questions.length) {
    return t.status.awaitingAnswer(answered, verification.questions.length);
  }
  if (followupPending(verification)) {
    return t.status.awaitingFollowup;
  }
  return t.status.readyForDecision;
}

/** Owner answer progress only (the decision is shown in the staff decision panel). */
export function answersStatus(verification: Verification, t: AdminMessages) {
  const answered = answeredCount(verification);
  if (verification.questions.length > 0 && answered < verification.questions.length) {
    return t.status.awaitingAnswer(answered, verification.questions.length);
  }
  if (followupPending(verification)) {
    return t.status.awaitingFollowup;
  }
  if (verification.followup) {
    return t.status.followupAnswered;
  }
  return verification.questions.length === 0 ? t.status.noQuestions : t.status.answersReceived;
}

/** Who the claim is waiting on, in words. */
export function waitingOnLabel(verification: Verification, t: AdminMessages) {
  if (currentDecision(verification)) {
    return t.waitingNobody;
  }
  if (!allAnswered(verification)) {
    return t.waitingOwner(answeredCount(verification), verification.questions.length);
  }
  if (followupPending(verification)) {
    return t.waitingOwnerFollowup;
  }
  return t.waitingStaff;
}
