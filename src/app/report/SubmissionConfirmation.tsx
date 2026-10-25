import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import type { PublicMatchingStatus } from "@/utils/matching/publicStatus";
import { CheckIcon, ClockIcon, InfoIcon, KeyholeGlyph, PinIcon, XIcon } from "@/components/icons";
import {
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
  | "followup"
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
  // Opaque fills, so the progress line passes behind a node and never through
  // it. One short pop when a node's state changes; nothing loops.
  const base =
    "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full motion-safe:animate-pop";
  switch (state) {
    case "done":
      return (
        <span aria-hidden className={`${base} bg-forest text-primary-foreground`}>
          <CheckIcon className="size-5" />
        </span>
      );
    case "rejected":
      return (
        <span aria-hidden className={`${base} bg-destructive text-primary-foreground`}>
          <XIcon className="size-5" />
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
        <span aria-hidden className={`${base} border-2 border-forest bg-card text-forest`}>
          <ClockIcon className="size-5" />
        </span>
      );
    case "upcoming":
      return (
        <span
          aria-hidden
          className={`${base} border border-foreground/25 bg-card text-sm font-semibold tabular-nums text-muted-foreground`}
        >
          {number}
        </span>
      );
    default:
      // In progress and paused: a forest ring with a dot, or pause bars.
      return (
        <span aria-hidden className={`${base} border-2 border-forest bg-card`}>
          {state === "active" ? <span className="size-3 rounded-full bg-forest" /> : <PauseBars />}
        </span>
      );
  }
}

function matchingStep(view: MatchingView, waiting: boolean): Step {
  if (waiting) {
    if (view.phase === "rate_limited") {
      return {
        state: "paused",
        label: "Matching",
        detail:
          "The matching service is busy. Checking continues in about a minute if this page stays open.",
      };
    }
    return {
      state: "active",
      label: "Matching",
      detail:
        "outcome" in view && view.outcome === "possible_match"
          ? "A possible match has turned up. Finishing the remaining checks…"
          : "This can take a little while. Please keep this page open.",
    };
  }
  if (view.phase === "complete") {
    return {
      state: "done",
      label: "Matching",
      detail: "Every found-item report has been checked.",
    };
  }
  return {
    state: "stopped",
    label: "Matching",
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
    case "followup":
      return [
        {
          state: "active",
          label: "Ownership questions",
          detail: "Staff have one more question for you.",
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
  // The line is filled up to the furthest step that has started.
  const reached = steps.reduce((last, step, index) => (step.state === "upcoming" ? last : index), 0);
  const problem = steps[reached]?.state === "rejected" && reached > 0;
  const goodFill = (problem ? reached - 1 : reached) / (steps.length - 1);

  // Four columns at every width: short labels wrap under their node. The track
  // runs from the first node's centre to the last node's centre.
  return (
    <section
      aria-labelledby="journey-steps-title"
      aria-busy={busy}
      className="mt-8 rounded-[1.75rem] bg-card px-4 py-6 sm:px-10 sm:py-8"
    >
      <h2 id="journey-steps-title" className="sr-only">
        Your report’s progress
      </h2>
      <div className="relative">
        <span
          aria-hidden
          className="absolute left-[12.5%] right-[12.5%] top-[1.125rem] h-1 rounded-full bg-secondary"
        />
        <span
          aria-hidden
          style={{ "--fill": goodFill } as React.CSSProperties}
          className="absolute left-[12.5%] right-[12.5%] top-[1.125rem] h-1 origin-left scale-x-[var(--fill)] rounded-full bg-forest transition-transform duration-700 ease-out motion-safe:animate-grow motion-reduce:transition-none"
        />
        {problem ? (
          // Only the last stretch, into the step that did not pass, is red.
          <span
            aria-hidden
            style={{ left: `calc(12.5% + ${(reached - 1) * 25}%)` }}
            className="absolute top-[1.125rem] h-1 w-1/4 origin-left rounded-full bg-destructive motion-safe:animate-grow motion-safe:[animation-delay:500ms]"
          />
        ) : null}
        <ol className="relative grid grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.label + index}
              aria-current={index === current ? "step" : undefined}
              className="flex min-w-0 flex-col items-center gap-2.5 px-1 text-center"
            >
              <StepIndicator key={step.state} state={step.state} number={index + 1} />
              <p
                className={`text-[0.9375rem] font-semibold leading-tight sm:text-base ${
                  step.state === "upcoming" ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                <span className="sr-only">Step {index + 1}: </span>
                {step.label}
                <span
                  className={`mt-1 block text-[0.8125rem] font-medium leading-tight ${
                    step.state === "rejected" ? "text-bad-ink" : "text-muted-foreground"
                  }`}
                >
                  <span className="sr-only">, </span>
                  {STEP_STATE_TEXT[step.state]}
                </span>
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// Placeholder until the organization provides its real drop-off location.
export const FOUND_DROP_OFF_GUIDANCE =
  "Found report saved. Please drop off the item with your organization’s lost-and-found staff.";

// Shared by the lost-report and tracking pages. No staff email or phone is
// configured in the project; add a contact link here when one exists.
export const STAFF_CONTACT_NOTE =
  "Questions or updates? Contact your organization’s lost-and-found staff.";

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
        context="Report saved"
        saved
        title="Found report saved"
        intro="Thank you for reporting this item. It has been saved so it can be returned to its owner safely."
        headingRef={headingRef}
      />

      <section
        aria-labelledby="drop-off-title"
        className="relative isolate mt-10 py-7 pl-9 pr-6 text-cream motion-safe:animate-rise sm:py-8 sm:pl-12 sm:pr-9"
      >
        <span aria-hidden className="shape-tag absolute inset-0 -z-10 bg-forest" />
        <div className="flex items-start gap-3">
          <PinIcon className="mt-1.5 size-5 shrink-0 text-sage" />
          <div>
            <h2
              id="drop-off-title"
              className="font-serif text-[1.75rem] font-semibold leading-tight text-cream sm:text-[2rem]"
            >
              Next step: hand in the item
            </h2>
            <p className="mt-2 max-w-[52ch] text-base leading-relaxed text-cream/90">
              {FOUND_DROP_OFF_GUIDANCE}
            </p>
          </div>
        </div>
      </section>

      {note ? (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-secondary px-4 py-3.5 motion-safe:animate-rise sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {isContinuing ? (
              <span
                aria-hidden
                className="mt-1.5 size-2 shrink-0 rounded-full bg-forest motion-safe:animate-breathe"
              />
            ) : (
              <InfoIcon className="mt-0.5 size-5 shrink-0 text-forest" />
            )}
            <p className="text-[0.9375rem] leading-relaxed text-foreground/80">{note}</p>
          </div>
          {canRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className={`${secondaryButtonClassName} shrink-0`}
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}

      {!isContinuing ? (
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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

const AI_SUGGESTION_NOTE =
  "This is an AI suggestion. It does not confirm that the item is yours, and nothing is returned until ownership is verified.";

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
  match: "bg-accent",
  neutral: "border border-border bg-card",
  notice: "bg-wait-soft",
};

const ResultIcon: Record<LostResult["tone"], typeof CheckIcon> = {
  match: KeyholeGlyph,
  neutral: InfoIcon,
  notice: ClockIcon,
};

export function LostConfirmation({
  context,
  saved = false,
  title,
  intro,
  ownership,
  children,
  aside,
  view,
  isContinuing,
  canRetry,
  onRetry,
  onReportAnother,
  headingRef,
}: ConfirmationProps & {
  context: string;
  saved?: boolean;
  title: string;
  intro: ReactNode;
  // Ownership state from the verification card; undefined where it is not shown.
  ownership?: OwnershipStage | null;
  // Shown below the result, e.g. the ownership questions.
  children?: ReactNode;
  // Shown in the side column on wide screens, e.g. the tracking link.
  aside?: ReactNode;
}) {
  const result = isContinuing ? null : lostResult(view, canRetry);
  const steps: Step[] = [
    { state: "done", label: "Report saved", detail: "Your details are stored privately." },
    matchingStep(view, isContinuing),
    ...ownershipSteps(view, isContinuing, ownership),
  ];

  const Icon = result ? ResultIcon[result.tone] : null;

  // Once ownership has taken over, the match card shrinks to the AI reminder
  // (while questions or review are open) and then goes away. The decision
  // itself is shown by the ownership card.
  const ownershipActive =
    ownership === "question" ||
    ownership === "followup" ||
    ownership === "staff_review" ||
    ownership === "answers_received";
  const decided = ownership === "approved" || ownership === "rejected";
  const showFullResult = Boolean(result && Icon) && !ownershipActive && !decided;

  // Reading order: heading, the progress stepper, then the current status with
  // its follow-up (the staff-contact line and the action button) kept together,
  // and the private tracking link beside it. Columns are top-aligned and keep
  // their own height.
  return (
    <div>
      <PageHeading
        context={context}
        saved={saved}
        title={title}
        intro={intro}
        headingRef={headingRef}
      />
      <JourneySteps steps={steps} busy={isContinuing} />

      <div className="@container mt-6">
        <div
          className={`grid items-start gap-6 ${
            aside ? "@4xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] @4xl:gap-8" : "max-w-3xl"
          }`}
        >
          <div className="flex min-w-0 flex-col gap-4 [&>*]:mt-0!">
          {showFullResult && result && Icon ? (
            <section
              aria-labelledby="matching-result-title"
              className={`rounded-[1.75rem] p-5 motion-safe:animate-rise sm:p-7 ${resultToneClassName[result.tone]}`}
            >
              <div className="flex items-start gap-3">
                <Icon
                  className={`mt-1.5 size-6 shrink-0 ${
                    result.tone === "notice" ? "text-wait-ink" : "text-forest"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <h2
                    id="matching-result-title"
                    className={`font-serif text-[2rem] font-semibold leading-tight tracking-[-0.01em] ${
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
                </div>
              </div>
              {result.aiNote ? (
                <Notice surface="bg-card/80" className="mt-5">
                  <span className="font-normal">{AI_SUGGESTION_NOTE}</span>
                </Notice>
              ) : null}
            </section>
          ) : null}

          {ownershipActive && result?.aiNote ? (
            <Notice>
              <span className="font-normal">{AI_SUGGESTION_NOTE}</span>
            </Notice>
          ) : null}

          {children}

            <div className="flex flex-col gap-4 pt-2">
              {decided ? null : (
                <p className="max-w-[52ch] text-[0.9375rem] leading-relaxed text-foreground/80">
                  {STAFF_CONTACT_NOTE}
                </p>
              )}
              {!isContinuing ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
            </div>
          </div>
          {aside ? <div className="min-w-0 [&>*]:mt-0!">{aside}</div> : null}
        </div>
      </div>
    </div>
  );
}
