"use client";

import { useId, useState, useTransition } from "react";
import { runMatching } from "@/app/admin/actions";
import type { MatchingRunSummary } from "@/utils/matching/runMatchingBatch";
import { AlertIcon, CheckIcon, ClockIcon, CompareIcon, ChevronDownIcon } from "@/components/icons";
import { Notice, Spinner, focusRingClassName, primaryButtonClassName } from "@/components/ui";
import { useLocale, useMessages } from "@/i18n/LocaleProvider";
import { formatNumber } from "@/i18n/format";
import { adminTools } from "@/i18n/messages/admin-tools";

// The manual matching run: one button, an honest status line, and the counts
// of the last batch. The server caps each run at 4 pairs and 30 seconds and
// stops at the first Gemini failure; this component only reports that.

type SummaryCountKey = Exclude<keyof MatchingRunSummary, "failure" | "stoppedForTime">;

const MAIN_ROWS: SummaryCountKey[] = ["checked", "matched", "uncertain", "remaining"];
const DETAIL_ROWS: SummaryCountKey[] = ["noMatch", "alreadySaved", "failed"];

function CountList({ rows, summary }: { rows: SummaryCountKey[]; summary: MatchingRunSummary }) {
  const t = useMessages(adminTools).run;
  const { locale } = useLocale();
  const labels: Record<SummaryCountKey, string> = {
    checked: t.checked,
    matched: t.matched,
    uncertain: t.uncertain,
    remaining: t.remaining,
    noMatch: t.noMatch,
    alreadySaved: t.alreadySaved,
    failed: t.failedCount,
  };
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 @lg:grid-cols-4">
      {rows.map((key) => (
        <div key={key} className="flex min-w-0 flex-col-reverse gap-0.5">
          <dt className="text-small text-muted-foreground">{labels[key]}</dt>
          <dd className="text-[1.5rem] font-medium leading-none tabular-nums text-foreground">
            {formatNumber(summary[key], locale)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The one-line verdict of a run: done, more to do, stopped early, or a failure. */
function RunVerdict({ summary }: { summary: MatchingRunSummary }) {
  const t = useMessages(adminTools).run;
  if (summary.failure) {
    const limited = summary.failure === "quota" || summary.failure === "usage_limit";
    return (
      <p className="flex items-start gap-2 text-small font-medium text-foreground">
        {limited ? (
          <ClockIcon className="mt-0.5 size-4 shrink-0 text-wait-ink" />
        ) : (
          <AlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
        )}
        <span>
          {t.partialFailure} {t.failures[summary.failure]} {t.keptAfterFailure}
        </span>
      </p>
    );
  }
  if (summary.stoppedForTime) {
    return (
      <p className="flex items-start gap-2 text-small font-medium text-foreground">
        <ClockIcon className="mt-0.5 size-4 shrink-0 text-wait-ink" />
        <span>{t.stoppedForTime}</span>
      </p>
    );
  }
  if (summary.remaining > 0) {
    return <p className="text-small font-medium text-foreground">{t.batchDone}</p>;
  }
  return (
    <p className="flex items-center gap-2 text-small font-medium text-ok-ink">
      <CheckIcon className="size-4 shrink-0" />
      {t.allDone}
    </p>
  );
}

export function RunMatching({ stacked = false }: { stacked?: boolean } = {}) {
  const t = useMessages(adminTools).run;
  const [summary, setSummary] = useState<MatchingRunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRun() {
    if (isPending) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await runMatching();
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setSummary(result.summary);
      } catch {
        setError(t.failed);
      }
    });
  }

  // Phones and desktop each render a copy of these controls; each needs its own help id.
  const helpId = useId();

  return (
    <div className="@container flex min-w-0 flex-col gap-4">
      {/* Stacked: button above its help text, for narrow side panels. */}
      <div className={`flex flex-col gap-3 ${stacked ? "items-stretch" : "sm:flex-row sm:items-start"}`}>
        <button
          type="button"
          onClick={handleRun}
          disabled={isPending}
          aria-describedby={helpId}
          className={primaryButtonClassName}
        >
          {isPending ? (
            <>
              <Spinner />
              {t.running}
            </>
          ) : (
            <>
              <CompareIcon className="size-4" />
              {t.button}
            </>
          )}
        </button>
        <p id={helpId} className="text-small text-muted-foreground">
          {t.help}
        </p>
      </div>

      {error ? (
        <Notice tone="error" role="alert">
          {error}
        </Notice>
      ) : null}

      {/* Stays mounted so a finished run is announced. */}
      <div role="status" aria-live="polite" className={summary ? "" : "sr-only"}>
        {isPending ? <span className="sr-only">{t.running}</span> : null}
        {summary ? (
          <div className="flex flex-col gap-3 rounded-2xl bg-background px-4 py-4">
            <RunVerdict summary={summary} />
            <CountList rows={MAIN_ROWS} summary={summary} />
            <details className="group/details">
              <summary
                className={`-ms-2 inline-flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 rounded-full px-2 text-small font-semibold text-foreground [&::-webkit-details-marker]:hidden ${focusRingClassName}`}
              >
                <span className="group-open/details:hidden">{t.showDetails}</span>
                <span className="hidden group-open/details:inline">{t.hideDetails}</span>
                <ChevronDownIcon className="size-4 transition-transform group-open/details:rotate-180" />
              </summary>
              <div className="mt-2 flex flex-col gap-3">
                <CountList rows={DETAIL_ROWS} summary={summary} />
                <p className="text-small text-muted-foreground">{t.detailsNote}</p>
              </div>
            </details>
          </div>
        ) : null}
      </div>
    </div>
  );
}
