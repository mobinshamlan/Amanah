import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import type { PublicMatchingStatus } from "@/utils/matching/publicStatus";
import { CheckIcon, ClockIcon, InfoIcon, PinIcon, XIcon } from "@/components/icons";
import {
  Eyebrow,
  Notice,
  PageHeading,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/ui";

export type MatchingView =
  | PublicMatchingStatus
  | { phase: "stalled" }
  | { phase: "lost_access" };

/** Where the owner's claim stands, as shown by the ownership verification card. */
export type OwnershipStage =
  | "loading"
  | "question"
  | "retry"
  | "staff_review"
  | "answers_received"
  | "approved"
  | "rejected";

export function statusMessage(
  reportType: "lost" | "found",
  view: MatchingView,
  waiting: boolean,
) {
  if (reportType === "found") {
    switch (view.phase) {
      case "checking":
        return "Report saved. Thank you for reporting this item. Finishing up…";
      case "rate_limited":
        return waiting
          ? "Report saved. Thank you for reporting this item. Automatic processing is paused because the service is busy and will continue in about a minute."
          : "Report saved. Thank you for reporting this item. Automatic processing did not finish because the service is busy. You can try again in a few minutes.";
      case "complete":
        return "Report saved. Thank you for reporting this item.";
      case "stalled":
        return "Report saved. Thank you for reporting this item. Processing is taking longer than expected; refresh the page to continue.";
      case "lost_access":
        return "Report saved. Thank you for reporting this item.";
      default:
        return "Report saved. Thank you for reporting this item. Some automatic processing did not finish. You can try again.";
    }
  }

  if ("outcome" in view && view.outcome === "possible_match") {
    return view.phase === "failed" ||
      view.phase === "unavailable" ||
      view.phase === "rate_limited"
      ? "We found a possible match. Ownership verification is the next step. Some other checks did not finish."
      : "We found a possible match. Ownership verification is the next step.";
  }
  switch (view.phase) {
    case "checking":
      return "Report saved. Checking for possible matches…";
    case "rate_limited":
      return waiting
        ? "Your report is saved. Checking is paused because the matching service is busy and will continue in about a minute if this page stays open. This is not a “no match” result."
        : "Your report is saved, but checking for possible matches did not finish because the matching service is busy. This is not a “no match” result. You can try again in a few minutes.";
    case "complete":
      return "outcome" in view && view.outcome === "uncertain"
        ? "No possible match yet. Your report is saved. We could not tell from the details whether a found item matches, so staff may review it."
        : "No possible match yet. Your report is saved.";
    case "unavailable":
      return "Your report is saved, but automatic matching is not available right now. This is not a “no match” result.";
    case "stalled":
      return "Your report is saved. Checking is taking longer than expected and is not finished. Refresh the page to continue.";
    case "lost_access":
      return "Your report is saved. Its matching status is no longer available on this page.";
    default:
      return "Your report is saved, but checking for possible matches did not finish. This is not a “no match” result. You can try again.";
  }
}

type ConfirmationProps = {
  view: MatchingView;
  isContinuing: boolean;
  canRetry: boolean;
  onRetry: () => void;
  onReportAnother: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
};

function PauseBars() {
  return (
    <span className="flex gap-[3px]">
      <span className="h-2.5 w-[3px] rounded-full bg-forest" />
      <span className="h-2.5 w-[3px] rounded-full bg-forest" />
    </span>
  );
}

type StepState =
  | "done"
  | "active"
  | "paused"
  | "waiting"
  | "stopped"
  | "rejected"
  | "upcoming";

type Step = { state: StepState; label: string; detail: string };

// Read before each step, since the indicators are decorative.
const STEP_STATE_TEXT: Record<StepState, string> = {
  done: "Done",
  active: "In progress",
  paused: "Paused",
  waiting: "Waiting",
  stopped: "Did not finish",
  rejected: "Not verified",
  upcoming: "Not started",
};

function StepIndicator({ state, number }: { state: StepState; number: number }) {
  const base = "flex size-7 shrink-0 items-center justify-center rounded-full";
  switch (state) {
    case "done":
      return (
        <span aria-hidden className={`${base} bg-forest text-primary-foreground`}>
          <CheckIcon className="size-4" />
        </span>
      );
    case "rejected":
      return (
        <span aria-hidden className={`${base} bg-destructive text-primary-foreground`}>
          <XIcon className="size-4" />
        </span>
      );
    case "stopped":
      return (
        <span aria-hidden className={`${base} border-2 border-sage bg-card`}>
          <PauseBars />
        </span>
      );
    case "waiting":
      return (
        <span aria-hidden className={`${base} border-2 border-forest/40 bg-card text-forest`}>
          <ClockIcon className="size-4" />
        </span>
      );
    case "upcoming":
      return (
        <span
          aria-hidden
          className={`${base} border border-border bg-background text-xs font-semibold tabular-nums text-muted-foreground`}
        >
          {number}
        </span>
      );
    default:
      // Active and paused share the calm ring; only active orbits.
      return (
        <span aria-hidden className="relative flex size-7 shrink-0 items-center justify-center">
          <span className="absolute inset-0 rounded-full border-2 border-sage/40" />
          {state === "active" ? (
            <>
              <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-forest motion-safe:animate-orbit motion-reduce:hidden" />
              <span className="size-2 rounded-full bg-forest motion-safe:animate-breathe" />
            </>
          ) : (
            <PauseBars />
          )}
        </span>
      );
  }
}

function matchingStep(view: MatchingView, waiting: boolean): Step {
  if (waiting) {
    if (view.phase === "rate_limited") {
      return {
        state: "paused",
        label: "Checking paused",
        detail:
          "The matching service is busy. Checking continues in about a minute if this page stays open.",
      };
    }
    return {
      state: "active",
      label: "Checking for possible matches",
      detail:
        "outcome" in view && view.outcome === "possible_match"
          ? "A possible match has turned up. Finishing the remaining checks…"
          : "This can take a little while. Please keep this page open.",
    };
  }
  if (view.phase === "complete") {
    return {
      state: "done",
      label: "Check complete",
      detail: "Every found-item report has been checked.",
    };
  }
  return {
    state: "stopped",
    label: "Check did not finish",
    detail:
      view.phase === "lost_access"
        ? "The status of this check is no longer available here."
        : "Not every found-item report was checked.",
  };
}

/** The last two steps, from the ownership state already shown on the page. */
function ownershipSteps(
  view: MatchingView,
  waiting: boolean,
  ownership: OwnershipStage | null | undefined,
): [Step, Step] {
  const decisionUpcoming: Step = {
    state: "upcoming",
    label: "Staff decision",
    detail: "Staff review the claim and decide the next step.",
  };
  const possibleMatch = "outcome" in view && view.outcome === "possible_match";

  if (!possibleMatch || !ownership) {
    return [
      {
        state: "upcoming",
        label: "Ownership questions",
        detail:
          possibleMatch && waiting
            ? "Starts once matching finishes."
            : "Only if a possible match is found: a few neutral questions about your item.",
      },
      decisionUpcoming,
    ];
  }

  const questionsDone = (detail: string): Step => ({
    state: "done",
    label: "Ownership questions",
    detail,
  });

  switch (ownership) {
    case "loading":
      return [
        { state: "active", label: "Ownership questions", detail: "Preparing your questions…" },
        decisionUpcoming,
      ];
    case "question":
      return [
        {
          state: "active",
          label: "Ownership questions",
          detail: "Answer the questions below in your own words.",
        },
        decisionUpcoming,
      ];
    case "retry":
      return [
        {
          state: "stopped",
          label: "Ownership questions",
          detail: "Your questions could not be prepared yet. See below.",
        },
        decisionUpcoming,
      ];
    case "staff_review":
      return [
        questionsDone("No questions are needed for this possible match."),
        { state: "waiting", label: "Staff decision", detail: "Waiting for staff review." },
      ];
    case "answers_received":
      return [
        questionsDone("Your answers were received."),
        { state: "waiting", label: "Staff decision", detail: "Waiting for staff to review your answers." },
      ];
    case "approved":
      return [
        questionsDone("Completed."),
        { state: "done", label: "Staff decision", detail: "Approved for ownership follow-up." },
      ];
    case "rejected":
      return [
        questionsDone("Completed."),
        { state: "rejected", label: "Staff decision", detail: "Staff couldn’t verify this claim." },
      ];
  }
}

function JourneySteps({ steps, busy }: { steps: Step[]; busy: boolean }) {
  const current = steps.findIndex(
    (step) => step.state !== "done" && step.state !== "upcoming",
  );
  return (
    <section
      aria-labelledby="journey-steps-title"
      aria-busy={busy}
      className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
    >
      <Eyebrow>
        <span id="journey-steps-title">Your report’s progress</span>
      </Eyebrow>
      <ol className="mt-4 flex flex-col">
        {steps.map((step, index) => {
          const last = index === steps.length - 1;
          const isCurrent = index === current;
          return (
            <li
              key={step.label + index}
              aria-current={isCurrent ? "step" : undefined}
              className="flex gap-4"
            >
              <div className="flex flex-col items-center pt-2">
                <StepIndicator state={step.state} number={index + 1} />
                {last ? null : (
                  <span
                    aria-hidden
                    className={`my-1.5 min-h-4 w-px flex-1 ${
                      step.state === "done" ? "bg-forest/50" : "bg-border"
                    }`}
                  />
                )}
              </div>
              <div
                className={`mb-2 min-w-0 flex-1 rounded-xl px-3 py-2 ${
                  isCurrent ? "bg-accent" : ""
                }`}
              >
                <p
                  className={`text-base font-medium leading-snug ${
                    step.state === "upcoming" ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  <span className="sr-only">
                    Step {index + 1}, {STEP_STATE_TEXT[step.state]}:{" "}
                  </span>
                  {step.label}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {step.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// Placeholder until the organization provides its real drop-off location.
export const FOUND_DROP_OFF_GUIDANCE =
  "Please take the item to your organization’s designated lost-and-found staff. The exact drop-off location will be added by the organization.";

function foundNote(view: MatchingView, waiting: boolean, canRetry: boolean) {
  if (waiting) {
    return view.phase === "rate_limited"
      ? "Finishing up. Automatic processing is paused because the service is busy and will continue in about a minute if this page stays open."
      : "Finishing up. Please keep this page open for a moment.";
  }
  switch (view.phase) {
    case "complete":
    case "lost_access":
      return null;
    case "stalled":
      return "Some automatic processing is taking longer than expected. Your report is still saved. Refresh the page to continue.";
    case "rate_limited":
      return "Some automatic processing did not finish because the service is busy. Your report is still saved. You can try again in a few minutes.";
    default:
      return canRetry
        ? "Some automatic processing did not finish. Your report is still saved. You can try again."
        : "Some automatic processing did not finish. Your report is still saved.";
  }
}

export function FoundConfirmation({
  view,
  isContinuing,
  canRetry,
  onRetry,
  onReportAnother,
  headingRef,
}: ConfirmationProps) {
  const note = foundNote(view, isContinuing, canRetry);

  return (
    <>
      <PageHeading
        eyebrow="Report saved"
        saved
        title="Found report saved"
        intro="Thank you for reporting this item. It has been saved so it can be returned to its owner safely."
        headingRef={headingRef}
      />

      <section
        aria-labelledby="drop-off-title"
        className="mt-8 rounded-2xl border border-forest/30 bg-accent p-5 motion-safe:animate-rise sm:p-6"
      >
        <div className="flex items-start gap-3">
          <PinIcon className="mt-1 size-5 shrink-0 text-forest" />
          <div>
            <h2
              id="drop-off-title"
              className="font-serif text-2xl font-semibold leading-tight tracking-tight text-pine sm:text-[1.75rem]"
            >
              Next step: hand in the item
            </h2>
            <p className="mt-2 text-base leading-relaxed text-foreground">
              {FOUND_DROP_OFF_GUIDANCE}
            </p>
          </div>
        </div>
      </section>

      {note ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 motion-safe:animate-rise sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {isContinuing ? (
              <span
                aria-hidden
                className="mt-1.5 size-2 shrink-0 rounded-full bg-forest motion-safe:animate-breathe"
              />
            ) : (
              <InfoIcon className="mt-0.5 size-5 shrink-0 text-forest" />
            )}
            <p className="text-sm leading-relaxed text-muted-foreground">{note}</p>
          </div>
          {canRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className={`${secondaryButtonClassName} text-sm sm:px-4`}
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}

      {!isContinuing ? (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onReportAnother} className={primaryButtonClassName}>
            Report another found item
          </button>
          <Link href="/" className={secondaryButtonClassName}>
            Back to home
          </Link>
        </div>
      ) : null}
    </>
  );
}

type LostResult = {
  tone: "match" | "neutral" | "notice";
  title: string;
  body: string[];
  aiNote?: boolean;
};

const NOT_NO_MATCH = "This is not a “no match” result.";

function lostResult(view: MatchingView, canRetry: boolean): LostResult {
  if ("outcome" in view && view.outcome === "possible_match") {
    const partial =
      view.phase === "failed" ||
      view.phase === "unavailable" ||
      view.phase === "rate_limited";
    return {
      tone: "match",
      title: "Possible match found",
      body: [
        "A found-item report may describe your item. Ownership verification is the next step.",
        ...(partial ? ["Some other checks did not finish."] : []),
      ],
      aiNote: true,
    };
  }
  switch (view.phase) {
    case "complete":
      return "outcome" in view && view.outcome === "uncertain"
        ? {
            tone: "neutral",
            title: "No possible match yet",
            body: [
              "We could not tell from the details whether a found item matches, so staff may review it. Your report stays saved.",
            ],
          }
        : {
            tone: "neutral",
            title: "No possible match yet",
            body: [
              "None of the found-item reports so far look like a match. Your report stays saved.",
            ],
          };
    case "rate_limited":
      return {
        tone: "notice",
        title: "Matching needs attention",
        body: [
          `Your report is still saved, but checking did not finish because the matching service is busy. ${NOT_NO_MATCH}`,
          "You can try again in a few minutes.",
        ],
      };
    case "unavailable":
      return {
        tone: "notice",
        title: "Matching needs attention",
        body: [
          `Your report is still saved, but automatic matching is not available right now. ${NOT_NO_MATCH}`,
          ...(canRetry ? ["You can try again."] : []),
        ],
      };
    case "stalled":
      return {
        tone: "notice",
        title: "Matching needs attention",
        body: [
          `Your report is still saved. Checking is taking longer than expected and is not finished. ${NOT_NO_MATCH}`,
          "Refresh the page to continue.",
        ],
      };
    case "lost_access":
      return {
        tone: "neutral",
        title: "Status no longer available",
        body: [
          "Your report is still saved. Its matching status is no longer available on this page.",
        ],
      };
    default:
      return {
        tone: "notice",
        title: "Matching needs attention",
        body: [
          `Your report is still saved, but checking for possible matches did not finish. ${NOT_NO_MATCH}`,
          ...(canRetry ? ["You can try again."] : []),
        ],
      };
  }
}

const resultToneClassName: Record<LostResult["tone"], string> = {
  match: "border-forest/30 bg-accent",
  neutral: "border-border bg-card shadow-card",
  notice: "border-sage/60 bg-card",
};

const resultEyebrow: Record<LostResult["tone"], string> = {
  match: "Matching result",
  neutral: "Matching result",
  notice: "Matching status",
};

export function LostConfirmation({
  eyebrow,
  saved = false,
  title,
  intro,
  ownership,
  children,
  view,
  isContinuing,
  canRetry,
  onRetry,
  onReportAnother,
  headingRef,
}: ConfirmationProps & {
  eyebrow: string;
  saved?: boolean;
  title: string;
  intro: ReactNode;
  // Ownership state from the verification card; undefined where it is not shown.
  ownership?: OwnershipStage | null;
  // Shown below the result, e.g. ownership questions and the tracking link.
  children?: ReactNode;
}) {
  const result = isContinuing ? null : lostResult(view, canRetry);
  const steps: Step[] = [
    { state: "done", label: "Report saved", detail: "Your details are stored privately." },
    matchingStep(view, isContinuing),
    ...ownershipSteps(view, isContinuing, ownership),
  ];

  return (
    <>
      <PageHeading
        eyebrow={eyebrow}
        saved={saved}
        title={title}
        intro={intro}
        headingRef={headingRef}
      />

      <JourneySteps steps={steps} busy={isContinuing} />

      {result ? (
        <section
          aria-labelledby="matching-result-title"
          className={`mt-4 rounded-2xl border p-5 motion-safe:animate-rise sm:p-6 ${resultToneClassName[result.tone]}`}
        >
          <Eyebrow tone={result.tone === "notice" ? "clay" : "pine"}>
            {resultEyebrow[result.tone]}
          </Eyebrow>
          <h2
            id="matching-result-title"
            className={`mt-3 font-serif text-2xl font-semibold leading-tight tracking-tight sm:text-[1.75rem] ${
              result.tone === "match" ? "text-pine" : "text-foreground"
            }`}
          >
            {result.title}
          </h2>
          {result.body.map((paragraph) => (
            <p key={paragraph} className="mt-2 text-base leading-relaxed text-foreground">
              {paragraph}
            </p>
          ))}
          {result.aiNote ? (
            <Notice className="mt-4 border-forest/20 bg-background/70">
              <span className="font-normal">
                This is an AI suggestion. It does not confirm that the item is
                yours, and nothing is returned until ownership is verified.
              </span>
            </Notice>
          ) : null}
        </section>
      ) : null}

      {children}

      {!isContinuing ? (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {canRetry ? (
            <button type="button" onClick={onRetry} className={primaryButtonClassName}>
              Try again
            </button>
          ) : null}
          <button
            type="button"
            onClick={onReportAnother}
            className={canRetry ? secondaryButtonClassName : primaryButtonClassName}
          >
            Report another lost item
          </button>
        </div>
      ) : null}
    </>
  );
}
