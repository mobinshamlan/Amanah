import type { MatchingView, OwnershipStage } from "@/app/report/SubmissionConfirmation";
import type { TrackMessages } from "@/i18n/messages/track";

// The report's four stages, and where each one stands. Every state has words
// (`t.steps.state`), so the progress never relies on colour alone.

function isPossibleMatch(view: MatchingView) {
  return "outcome" in view && view.outcome === "possible_match";
}

// "conditional": a stage that happens only if there is a possible match, so
// the page never implies it is coming. "approved": the decision, approved.
export type StepState =
  | "done"
  | "active"
  | "paused"
  | "waiting"
  | "stopped"
  | "rejected"
  | "approved"
  | "upcoming"
  | "conditional";

// `short`: a shorter name for narrow screens; the full label stays readable to screen readers.
export type Step = { key: string; state: StepState; label: string; short?: string; detail: string };

function matchingStep(t: TrackMessages, view: MatchingView, waiting: boolean): Step {
  const d = t.steps.detail;
  const label = t.steps.labels.matching;
  const short = t.steps.short.matching;
  if (waiting) {
    if (view.phase === "rate_limited") {
      return { key: "matching", state: "paused", label, short, detail: d.matchingPaused };
    }
    return {
      key: "matching",
      state: "active",
      label,
      short,
      detail: isPossibleMatch(view) ? d.matchingActiveMatch : d.matchingActive,
    };
  }
  if (view.phase === "complete") {
    return { key: "matching", state: "done", label, short, detail: d.matchingDone };
  }
  return {
    key: "matching",
    state: "stopped",
    label,
    short,
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
  const q = { label: t.steps.labels.questions, short: t.steps.short.questions };
  const dec = { label: t.steps.labels.decision, short: t.steps.short.decision };
  const decisionUpcoming: Step = { key: "decision", state: "upcoming", ...dec, detail: d.decisionUpcoming };
  const possible = isPossibleMatch(view);

  if (!possible) {
    // Without a possible match nothing is asked or decided: both stages only if one turns up.
    return [
      { key: "questions", state: "conditional", ...q, detail: d.questionsUpcoming },
      { key: "decision", state: "conditional", ...dec, detail: d.questionsUpcoming },
    ];
  }
  if (!ownership) {
    return [
      {
        key: "questions",
        state: "upcoming",
        ...q,
        detail: waiting ? d.questionsAfterMatch : d.questionsUpcoming,
      },
      decisionUpcoming,
    ];
  }
  const questionsDone = (detail: string): Step => ({ key: "questions", state: "done", ...q, detail });
  switch (ownership) {
    case "loading":
      return [{ key: "questions", state: "active", ...q, detail: d.questionsLoading }, decisionUpcoming];
    case "question":
      return [{ key: "questions", state: "active", ...q, detail: d.questionsActive }, decisionUpcoming];
    case "followup":
      return [{ key: "questions", state: "active", ...q, detail: d.questionsFollowup }, decisionUpcoming];
    case "retry":
      return [{ key: "questions", state: "stopped", ...q, detail: d.questionsRetry }, decisionUpcoming];
    case "staff_review":
      return [
        questionsDone(d.questionsNoneNeeded),
        { key: "decision", state: "waiting", ...dec, detail: d.decisionWaiting },
      ];
    case "answers_received":
      return [
        questionsDone(d.questionsAnswered),
        { key: "decision", state: "waiting", ...dec, detail: d.decisionWaitingAnswers },
      ];
    case "approved":
      return [
        questionsDone(d.questionsCompleted),
        { key: "decision", state: "approved", ...dec, detail: d.decisionApproved },
      ];
    case "rejected":
      return [
        questionsDone(d.questionsCompleted),
        { key: "decision", state: "rejected", ...dec, detail: d.decisionRejected },
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
    { key: "saved", state: "done", label: t.steps.labels.saved, short: t.steps.short.saved, detail: t.steps.detail.saved },
    matchingStep(t, view, waiting),
    ...ownershipSteps(t, view, waiting, ownership),
  ];
}

/** The stage in progress, or with nothing in progress, the last one done. */
export function currentStepIndex(steps: Pick<Step, "state">[]) {
  const index = steps.findIndex(
    (step) => step.state !== "done" && step.state !== "upcoming" && step.state !== "conditional",
  );
  if (index !== -1) return index;
  return Math.max(0, steps.findLastIndex((step) => step.state === "done"));
}
