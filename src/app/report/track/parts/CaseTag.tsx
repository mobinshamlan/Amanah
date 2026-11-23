"use client";

import type { ReactNode } from "react";
import type { MatchingView, OwnershipStage } from "@/app/report/SubmissionConfirmation";
import { buildSteps, type Step, type StepState } from "@/app/report/track/parts/steps";
import { CheckIcon, ChevronDownIcon, ListIcon, XIcon } from "@/components/icons";
import { ReportKindCue, focusRingClassName } from "@/components/ui";
import { useMessages } from "@/i18n/LocaleProvider";
import { common } from "@/i18n/messages/common";
import { track } from "@/i18n/messages/track";

/*
  The report's case tag, as in the guided demo: a paper luggage tag on a
  brass string with the report's four stages. It swings once whenever the
  report moves on (the key changes). While a question is open the progress
  steps aside behind a disclosure, and a staff decision lands on the tag as
  its stamp, with nothing else competing.
*/

const segment: Record<StepState, string> = {
  done: "bg-pine-deep",
  active: "bg-brass",
  paused: "bg-brass/60",
  waiting: "bg-brass",
  stopped: "bg-wait-ink/55",
  rejected: "bg-destructive",
  upcoming: "bg-secondary",
};

// Ownership moments where the page asks for something: the progress waits behind a disclosure.
const asking: ReadonlySet<OwnershipStage> = new Set(["loading", "question", "followup", "retry"]);

function StepList({ steps, currentIndex, label }: { steps: Step[]; currentIndex: number; label: string }) {
  const t = useMessages(track);
  return (
    <ol aria-label={label} className="flex flex-col gap-2.5 sm:grid sm:grid-cols-4 sm:gap-2">
      {steps.map((step, index) => {
        const current = index === currentIndex;
        return (
          <li
            key={step.key}
            aria-current={current ? "step" : undefined}
            className="flex min-w-0 items-center gap-3 sm:block"
          >
            <span
              aria-hidden
              className={`block h-2.5 w-8 shrink-0 rounded-full sm:w-auto ${segment[step.state]} ${
                // Only live checking pulses; a waiting question stays still.
                current && step.key === "matching" && step.state === "active" ? "motion-safe:animate-breathe" : ""
              }`}
            />
            <span
              className={`flex min-w-0 flex-1 items-start gap-1 text-caption font-medium sm:mt-2 ${
                step.state === "upcoming"
                  ? "text-muted-foreground"
                  : step.state === "rejected"
                    ? "text-bad-ink"
                    : "text-foreground"
              }`}
            >
              {step.state === "done" ? (
                <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-forest" />
              ) : step.state === "rejected" ? (
                <XIcon className="mt-0.5 size-3.5 shrink-0" />
              ) : null}
              <span className="min-w-0">{step.label}</span>
            </span>
            {/* The state in words: shown for the current stage, read out for every stage. */}
            <span
              className={`shrink-0 text-caption ${
                current ? "font-semibold text-foreground sm:mt-0.5 sm:block" : "text-muted-foreground sm:sr-only"
              }`}
            >
              <span className="sr-only">: </span>
              {t.steps.state[step.state]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function CaseTag({
  view,
  waiting,
  ownership,
  children,
}: {
  view: MatchingView;
  waiting: boolean;
  ownership?: OwnershipStage | null;
  // An action that belongs on the tag, e.g. "Try again".
  children?: ReactNode;
}) {
  const t = useMessages(track);
  const c = useMessages(common);
  const steps = buildSteps(t, view, waiting, ownership);
  const currentIndex = steps.findIndex((step) => step.state !== "done" && step.state !== "upcoming");
  // With nothing in progress, the tag shows the last stage that is done.
  const lastDone = steps.findLastIndex((step) => step.state === "done");
  const current = steps[currentIndex] ?? steps[lastDone] ?? steps[0];
  const decision = ownership === "approved" || ownership === "rejected" ? ownership : null;

  if (ownership && asking.has(ownership)) {
    return (
      <div className="flex flex-col gap-3">
        <details className="group/progress">
          <summary
            className={`-ms-2 inline-flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-full px-2 text-small font-semibold text-foreground [&::-webkit-details-marker]:hidden ${focusRingClassName}`}
          >
            <ListIcon className="size-4 shrink-0 text-forest" />
            {t.tag.progress}
            <ChevronDownIcon className="size-4 transition-transform group-open/progress:rotate-180" />
          </summary>
          <div className="mt-3 max-w-[32rem]">
            <StepList steps={steps} currentIndex={currentIndex} label={t.steps.title} />
          </div>
        </details>
        {children}
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[32rem] pt-10">
      {/* The string from the counter rail to the eyelet. */}
      <span aria-hidden className="track-string absolute top-0 h-[4.25rem] w-0.5 -translate-x-1/2 bg-brass-light rtl:translate-x-1/2" />
      <span aria-hidden className="track-string absolute top-0 size-2 -translate-x-1/2 rounded-full bg-brass-light rtl:translate-x-1/2" />
      <section
        key={`${current.key}-${current.state}`}
        aria-labelledby="case-tag-title"
        aria-busy={waiting}
        className="track-tag relative isolate text-foreground"
      >
        <span aria-hidden className="shape-tag absolute inset-0 -z-10 bg-card" />
        <span aria-hidden className="eyelet absolute start-4 top-4 size-6 bg-pine-deep" />
        <div className="flex flex-col gap-5 px-6 pb-7 pt-12 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="case-tag-title" className="text-subheading text-foreground">
              {t.tag.title}
            </h2>
            <ReportKindCue kind="lost">{c.kindLost}</ReportKindCue>
          </div>

          {decision ? (
            <span
              className={`track-stamp my-3 inline-flex w-fit flex-col items-center self-center rounded-lg border-4 px-6 py-3 text-center ${
                decision === "approved" ? "border-ok-ink text-ok-ink" : "border-bad-ink text-bad-ink"
              }`}
            >
              <span className="flex items-center gap-2 text-heading font-bold leading-tight">
                {decision === "approved" ? <CheckIcon className="size-6" /> : <XIcon className="size-6" />}
                {decision === "approved" ? t.verify.chip.approved : t.verify.chip.rejected}
              </span>
              {decision === "approved" ? (
                <span className="mt-1 text-small font-semibold leading-tight">{t.tag.approvedNote}</span>
              ) : null}
            </span>
          ) : (
            <StepList steps={steps} currentIndex={currentIndex} label={t.steps.title} />
          )}

          {children}
        </div>
      </section>
    </div>
  );
}
