"use client";

import type { ReactNode } from "react";
import { currentStepIndex, type StepState } from "@/app/report/track/parts/steps";
import { CheckIcon, XIcon } from "@/components/icons";
import { useMessages } from "@/i18n/LocaleProvider";
import { track } from "@/i18n/messages/track";

/*
  The one compact progress line under the headline, on the pine band. The
  lost and found pages and the guided demo all use it, so a report reads the
  same wherever it is. Every stage says where it stands in words: done gets a
  check, the current stage its full name and state, later stages stay dim but
  readable, and a stage that happens only with a possible match is a dashed
  line, never shown as coming for sure. On phones the other stages use short
  names; their full names stay with screen readers.
*/

export type ProgressStep = {
  key: string;
  state: StepState;
  label: string;
  short?: string;
  // Replaces the state's usual word, e.g. "Approved · simulated" in the demo.
  stateWord?: string;
};

const bar: Record<StepState, string> = {
  done: "h-1 bg-paper/75",
  active: "h-1 bg-brass-light",
  paused: "h-1 bg-brass-light/60",
  waiting: "h-1 bg-brass-light",
  stopped: "h-1 bg-brass-light/60",
  rejected: "h-1 bg-bad-soft",
  approved: "h-1 bg-ok-soft",
  upcoming: "h-1 bg-paper/25",
  conditional: "border-t-2 border-dashed border-paper/45",
};

export function ProgressLine({
  steps,
  label,
  note,
  children,
  className = "mt-7 sm:mt-8",
}: {
  steps: ProgressStep[];
  label: string;
  // One plain sentence under the line, e.g. that questions come only with a possible match.
  note?: ReactNode;
  // A small action that belongs with the progress, e.g. "Go to your question".
  children?: ReactNode;
  // Spacing and visibility from the place it sits.
  className?: string;
}) {
  const t = useMessages(track);
  const currentIndex = currentStepIndex(steps);

  return (
    <div data-progress-line className={`flex w-full max-w-[34rem] flex-col gap-3 ${className}`}>
      <ol aria-label={label} className="flex items-start gap-3 sm:gap-4">
        {steps.map((step, index) => {
          const current = index === currentIndex;
          const word = step.stateWord ?? t.steps.state[step.state];
          const dim = step.state === "upcoming" || step.state === "conditional";
          return (
            <li
              key={step.key}
              aria-current={current ? "step" : undefined}
              // The current stage takes the room left and may wrap its state; the others stay on one line.
              className={`flex flex-col gap-2 ${current ? "min-w-[6.5rem] flex-1" : "flex-none whitespace-nowrap"}`}
            >
              <span
                aria-hidden
                className={`block w-full rounded-full ${bar[step.state]} ${
                  // Only live work pulses; a waiting decision stays still.
                  current && step.state === "active" ? "motion-safe:animate-breathe" : ""
                }`}
              />
              <span
                className={`flex min-w-0 items-start gap-1 text-caption ${
                  current ? "font-semibold text-paper" : dim ? "font-medium text-paper/70" : "font-medium text-paper/85"
                }`}
              >
                {step.state === "done" || step.state === "approved" ? (
                  <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-brass-light" />
                ) : step.state === "rejected" ? (
                  <XIcon className="mt-0.5 size-3.5 shrink-0" />
                ) : null}
                {current || !step.short ? (
                  <span className="min-w-0">{step.label}</span>
                ) : (
                  <>
                    <span aria-hidden className="min-w-0 whitespace-nowrap sm:hidden">
                      {step.short}
                    </span>
                    <span className="sr-only min-w-0 sm:not-sr-only">{step.label}</span>
                  </>
                )}
              </span>
              {/* The state in words: shown for the current stage, read out for every stage. */}
              <span className={current ? "-mt-1.5 text-caption text-paper/85" : "sr-only"}>
                <span className="sr-only">: </span>
                {word}
              </span>
            </li>
          );
        })}
      </ol>
      {note ? <p className="max-w-[46ch] text-caption text-paper/80">{note}</p> : null}
      {children}
    </div>
  );
}
