import Link from "next/link";
import type { ReactNode } from "react";
import { AlertIcon, ArrowRightIcon, CheckIcon, ClockIcon, InfoIcon } from "@/components/icons";
import { Notice, focusRingClassName } from "@/components/ui";
import { RunMatching } from "@/app/admin/RunMatching";
import { DailyBars, type BarCategory } from "@/app/admin/DailyBars";
import type { RunFailure } from "@/utils/monitoring/runLog";
import {
  MIN_TREND_DAYS,
  TREND_DAYS,
  type ComparisonSeriesKey,
  type DailySeries,
  type MatchingHealth,
  type MatchingRun,
  type MonitoringSnapshot,
  type ReportSeriesKey,
} from "@/utils/monitoring/snapshot";

// Aggregate operational dashboard for local staff. Counts, times, and failure
// kinds only: never report names, descriptions, locations, IDs, questions,
// answers, tokens, or keys. Nothing here calls Gemini.

const FAILURE_LABELS: Record<RunFailure, string> = {
  quota: "Gemini rate limit",
  timeout: "Gemini timed out",
  api: "Gemini error",
  invalid_response: "AI answer failed validation",
  config: "Gemini not configured",
  save: "Could not save a result",
  load: "Could not load reports",
};

const SOURCE_LABELS: Record<MatchingRun["source"], string> = {
  admin: "Staff check",
  auto: "Automatic check",
};

const NOT_NO_MATCH =
  "Unfinished pairs stay unchecked and are retried; they are never counted as no match.";

// Brand hues. Identity is also carried by the legend, labels, and table view.
const REPORT_CATEGORIES: BarCategory<ReportSeriesKey>[] = [
  { key: "lost", label: "Lost", swatch: "bg-clay" },
  { key: "found", label: "Found", swatch: "bg-forest" },
];

const COMPARISON_CATEGORIES: BarCategory<ComparisonSeriesKey>[] = [
  { key: "match", label: "Possible match", swatch: "bg-forest" },
  { key: "insufficient_information", label: "Not enough information", swatch: "bg-clay" },
  { key: "no_match", label: "No match", swatch: "bg-sage" },
];

const cardLinkClassName = `-ml-1 inline-flex w-fit items-center gap-1 rounded-md px-1 py-0.5 text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-forest hover:underline ${focusRingClassName}`;

const cardTitleClassName = "text-base font-semibold leading-tight text-foreground";

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(iso: string) {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) {
      return format.format(Math.round(seconds / size), unit);
    }
  }
  return "just now";
}

function runResult(run: MatchingRun) {
  if (run.failure) {
    return `Failed: ${FAILURE_LABELS[run.failure]}`;
  }
  return run.stoppedForTime ? "Stopped early (30-second limit)" : "Completed";
}

function formatDuration(ms: number) {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

type Tone = "ok" | "problem" | "neutral";

function healthMessage(snapshot: MonitoringSnapshot): { tone: Tone; title: string; body: string } {
  const { pairs, lastRun, lastComparisonAt } = snapshot;
  const remaining =
    pairs.unchecked > 0
      ? `${plural(pairs.unchecked, "report pair is", "report pairs are")} not checked yet.`
      : pairs.total > 0
        ? "All current report pairs are checked."
        : "";
  const states: Record<MatchingHealth, () => { tone: Tone; title: string; body: string }> = {
    not_configured: () => ({
      tone: "problem",
      title: "Matching is not configured",
      body: "GEMINI_API_KEY is missing from .env.local, so no pairs can be checked. Add it and restart the dev server.",
    }),
    history_unavailable: () => ({
      tone: "neutral",
      title: "Run history is not available",
      body: `Recorded checks could not be read, so failures and early stops are not shown. Pair counts and comparisons below still work. ${remaining}`,
    }),
    nothing_to_check: () => ({
      tone: "neutral",
      title: "Nothing to compare yet",
      body: "Matching needs at least one lost report and one found report.",
    }),
    never_run: () => ({
      tone: "neutral",
      title: "No checks have run yet",
      body: `${remaining} Use Check for matches to start.`,
    }),
    no_recorded_checks: () => ({
      tone: "neutral",
      title: "No checks recorded since run history began",
      body: `${
        lastComparisonAt
          ? `The last completed comparison was ${timeAgo(lastComparisonAt)} (${formatTime(lastComparisonAt)}), before run history was recording.`
          : "Earlier comparisons predate run history."
      } Their results are counted below. ${remaining} New checks will appear in Recent checks.`,
    }),
    last_run_failed: () => ({
      tone: "problem",
      title: "The last check did not finish",
      body: lastRun
        ? `${SOURCE_LABELS[lastRun.source]} ${timeAgo(lastRun.finishedAt)}: ${
            lastRun.failure ? FAILURE_LABELS[lastRun.failure] : "failed"
          }. ${NOT_NO_MATCH} ${remaining}`
        : NOT_NO_MATCH,
    }),
    last_run_partial: () => ({
      tone: "neutral",
      title: "The last check stopped early",
      body: lastRun
        ? `${SOURCE_LABELS[lastRun.source]} ${timeAgo(lastRun.finishedAt)} reached the 30-second limit. ${NOT_NO_MATCH} ${remaining}`
        : NOT_NO_MATCH,
    }),
    working: () => ({
      tone: "ok",
      title: "Matching is working",
      body: lastRun
        ? `${SOURCE_LABELS[lastRun.source]} ${timeAgo(lastRun.finishedAt)} completed and checked ${plural(lastRun.checked, "pair", "pairs")}. ${remaining}`
        : remaining,
    }),
  };
  return states[snapshot.health]();
}

function historyFact(snapshot: MonitoringSnapshot) {
  const { history } = snapshot;
  if (!history.available) {
    return "Not available";
  }
  if (history.total === 0 || !history.firstAt) {
    return "No checks recorded yet";
  }
  return `${plural(history.total, "check", "checks")} since ${formatDay(history.firstAt)}`;
}

function HealthSummary({ snapshot }: { snapshot: MonitoringSnapshot }) {
  const state = healthMessage(snapshot);
  const Icon = state.tone === "ok" ? CheckIcon : state.tone === "problem" ? AlertIcon : InfoIcon;
  return (
    <section
      aria-labelledby="monitoring-health"
      className={`grid gap-5 rounded-lg border p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:gap-10 ${
        state.tone === "ok"
          ? "border-forest/30 bg-accent"
          : state.tone === "problem"
            ? "border-destructive/40 bg-card"
            : "border-border bg-card"
      }`}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div role="status" className="flex items-start gap-3">
          <span
            aria-hidden
            className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
              state.tone === "ok"
                ? "bg-forest text-primary-foreground"
                : state.tone === "problem"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-forest"
            }`}
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <h3
              id="monitoring-health"
              className="text-lg font-semibold leading-snug text-foreground"
            >
              {state.title}
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-foreground">{state.body}</p>
          </div>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm sm:pl-12">
          {[
            ["Gemini key", snapshot.geminiConfigured ? "Configured" : "Missing"],
            ["Model", snapshot.model],
            ["Run history", historyFact(snapshot)],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-1.5">
              <dt className="text-muted-foreground">{label}:</dt>
              <dd className="font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex min-w-0 flex-col gap-2 rounded-lg bg-background/70 p-4">
        <RunMatching stacked />
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
  attention = false,
  children,
}: {
  label: string;
  value: ReactNode;
  detail: ReactNode;
  attention?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd
        className={`text-[1.75rem] font-normal leading-none tabular-nums lining-nums ${
          attention ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </dd>
      <dd className="text-sm leading-snug text-muted-foreground">{detail}</dd>
      {children ? <dd className="mt-auto pt-1">{children}</dd> : null}
    </div>
  );
}

function Metrics({
  snapshot,
  reviewNeeded,
}: {
  snapshot: MonitoringSnapshot;
  reviewNeeded: number | null;
}) {
  const { pairs, window, claims } = snapshot;
  const checkedShare = pairs.total > 0 ? Math.round((pairs.checked / pairs.total) * 100) : 0;
  const problems = window ? window.failed + window.stoppedEarly : 0;

  return (
    <dl className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Pairs not checked yet"
        value={pairs.unchecked}
        detail={`${pairs.checked} of ${plural(pairs.total, "pair", "pairs")} checked`}
      >
        <div
          role="progressbar"
          aria-label="Report pairs checked"
          aria-valuemin={0}
          aria-valuemax={pairs.total}
          aria-valuenow={pairs.checked}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-forest" style={{ width: `${checkedShare}%` }} />
        </div>
      </MetricCard>

      <MetricCard
        label={`Check problems, last ${TREND_DAYS} days`}
        value={!window ? "—" : window.checks === 0 ? "No checks" : problems}
        attention={problems > 0}
        detail={
          !window
            ? "Run history is not available."
            : window.checks === 0
              ? "None recorded in this period."
              : `${plural(window.checks, "check", "checks")}: ${window.completed} completed, ${window.failed} failed, ${window.stoppedEarly} stopped early${window.truncated ? " (latest checks only)" : ""}.`
        }
      />

      <MetricCard
        label="Possible matches to review"
        value={reviewNeeded ?? "—"}
        detail={`Saved in total: ${pairs.possible} possible, ${pairs.uncertain} not enough information`}
      >
        <Link href="/admin?section=matches" className={cardLinkClassName}>
          Review matches
          <ArrowRightIcon className="size-4" />
        </Link>
      </MetricCard>

      <MetricCard
        label="Claims awaiting decision"
        value={claims ? claims.awaitingDecision : "—"}
        attention={Boolean(claims && claims.assessmentRetry > 0)}
        detail={
          claims
            ? `${claims.assessmentRetry} ${claims.assessmentRetry === 1 ? "needs" : "need"} an AI assessment retry`
            : "Ownership data is not available."
        }
      >
        <Link href="/admin?section=claims" className={cardLinkClassName}>
          Open claims
          <ArrowRightIcon className="size-4" />
        </Link>
      </MetricCard>
    </dl>
  );
}

function seriesSummary<K extends string>(series: DailySeries<K>, unit: [string, string]) {
  if (series.total === 0) {
    return `No ${unit[1]} in the last ${TREND_DAYS} days.`;
  }
  const active = series.points.filter((point) => point.total > 0);
  const first = active[0].label;
  const last = active[active.length - 1].label;
  const range = first === last ? first : `${first} to ${last}`;
  const base = `${plural(series.total, unit[0], unit[1])} on ${plural(series.activeDays, "day", "days")} (${range}).`;
  return series.activeDays < MIN_TREND_DAYS ? `${base} Too few days to read a trend yet.` : base;
}

function ChartCard<K extends string>({
  title,
  description,
  series,
  categories,
  unit,
  footnote,
}: {
  title: string;
  description: string;
  series: DailySeries<K>;
  categories: BarCategory<K>[];
  unit: [string, string];
  footnote: string;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:p-5">
      <div>
        <h3 className={cardTitleClassName}>{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <p className="text-sm leading-relaxed text-foreground">{seriesSummary(series, unit)}</p>
      {series.total > 0 ? (
        <DailyBars title={title} series={series} categories={categories} unit={unit} />
      ) : (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Nothing to chart for this period.
        </p>
      )}
      <p className="text-sm leading-relaxed text-muted-foreground">{footnote}</p>
    </section>
  );
}

function RecentChecks({ snapshot }: { snapshot: MonitoringSnapshot }) {
  const { history, recentRuns, window } = snapshot;
  const counts = (run: MatchingRun) =>
    [
      ["Checked", run.checked],
      ["Possible", run.matched],
      ["Not enough info", run.uncertain],
      ["No match", run.noMatch],
      ["Failed", run.failed],
      ["Left unchecked", run.remaining ?? "—"],
    ] as const;

  let body: ReactNode;
  if (!history.available) {
    body = <Notice>Run history could not be read, so failures and early stops cannot be shown.</Notice>;
  } else if (recentRuns.length === 0) {
    body = (
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm leading-relaxed text-muted-foreground">
        {snapshot.health === "never_run" || snapshot.health === "nothing_to_check"
          ? "No checks have run yet."
          : "No checks recorded since run history began. Comparisons from before then are counted in the pair totals and the comparison chart."}
      </p>
    );
  } else {
    const failureKinds = Object.entries(window?.failureKinds ?? {}) as [RunFailure, number][];
    body = (
      <>
        {window ? (
          <p className="text-sm leading-relaxed text-foreground">
            Last {TREND_DAYS} days: {plural(window.checks, "check", "checks")}, {window.completed} completed,{" "}
            {window.failed} failed, {window.stoppedEarly} stopped early.
            {failureKinds.length > 0
              ? ` Failures: ${failureKinds.map(([kind, n]) => `${FAILURE_LABELS[kind]} (${n})`).join(", ")}.`
              : ""}
          </p>
        ) : null}

        {/* Phone: one block per check. */}
        <ol className="flex flex-col gap-2 md:hidden">
          {recentRuns.map((run, index) => (
            <li key={`${run.finishedAt}-${index}`} className="rounded-lg bg-background p-3">
              <p className={`text-sm font-semibold ${run.failure ? "text-destructive" : "text-foreground"}`}>
                {runResult(run)}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatTime(run.finishedAt)} · {SOURCE_LABELS[run.source]} · {formatDuration(run.durationMs)}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {counts(run).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium tabular-nums text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ol>

        {/* Wider screens: a real table. */}
        <div
          role="region"
          aria-label="Recent checks table"
          tabIndex={0}
          className={`hidden overflow-x-auto rounded-md md:block ${focusRingClassName}`}
        >
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Recent matching checks, newest first</caption>
            <thead className="text-muted-foreground">
              <tr className="whitespace-nowrap border-b border-border">
                <th scope="col" className="py-2 pr-3 font-medium">Finished</th>
                <th scope="col" className="py-2 pr-3 font-medium">Source</th>
                <th scope="col" className="py-2 pr-3 font-medium">Result</th>
                {counts(recentRuns[0]).map(([label]) => (
                  <th key={label} scope="col" className="py-2 pr-3 text-right font-medium">
                    {label}
                  </th>
                ))}
                <th scope="col" className="py-2 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run, index) => (
                <tr key={`${run.finishedAt}-${index}`} className="border-b border-border last:border-b-0">
                  <td className="whitespace-nowrap py-2 pr-3 text-foreground">{formatTime(run.finishedAt)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-foreground">{SOURCE_LABELS[run.source]}</td>
                  <td className={`py-2 pr-3 font-medium ${run.failure ? "text-destructive" : "text-foreground"}`}>
                    {runResult(run)}
                  </td>
                  {counts(run).map(([label, value]) => (
                    <td key={label} className="py-2 pr-3 text-right tabular-nums text-foreground">
                      {value}
                    </td>
                  ))}
                  <td className="whitespace-nowrap py-2 text-right tabular-nums text-muted-foreground">
                    {formatDuration(run.durationMs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Newest {plural(recentRuns.length, "check", "checks")}. An automatic check covers only the new
          report&apos;s pairs, so its &ldquo;Left unchecked&rdquo; counts those pairs alone.
        </p>
      </>
    );
  }

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:p-5">
      <h3 className={cardTitleClassName}>Recent checks</h3>
      {body}
      {snapshot.lastSuccessfulRunAt && snapshot.health === "last_run_failed" ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClockIcon className="size-4 shrink-0" />
          Last check that completed: {formatTime(snapshot.lastSuccessfulRunAt)}.
        </p>
      ) : null}
    </section>
  );
}

function Claims({ snapshot }: { snapshot: MonitoringSnapshot }) {
  const { claims } = snapshot;
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={cardTitleClassName}>Ownership claims</h3>
        <Link href="/admin?section=claims" className={cardLinkClassName}>
          Open claims
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>
      {claims ? (
        <>
          <dl className="flex flex-col divide-y divide-border text-sm">
            {[
              ["Awaiting staff decision", claims.awaitingDecision],
              ["AI assessment needs a retry", claims.assessmentRetry],
              ["Waiting for owner answers", claims.awaitingAnswers],
              ["Staff review without questions", claims.noQuestions],
              ["Approved for ownership follow-up", claims.approved],
              ["Rejected", claims.rejected],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-foreground">{label}</dt>
                <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Current state of {plural(claims.total, "claim", "claims")}. Decision counts are not a
            measure of AI accuracy.
          </p>
        </>
      ) : (
        <Notice>Ownership data is not available. Check that its migration is applied.</Notice>
      )}
    </section>
  );
}

export function MonitoringPanel({
  snapshot,
  reviewNeeded,
}: {
  snapshot: MonitoringSnapshot;
  // Possible matches with no current staff decision; null when not loaded.
  reviewNeeded: number | null;
}) {
  return (
    <div className="flex flex-col gap-5">
      <HealthSummary snapshot={snapshot} />
      <Metrics snapshot={snapshot} reviewNeeded={reviewNeeded} />

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Reports per day"
          description={`Lost and found reports saved in the last ${TREND_DAYS} days.`}
          series={snapshot.reportsDaily}
          categories={REPORT_CATEGORIES}
          unit={["report", "reports"]}
          footnote="Counts reports that still exist, by the day they were saved."
        />
        <ChartCard
          title="Comparison results per day"
          description={`Completed comparisons by AI result in the last ${TREND_DAYS} days.`}
          series={snapshot.comparisonsDaily}
          categories={COMPARISON_CATEGORIES}
          unit={["comparison", "comparisons"]}
          footnote="Only completed comparisons are stored per pair. Failed comparisons appear in Recent checks, never as no match."
        />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <RecentChecks snapshot={snapshot} />
        <Claims snapshot={snapshot} />
      </div>
    </div>
  );
}
