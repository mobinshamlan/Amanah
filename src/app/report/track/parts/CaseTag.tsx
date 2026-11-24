"use client";

import type { ReactNode } from "react";
import type { MatchingView, OwnershipStage } from "@/app/report/SubmissionConfirmation";
import { buildSteps, currentStepIndex, type StepState } from "@/app/report/track/parts/steps";
import { CheckIcon, XIcon } from "@/components/icons";
import { ReportKindCue } from "@/components/ui";
import { useMessages } from "@/i18n/LocaleProvider";
import { common } from "@/i18n/messages/common";
import { track } from "@/i18n/messages/track";

/*
  The report's case tag, as in the guided demo: a paper luggage tag on a
  brass string. The progress itself lives once, in the line under the
  headline; the tag carries what the current stage means, and a staff
  decision lands on it as its stamp, with nothing else competing. It swings
  once whenever the report moves on (the key changes).
*/

// Stages still moving, whose one-line detail the tag carries.
const moving: ReadonlySet<StepState> = new Set(["active", "paused", "stopped", "waiting"]);

// Ownership moments where the page asks for something: the question card is the focus, not the tag.
const asking: ReadonlySet<OwnershipStage> = new Set(["loading", "question", "followup", "retry"]);

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
  const current = steps[currentStepIndex(steps)];
  const decision = ownership === "approved" || ownership === "rejected" ? ownership : null;
  const detail = moving.has(current.state) ? current.detail : null;

  if (ownership && asking.has(ownership)) {
    return children ? <div className="flex flex-col gap-3">{children}</div> : null;
  }
  // With nothing moving, decided or to retry, the headline and progress line say it all.
  if (!decision && !detail && !children) return null;

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
          ) : detail ? (
            <p className="max-w-[46ch] text-body text-foreground/85">{detail}</p>
          ) : null}

          {children}
        </div>
      </section>
    </div>
  );
}
