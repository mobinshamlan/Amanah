import type { MatchingView, OwnershipStage } from "@/app/report/SubmissionConfirmation";
import type { TrackMessages } from "@/i18n/messages/track";

// The report's four stages, and where each one stands. Every state has words
// (`t.steps.state`), so the progress never relies on colour alone.

function isPossibleMatch(view: MatchingView) {
  return "outcome" in view && view.outcome === "possible_match";
}

export type StepState = "done" | "active" | "paused" | "waiting" | "stopped" | "rejected" | "upcoming";

export type Step = { key: string; state: StepState; label: string; detail: string };

function matchingStep(t: TrackMessages, view: MatchingView, waiting: boolean): Step {
  const d = t.steps.detail;
  const label = t.steps.labels.matching;
  if (waiting) {
    if (view.phase === "rate_limited") {
      return { key: "matching", state: "paused", label, detail: d.matchingPaused };
    }
    return {
      key: "matching",
      state: "active",
      label,
      detail: isPossibleMatch(view) ? d.matchingActiveMatch : d.matchingActive,
    };
  }
  if (view.phase === "complete") {
    return { key: "matching", state: "done", label, detail: d.matchingDone };
  }
  return {
    key: "matching",
    state: "stopped",
    label,
    detail: view.phase === "lost_access" ? d.matchingLostAccess : d.matchingStopped,
  };
}

function ownershipSteps(
  t: TrackMessages,
  view: MatchingView,
  waiting: boolean,
  ownership: OwnershipStage | null | undefined,
): [Step, Step] {
  const d = t.steps.detail;
  const q = t.steps.labels.questions;
  const dec = t.steps.labels.decision;
  const decisionUpcoming: Step = { key: "decision", state: "upcoming", label: dec, detail: d.decisionUpcoming };
  const possible = isPossibleMatch(view);

  if (!possible || !ownership) {
    return [
      {
        key: "questions",
        state: "upcoming",
        label: q,
        detail: possible && waiting ? d.questionsAfterMatch : d.questionsUpcoming,
      },
      decisionUpcoming,
    ];
  }
  const questionsDone = (detail: string): Step => ({ key: "questions", state: "done", label: q, detail });
  switch (ownership) {
    case "loading":
      return [{ key: "questions", state: "active", label: q, detail: d.questionsLoading }, decisionUpcoming];
    case "question":
      return [{ key: "questions", state: "active", label: q, detail: d.questionsActive }, decisionUpcoming];
    case "followup":
      return [{ key: "questions", state: "active", label: q, detail: d.questionsFollowup }, decisionUpcoming];
    case "retry":
      return [{ key: "questions", state: "stopped", label: q, detail: d.questionsRetry }, decisionUpcoming];
    case "staff_review":
      return [
        questionsDone(d.questionsNoneNeeded),
        { key: "decision", state: "waiting", label: dec, detail: d.decisionWaiting },
      ];
    case "answers_received":
      return [
        questionsDone(d.questionsAnswered),
        { key: "decision", state: "waiting", label: dec, detail: d.decisionWaitingAnswers },
      ];
    case "approved":
      return [
        questionsDone(d.questionsCompleted),
        { key: "decision", state: "done", label: dec, detail: d.decisionApproved },
      ];
    case "rejected":
      return [
        questionsDone(d.questionsCompleted),
        { key: "decision", state: "rejected", label: dec, detail: d.decisionRejected },
      ];
  }
}

export function buildSteps(
  t: TrackMessages,
  view: MatchingView,
  waiting: boolean,
  ownership?: OwnershipStage | null,
): Step[] {
  return [
    { key: "saved", state: "done", label: t.steps.labels.saved, detail: t.steps.detail.saved },
    matchingStep(t, view, waiting),
    ...ownershipSteps(t, view, waiting, ownership),
  ];
}
