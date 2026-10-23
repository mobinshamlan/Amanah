import type { ReactNode, RefObject } from "react";
import type { PublicMatchingStatus } from "@/utils/matching/publicStatus";

export type MatchingView =
  | PublicMatchingStatus
  | { phase: "stalled" }
  | { phase: "lost_access" };

type ConfirmationProps = {
  view: MatchingView;
  isContinuing: boolean;
  canRetry: boolean;
  onRetry: () => void;
  onReportAnother: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
};

const primaryButtonClassName =
  "inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/80 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto";

const secondaryButtonClassName =
  "inline-flex h-11 w-full items-center justify-center rounded-lg border border-border bg-background px-6 text-base font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.75v.01" strokeWidth={2.5} />
    </svg>
  );
}

function PauseBars() {
  return (
    <span className="flex gap-[3px]">
      <span className="h-2.5 w-[3px] rounded-full bg-forest" />
      <span className="h-2.5 w-[3px] rounded-full bg-forest" />
    </span>
  );
}

type StepState = "active" | "paused" | "done" | "stopped";

function StepIndicator({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-forest text-primary-foreground"
      >
        <CheckIcon className="size-4" />
      </span>
    );
  }
  if (state === "stopped") {
    return (
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-sage bg-card"
      >
        <PauseBars />
      </span>
    );
  }
  // Active and paused share the calm ring; only active orbits.
  return (
    <span
      aria-hidden
      className="relative flex size-7 shrink-0 items-center justify-center"
    >
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

function SavedHeader({
  title,
  headingRef,
  children,
}: {
  title: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  children: ReactNode;
}) {
  return (
    <div className="mt-6 flex flex-col items-start sm:mt-10">
      <span
        aria-hidden
        className="flex size-12 items-center justify-center rounded-full bg-accent text-forest ring-1 ring-forest/20 motion-safe:animate-rise"
      >
        <CheckIcon className="size-6" />
      </span>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-5 text-balance font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-foreground outline-none sm:text-5xl"
      >
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        {children}
      </p>
    </div>
  );
}

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
      <SavedHeader title="Found report saved" headingRef={headingRef}>
        Thank you for reporting this item. It has been saved so it can be
        returned to its owner safely.
      </SavedHeader>

      {note ? (
        <div className="mt-8 flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 motion-safe:animate-rise sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {isContinuing ? (
              <span
                aria-hidden
                className="mt-1.5 size-2 shrink-0 rounded-full bg-forest motion-safe:animate-breathe"
              />
            ) : (
              <InfoIcon className="mt-0.5 size-5 shrink-0 text-forest" />
            )}
            <p className="text-sm leading-relaxed text-muted-foreground">
              {note}
            </p>
          </div>
          {canRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className={`${secondaryButtonClassName} shrink-0 text-sm sm:px-4`}
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}

      {!isContinuing ? (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onReportAnother}
            className={primaryButtonClassName}
          >
            Report another found item
          </button>
        </div>
      ) : null}
    </>
  );
}

function lostStep(view: MatchingView, waiting: boolean) {
  if (waiting) {
    if (view.phase === "rate_limited") {
      return {
        state: "paused" as const,
        label: "Checking paused",
        detail:
          "The matching service is busy. Checking continues in about a minute if this page stays open.",
      };
    }
    return {
      state: "active" as const,
      label: "Checking for possible matches",
      detail:
        "outcome" in view && view.outcome === "possible_match"
          ? "A possible match has turned up. Finishing the remaining checks…"
          : "This can take a little while. Please keep this page open.",
    };
  }
  if (view.phase === "complete") {
    return {
      state: "done" as const,
      label: "Check complete",
      detail: "Every found-item report has been checked.",
    };
  }
  return {
    state: "stopped" as const,
    label: "Check did not finish",
    detail:
      view.phase === "lost_access"
        ? "The status of this check is no longer available here."
        : "Not every found-item report was checked.",
  };
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
            title: "Not enough information to tell",
            body: [
              "We could not tell from the details whether a found item matches, so staff may review it.",
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
        title: "Checking paused",
        body: [
          `Your report is still saved, but checking did not finish because the matching service is busy. ${NOT_NO_MATCH}`,
          "You can try again in a few minutes.",
        ],
      };
    case "unavailable":
      return {
        tone: "notice",
        title: "Matching unavailable right now",
        body: [
          `Your report is still saved, but automatic matching is not available right now. ${NOT_NO_MATCH}`,
          ...(canRetry ? ["You can try again."] : []),
        ],
      };
    case "stalled":
      return {
        tone: "notice",
        title: "Taking longer than expected",
        body: [
          `Your report is still saved. Checking is not finished. ${NOT_NO_MATCH}`,
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
        title: "Checking did not finish",
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

export function LostConfirmation({
  view,
  isContinuing,
  canRetry,
  onRetry,
  onReportAnother,
  headingRef,
}: ConfirmationProps) {
  const step = lostStep(view, isContinuing);
  const result = isContinuing ? null : lostResult(view, canRetry);

  return (
    <>
      <SavedHeader title="Lost report saved" headingRef={headingRef}>
        Your report is saved. Amanah checks it automatically against items
        people have reported as found.
      </SavedHeader>

      <section
        aria-label="Progress"
        aria-busy={isContinuing}
        className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
      >
        <ol className="flex flex-col">
          <li className="flex gap-4">
            <div className="flex flex-col items-center">
              <StepIndicator state="done" />
              <span aria-hidden className="my-1.5 min-h-5 w-px flex-1 bg-border" />
            </div>
            <div className="pb-5 pt-0.5">
              <p className="text-base font-medium leading-snug text-foreground">
                Report saved
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Your details are stored safely.
              </p>
            </div>
          </li>
          <li className="flex gap-4 motion-safe:animate-rise motion-safe:[animation-delay:150ms]">
            <StepIndicator state={step.state} />
            <div className="pt-0.5">
              <p className="text-base font-medium leading-snug text-foreground">
                {step.label}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {step.detail}
              </p>
            </div>
          </li>
        </ol>
      </section>

      {result ? (
        <section
          aria-labelledby="matching-result-title"
          className={`mt-4 rounded-2xl border p-5 motion-safe:animate-rise sm:p-6 ${resultToneClassName[result.tone]}`}
        >
          <h2
            id="matching-result-title"
            className={`font-serif text-2xl font-semibold leading-tight tracking-tight sm:text-[1.75rem] ${
              result.tone === "match" ? "text-forest" : "text-foreground"
            }`}
          >
            {result.title}
          </h2>
          {result.body.map((paragraph) => (
            <p
              key={paragraph}
              className="mt-2 text-base leading-relaxed text-foreground"
            >
              {paragraph}
            </p>
          ))}
          {result.aiNote ? (
            <p className="mt-4 flex items-start gap-2.5 rounded-lg border border-forest/20 bg-background/70 px-3 py-2.5 text-sm leading-relaxed text-foreground">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-forest" />
              <span>
                This is an AI suggestion. It does not confirm that the item is
                yours, and nothing is returned until ownership is verified.
              </span>
            </p>
          ) : null}
        </section>
      ) : null}

      {!isContinuing ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {canRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className={primaryButtonClassName}
            >
              Try again
            </button>
          ) : null}
          <button
            type="button"
            onClick={onReportAnother}
            className={
              canRetry ? secondaryButtonClassName : primaryButtonClassName
            }
          >
            Report another lost item
          </button>
        </div>
      ) : null}
    </>
  );
}
