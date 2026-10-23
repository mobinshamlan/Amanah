"use client";

import { useState, useTransition } from "react";
import { runMatching } from "@/app/admin/actions";
import type {
  MatchingFailure,
  MatchingRunSummary,
} from "@/utils/matching/runMatchingBatch";

const FAILURE_MESSAGES: Record<MatchingFailure, string> = {
  quota:
    "Gemini's free-tier limit was reached. Quota errors are not retried. Wait a minute, or until the daily quota resets, then run again.",
  timeout: "Gemini did not answer within 20 seconds.",
  api: "Gemini was unavailable or returned an error, including after one retry for temporary server errors.",
  invalid_response: "Gemini returned a result that did not pass validation.",
  config: "Gemini is not configured on the server.",
  save: "A suggestion could not be saved to the database.",
};

type SummaryCountKey = Exclude<
  keyof MatchingRunSummary,
  "failure" | "stoppedForTime"
>;

const MAIN_ROWS: { key: SummaryCountKey; label: string }[] = [
  { key: "checked", label: "Pairs checked" },
  { key: "matched", label: "New possible matches" },
  { key: "uncertain", label: "New “not enough information”" },
  { key: "remaining", label: "Still unchecked" },
];

const DETAIL_ROWS: { key: SummaryCountKey; label: string }[] = [
  { key: "noMatch", label: "Not a match (not saved)" },
  { key: "alreadySaved", label: "Already saved (skipped)" },
  { key: "failed", label: "Failed" },
];

function CountList({
  rows,
  summary,
}: {
  rows: { key: SummaryCountKey; label: string }[];
  summary: MatchingRunSummary;
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
      {rows.map((row) => (
        <div key={row.key} className="flex flex-col">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="font-medium text-foreground">{summary[row.key]}</dd>
        </div>
      ))}
    </dl>
  );
}

export function RunMatching() {
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
        setError("The matching run failed. Nothing more was checked.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleRun}
          disabled={isPending}
          aria-describedby="run-matching-help"
          className="inline-flex h-11 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/80 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 sm:w-auto"
        >
          {isPending ? "Running…" : "Run matching"}
        </button>
        <p
          id="run-matching-help"
          className="text-sm leading-relaxed text-muted-foreground"
        >
          Checks up to 4 unchecked lost and found pairs per run, newest first.
          Completed checks are remembered across refreshes.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium leading-snug text-foreground"
        >
          {error}
        </p>
      ) : null}

      {summary ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3"
        >
          {summary.failure ? (
            <p className="text-sm font-medium leading-snug text-foreground">
              Partial result. {FAILURE_MESSAGES[summary.failure]} Suggestions
              saved before the error were kept, and the failed pair stays
              unchecked.
            </p>
          ) : summary.stoppedForTime ? (
            <p className="text-sm font-medium leading-snug text-foreground">
              Partial result. The run stopped after 30 seconds to avoid a long
              wait. Unchecked pairs were not counted as “not a match”. Run
              again to continue.
            </p>
          ) : summary.remaining > 0 ? (
            <p className="text-sm font-medium leading-snug text-foreground">
              Batch finished. Run again to check the next pairs.
            </p>
          ) : (
            <p className="text-sm font-medium leading-snug text-forest">
              All current pairs have been checked.
            </p>
          )}
          <CountList rows={MAIN_ROWS} summary={summary} />
          <details className="group">
            <summary className="-ml-2 inline-flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-foreground outline-none transition-colors hover:text-forest focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Show run details</span>
              <span className="hidden group-open:inline">Hide run details</span>
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              <CountList rows={DETAIL_ROWS} summary={summary} />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Every completed comparison, including “not a match”, is
                recorded and not sent to Gemini again. Failed comparisons are
                not recorded, so they are retried on the next run. New reports
                are included automatically.
              </p>
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}
