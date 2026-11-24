"use client";

import { useMessages } from "@/i18n/LocaleProvider";
import { track } from "@/i18n/messages/track";

/*
  What the owner does next once nothing is left to answer: while staff
  review, after an approval (how to collect the item) and after a rejection.
  A short numbered list beside the result, so the page ends on a next step.
*/
export function NextSteps({ kind }: { kind: "waiting" | "approved" | "rejected" }) {
  const t = useMessages(track).next[kind];
  return (
    <section aria-labelledby="next-steps-title" className="flex max-w-[52ch] flex-col gap-3">
      <h2 id="next-steps-title" className="text-body font-semibold text-foreground">
        {t.title}
      </h2>
      <ol className="flex flex-col gap-2.5">
        {t.steps.map((step, index) => (
          <li key={step} className="flex items-start gap-3 text-small text-foreground/85">
            <span
              aria-hidden
              className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-brass/60 text-xs font-semibold text-forest"
            >
              {index + 1}
            </span>
            <span className="min-w-0 pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
