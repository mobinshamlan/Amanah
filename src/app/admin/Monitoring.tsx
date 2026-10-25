import Link from "next/link";
import type { ReactNode } from "react";
import { AlertIcon, ArrowRightIcon, CheckIcon, ClockIcon, InfoIcon } from "@/components/icons";
import { Notice, focusRingClassName } from "@/components/ui";
import { DailyBars, type BarCategory } from "@/app/admin/DailyBars";
import type { RunFailure } from "@/utils/monitoring/runLog";
import {
  MIN_RELIABLE_REVIEWS,
  MIN_TREND_DAYS,
  TREND_DAYS,
  type ComparisonSeriesKey,
  type DailySeries,
  type MatchingHealth,
  type MatchingRun,
  type MatchReview,
  type MonitoringSnapshot,
  type ReviewRate,
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

const cardLinkClassName = `-ml-1.5 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full px-1.5 text-[0.9375rem] font-semibold text-foreground underline-offset-4 transition-colors hover:text-forest hover:underline ${focusRingClassName}`;

const cardTitleClassName = "font-serif text-[1.5rem] font-semibold leading-tight text-foreground";

// Panels on the work sheet: a step of tone, no outline.
const panelClassName = "flex min-w-0 flex-col gap-3 rounded-[1.5rem] bg-background p-4 sm:p-5";

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
      body: `${remaining} Run Check for matches from Possible matches to start.`,
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
      className={`rounded-[1.5rem] p-4 sm:p-6 ${
        state.tone === "ok"
          ? "bg-ok-soft"
          : state.tone === "problem"
            ? "bg-bad-soft"
            : "bg-background"
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
              className="font-serif text-[1.75rem] font-semibold leading-tight text-foreground"
            >
              {state.title}
            </h3>
            <p className="mt-1.5 max-w-2xl text-[0.9375rem] leading-relaxed text-foreground">{state.body}</p>
          </div>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm sm:pl-12">
          {[
            ["Gemini key", snapshot.geminiConfigured ? "Configured" : "Missing"],
            ["Model", snapshot.model],
            ["Run history", historyFact(snapshot)],
          ].map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-wrap gap-x-1.5">
              <dt className="text-muted-foreground">{label}:</dt>
              <dd className="font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
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
    <div className="flex min-w-0 flex-col gap-2 rounded-[1.5rem] bg-background p-4 sm:p-5">
      <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
      <dd
        className={`text-[2.25rem] font-semibold leading-none tracking-[-0.03em] tabular-nums ${
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
          className="h-2 overflow-hidden rounded-full bg-secondary"
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
    <section className={panelClassName}>
      <div>
        <h3 className={cardTitleClassName}>{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <p className="text-sm leading-relaxed text-foreground">{seriesSummary(series, unit)}</p>
      {series.total > 0 ? (
        <DailyBars title={title} series={series} categories={categories} unit={unit} />
      ) : (
        <p className="rounded-2xl border border-dashed border-foreground/20 px-4 py-8 text-center text-sm text-muted-foreground">
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
      <p className="rounded-2xl border border-dashed border-foreground/20 px-4 py-6 text-sm leading-relaxed text-muted-foreground">
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
            <li key={`${run.finishedAt}-${index}`} className="rounded-2xl bg-card p-4">
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
          className={`hidden overflow-x-auto rounded-xl md:block ${focusRingClassName}`}
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
    <section className={panelClassName}>
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
    <section className={panelClassName}>
      <div className="flex flex-wrap items-center justify-between gap-2">
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

function rateText(rate: ReviewRate) {
  return rate.rate === null ? "No reviewed claims yet" : `${rate.rate}%`;
}

function MatchReviewPanel({ review }: { review: MatchReview | null }) {
  return (
    <section aria-labelledby="match-review-title" className={panelClassName}>
      <div>
        <h3 id="match-review-title" className={cardTitleClassName}>
          Staff-reviewed match rate
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          How often staff approved an AI-suggested match once they decided on its
          ownership claim. An AI accuracy signal based on staff decisions.
        </p>
      </div>
      {!review ? (
        <Notice>Ownership data is not available. Check that its migration is applied.</Notice>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <p
              className={`font-semibold leading-none tracking-[-0.03em] tabular-nums ${
                review.rate === null ? "text-[1.5rem] text-muted-foreground" : "text-[2.75rem] text-foreground"
              }`}
            >
              {rateText(review)}
            </p>
            {review.reviewed > 0 ? (
              <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {[
                  ["Approved", review.approved],
                  ["Rejected", review.rejected],
                  ["Reviewed", review.reviewed],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-1.5">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
          {review.reviewed > 0 && review.smallSample ? (
            <p className="text-sm font-medium text-wait-ink">
              Small sample: only {plural(review.reviewed, "decision", "decisions")} so far. Do not
              read a trend into this yet.
            </p>
          ) : null}

          <div>
            <h4 className="text-base font-semibold text-foreground">By AI similarity score</h4>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Bands group the AI&apos;s similarity scores. They are not calibrated confidence
              levels.
            </p>
          </div>
          <ul className="grid gap-3 md:grid-cols-3">
            {review.bands.map((band) => (
              <li key={band.key} className="flex min-w-0 flex-col gap-1.5 rounded-2xl bg-card p-4">
                <p className="text-sm font-semibold text-foreground">Score {band.label}</p>
                <p
                  className={`font-semibold leading-none tracking-[-0.03em] tabular-nums ${
                    band.rate === null ? "text-base text-muted-foreground" : "text-[2rem] text-foreground"
                  }`}
                >
                  {band.rate === null ? "No reviewed claims" : `${band.rate}%`}
                </p>
                <p className="text-sm leading-snug text-muted-foreground">
                  {band.reviewed === 0
                    ? "No data in this band."
                    : `${band.approved} approved, ${band.rejected} rejected · ${plural(band.reviewed, "decision", "decisions")}`}
                </p>
                {band.reviewed > 0 && band.smallSample ? (
                  <p className="text-sm font-medium text-wait-ink">
                    Small sample (under {MIN_RELIABLE_REVIEWS}). Not a trend.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Counts only claims with a current approved or rejected decision. Pending claims, claims
            reset to pending
            {review.unscored > 0
              ? `, and ${plural(review.unscored, "decided claim", "decided claims")} with no similarity score (in the total, not in a band)`
              : ", and unscored claims"}{" "}
            are left out of the bands. This is not independently verified ground-truth accuracy:
            staff decisions can be wrong, and rejected claims may still be the right item.
          </p>
        </>
      )}
    </section>
  );
}

function DemoBanner({ demo }: { demo: boolean }) {
  if (demo) {
    return (
      <Notice role="status" surface="bg-clay/15">
        <span className="font-semibold text-clay-ink">DEMO DATA</span>
        <span className="font-normal">
          {" "}
          Synthetic figures for local layout checks. Nothing was read from or
          written to the database, and Gemini was not called.{" "}
          <Link
            href="/admin?section=monitoring&demo=0"
            className={`font-semibold text-foreground underline underline-offset-4 ${focusRingClassName}`}
          >
            Show real data
          </Link>
        </span>
      </Notice>
    );
  }
  if (process.env.NODE_ENV !== "development") {
    return null;
  }
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">
      Local development only.{" "}
      <Link
        href="/admin?section=monitoring&demo=1"
        className={`font-semibold text-foreground underline underline-offset-4 ${focusRingClassName}`}
      >
        Preview with demo data
      </Link>
    </p>
  );
}

export function MonitoringPanel({
  snapshot,
  reviewNeeded,
  demo = false,
}: {
  snapshot: MonitoringSnapshot;
  // Possible matches with no current staff decision; null when not loaded.
  reviewNeeded: number | null;
  // Development-only synthetic snapshot; never mixed with live counts.
  demo?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <DemoBanner demo={demo} />
      <HealthSummary snapshot={snapshot} />
      <Metrics snapshot={snapshot} reviewNeeded={reviewNeeded} />
      <MatchReviewPanel review={snapshot.matchReview} />

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
