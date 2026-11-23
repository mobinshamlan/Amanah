"use client";

import type { ReactNode } from "react";
import type { MatchingView, OwnershipStage } from "@/app/report/SubmissionConfirmation";
import { buildSteps, type StepState } from "@/app/report/track/parts/steps";
import { CheckIcon, XIcon } from "@/components/icons";
import { ReportKindCue, SlipRow } from "@/components/ui";
import { useMessages } from "@/i18n/LocaleProvider";
import { common } from "@/i18n/messages/common";
import { track } from "@/i18n/messages/track";

/*
  The report's case tag, as in the guided demo: a paper luggage tag on a
  brass string, with the stage and status in words and four short segments.
  It swings once whenever the report moves on (the key changes), and staff
  decisions land on it as a stamp.
*/

const segment: Record<StepState, string> = {
  done: "bg-pine-deep",
  active: "bg-brass motion-safe:animate-breathe",
  paused: "bg-brass/60",
  waiting: "bg-brass",
  stopped: "bg-wait-ink/55",
  rejected: "bg-destructive",
  upcoming: "bg-secondary",
};

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

  return (
    <div className="relative w-full max-w-[32rem] pt-10">
      {/* The string from the counter rail to the eyelet. */}
      <span aria-hidden className="track-string absolute top-0 h-[4.25rem] w-0.5 -translate-x-1/2 bg-brass-light rtl:translate-x-1/2" />
      <span aria-hidden className="track-string absolute top-0 size-2 -translate-x-1/2 rounded-full bg-brass-light rtl:translate-x-1/2" />
      <section
        key={`${current.key}-${current.state}`}
        aria-labelledby="case-tag-title"
        aria-busy={waiting}
        className="track-tag track-paper relative isolate text-foreground"
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

          <ul className="flex flex-col text-body">
            <SlipRow label={t.tag.stage} value={current.label} />
            <SlipRow label={t.tag.status} value={t.steps.state[current.state]} />
          </ul>

          <ol aria-label={t.steps.title} className="grid grid-cols-4 gap-2">
            {steps.map((step, index) => (
              <li key={step.key} aria-current={index === currentIndex ? "step" : undefined} className="min-w-0">
                <span aria-hidden className={`block h-2.5 rounded-full ${segment[step.state]}`} />
                <span
                  className={`mt-2 flex items-start gap-1 text-caption font-medium ${
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
                  <span className="min-w-0 break-words">
                    {step.label}
                    <span className="sr-only">: {t.steps.state[step.state]}</span>
                  </span>
                </span>
              </li>
            ))}
          </ol>

          {decision ? (
            <span
              className={`track-stamp inline-flex w-fit flex-col items-center self-center rounded-md border-[3px] px-4 py-1.5 text-center ${
                decision === "approved" ? "border-ok-ink text-ok-ink" : "border-bad-ink text-bad-ink"
              }`}
            >
              <span className="flex items-center gap-1.5 text-subheading font-bold leading-tight">
                {decision === "approved" ? <CheckIcon className="size-5" /> : <XIcon className="size-5" />}
                {decision === "approved" ? t.verify.chip.approved : t.verify.chip.rejected}
              </span>
              {decision === "approved" ? (
                <span className="text-small font-semibold leading-tight">{t.tag.approvedNote}</span>
              ) : null}
            </span>
          ) : null}

          {children}
        </div>
      </section>
    </div>
  );
}
