import Link from "next/link";
import type { ReactNode } from "react";
import { AlertIcon, ArrowEndIcon, CheckIcon, ClockIcon, InfoIcon } from "@/components/icons";
import { Notice, focusRingClassName, textLinkClassName } from "@/components/ui";
import { Disclosure } from "@/app/admin/parts/ui";
import { DailyBars, type BarCategory, type BarLabels, type BarPoint } from "@/app/admin/DailyBars";
import type { RunFailure } from "@/utils/monitoring/runLog";
import {
  type DemoExclusions,
  MIN_RELIABLE_REVIEWS,
  MIN_TREND_DAYS,
  TREND_DAYS,
  type ComparisonSeriesKey,
  type DailySeries,
  type MatchingRun,
  type MatchReview,
  type MonitoringSnapshot,
  type ReviewRate,
  type ReportSeriesKey,
} from "@/utils/monitoring/snapshot";
import type { Locale } from "@/i18n/config";
import { formatDate, formatDateTime, formatNumber, intlLocale } from "@/i18n/format";
import { getLocale, getMessages } from "@/i18n/server";
import { adminTools, type AdminToolsMessages } from "@/i18n/messages/admin-tools";

// Aggregate operational dashboard for local staff. Counts, times, and failure
// kinds only: never report names, descriptions, locations, IDs, questions,
// answers, tokens, or keys. Nothing here calls Gemini.
//
// Reading order: is matching healthy (one answer), then the four figures that
// decide the day's work, then the two daily charts, then the recent checks and
// the claims, then the staff approval rate.

type Messages = AdminToolsMessages["monitoring"];

type Ctx = { t: Messages; chart: AdminToolsMessages["chart"]; locale: Locale };

/* Formatting */

function time(iso: string, locale: Locale) {
  return formatDateTime(iso, locale);
}

function timeAgo(iso: string, locale: Locale, justNow: string) {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const format = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" });
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
  return justNow;
}

/** A waiting time in its largest whole unit, e.g. "3 days" or "40 minutes". */
function formatAge(ms: number, t: Messages) {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) {
    return t.underMinute;
  }
  if (minutes < 60) {
    return t.minutes(minutes);
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return t.hours(hours);
  }
  return t.daysAge(Math.floor(hours / 24));
}

function formatDuration(ms: number, { t, locale }: Ctx) {
  return ms < 1000
    ? t.ms(formatNumber(ms, locale))
    : t.seconds(formatNumber(ms / 1000, locale, { maximumFractionDigits: 1 }));
}

/** "24 Oct" for a "2026-10-24" day key, in the visitor's language. */
function dayLabel(key: string, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short" }).format(
    new Date(`${key}T12:00:00`),
  );
}

function runResult(run: MatchingRun, t: Messages) {
  if (run.failure) {
    return t.resultFailed(t.failureKinds[run.failure]);
  }
  return run.stoppedForTime ? t.resultStopped : t.resultCompleted;
}

/* Shared pieces */

const panelClassName = "flex min-w-0 flex-col gap-3 rounded-[1.5rem] bg-background p-4 sm:p-5";
const panelTitleClassName = "text-subheading text-foreground";

function Figure({ value, attention = false, size = "md" }: { value: ReactNode; attention?: boolean; size?: "md" | "lg" }) {
  return (
    <span
      className={`block font-medium leading-none tabular-nums ${size === "lg" ? "text-[2.25rem]" : "text-[1.75rem]"} ${
        attention ? "text-destructive" : "text-foreground"
      }`}
    >
      {value}
    </span>
  );
}

/* Health */

type Tone = "ok" | "problem" | "neutral";

function healthMessage(snapshot: MonitoringSnapshot, ctx: Ctx): { tone: Tone; title: string; body: string } {
  const { t, locale } = ctx;
  const { pairs, lastRun, lastComparisonAt } = snapshot;
  const remaining =
    pairs.unchecked > 0
      ? t.remainingUnchecked(pairs.unchecked)
      : pairs.total > 0
        ? t.allChecked
        : "";
  const ago = (iso: string) => timeAgo(iso, locale, t.justNow);
  const fixed = t.health[snapshot.health];
  const bodies: Record<MonitoringSnapshot["health"], () => { tone: Tone; body: string }> = {
    not_configured: () => ({ tone: "problem", body: fixed.body }),
    history_unavailable: () => ({ tone: "neutral", body: `${fixed.body} ${remaining}` }),
    nothing_to_check: () => ({ tone: "neutral", body: fixed.body }),
    never_run: () => ({ tone: "neutral", body: `${remaining} ${fixed.body}` }),
    no_recorded_checks: () => ({
      tone: "neutral",
      body: `${
        lastComparisonAt
          ? t.lastComparisonBefore(ago(lastComparisonAt), time(lastComparisonAt, locale))
          : t.earlierComparisons
      } ${fixed.body} ${remaining}`,
    }),
    last_run_failed: () => ({
      tone: "problem",
      body: lastRun
        ? `${t.lastFailed(
            t.sources[lastRun.source],
            ago(lastRun.finishedAt),
            lastRun.failure ? t.failureKinds[lastRun.failure] : t.failed,
          )} ${t.notNoMatch} ${remaining}`
        : t.notNoMatch,
    }),
    last_run_partial: () => ({
      tone: "neutral",
      body: lastRun
        ? `${t.lastPartial(t.sources[lastRun.source], ago(lastRun.finishedAt))} ${t.notNoMatch} ${remaining}`
        : t.notNoMatch,
    }),
    working: () => ({
      tone: "ok",
      body: lastRun
        ? `${t.lastWorking(t.sources[lastRun.source], ago(lastRun.finishedAt), t.pairs(lastRun.checked))} ${remaining}`
        : remaining,
    }),
  };
  const { tone, body } = bodies[snapshot.health]();
  return { tone, title: fixed.title, body: body.trim() };
}

function historyFact(snapshot: MonitoringSnapshot, { t, locale }: Ctx) {
  const { history } = snapshot;
  if (!history.available) {
    return t.historyNotAvailable;
  }
  if (history.total === 0 || !history.firstAt) {
    return t.historyNone;
  }
  return t.historySince(history.total, formatDate(history.firstAt, locale));
}

/** What the demo filter left out, as counts, so staff can trust the totals. */
function DemoExcludedNote({ excluded, t }: { excluded: DemoExclusions; t: Messages }) {
  const parts = [
    excluded.reports > 0 ? t.excludedReports(excluded.reports) : null,
    excluded.comparisons > 0 ? t.excludedComparisons(excluded.comparisons) : null,
    excluded.runs > 0 ? t.excludedRuns(excluded.runs) : null,
    excluded.claims > 0 ? t.excludedClaims(excluded.claims) : null,
  ].filter((part): part is string => Boolean(part));
  return (
    <p className="text-small text-muted-foreground">
      {parts.length === 0 ? t.demoExcludedNone : t.demoExcluded(parts.join(t.listSeparator))}
    </p>
  );
}

function HealthSummary({ snapshot, ctx }: { snapshot: MonitoringSnapshot; ctx: Ctx }) {
  const { t, locale } = ctx;
  const state = healthMessage(snapshot, ctx);
  const Icon = state.tone === "ok" ? CheckIcon : state.tone === "problem" ? AlertIcon : InfoIcon;
  // Key presence and model name are setup facts, kept out of the main view.
  const setup: [string, string][] = [
    [t.geminiKey, snapshot.geminiConfigured ? t.keyPresent : t.keyMissing],
    [t.model, snapshot.model],
  ];
  // History and failed checks are listed under "Recent checks".
  const facts: [string, string][] = [
    [
      t.lastSuccessful,
      snapshot.lastSuccessfulRun
        ? t.lastSuccessfulValue(
            time(snapshot.lastSuccessfulRun.finishedAt, locale),
            formatDuration(snapshot.lastSuccessfulRun.durationMs, ctx),
          )
        : snapshot.history.available
          ? t.noneRecorded
          : t.historyNotAvailable,
    ],
  ];
  return (
    <section
      aria-labelledby="monitoring-health"
      className={`flex min-w-0 flex-col gap-4 rounded-[1.5rem] p-4 sm:p-6 ${
        state.tone === "ok" ? "bg-ok-soft" : state.tone === "problem" ? "bg-bad-soft" : "bg-background"
      }`}
    >
      {/* A failed latest check is announced; otherwise the state is a status. */}
      <div role={state.tone === "problem" ? "alert" : "status"} className="flex items-start gap-3">
        <Icon
          className={`mt-1 size-6 shrink-0 ${
            state.tone === "ok" ? "text-ok-ink" : state.tone === "problem" ? "text-destructive" : "text-forest"
          }`}
        />
        <div className="min-w-0">
          <h3 id="monitoring-health" className="text-heading text-foreground">
            {state.title}
          </h3>
          {state.body ? <p className="mt-1.5 max-w-[62ch] text-body text-foreground">{state.body}</p> : null}
        </div>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-small sm:grid-cols-2 sm:ps-9">
        {facts.map(([label, value]) => (
          <div key={label} className="flex min-w-0 flex-wrap gap-x-1.5">
            <dt className="text-muted-foreground">{label}:</dt>
            <dd className="min-w-0 break-words font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      {snapshot.demoExcluded ? (
        <div className="sm:ps-9">
          <DemoExcludedNote excluded={snapshot.demoExcluded} t={t} />
        </div>
      ) : null}
      <div className="sm:ps-9">
        <Disclosure label={t.setupDetails}>
          <dl className="grid gap-x-6 gap-y-2 text-small sm:grid-cols-2">
            {setup.map(([label, value]) => (
              <div key={label} className="flex min-w-0 flex-wrap gap-x-1.5">
                <dt className="text-muted-foreground">{label}:</dt>
                <dd dir="auto" className="min-w-0 break-words font-medium text-foreground">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </Disclosure>
      </div>
    </section>
  );
}

/* The four figures */

function Kpi({
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
    <div className="flex min-w-0 flex-col gap-2 p-4 sm:p-5">
      <dt className="text-small font-semibold text-foreground">{label}</dt>
      <dd>
        <Figure value={value} attention={attention} />
      </dd>
      <dd className="text-small text-muted-foreground">{detail}</dd>
      {children ? <dd className="mt-auto">{children}</dd> : null}
    </div>
  );
}

function Metrics({
  snapshot,
  reviewNeeded,
  ctx,
}: {
  snapshot: MonitoringSnapshot;
  reviewNeeded: ReviewNeeded | null;
  ctx: Ctx;
}) {
  const { t, locale } = ctx;
  const { pairs, window, claims } = snapshot;
  const checkedShare = pairs.total > 0 ? Math.round((pairs.checked / pairs.total) * 100) : 0;
  const problems = window ? window.failed + window.stoppedEarly : 0;
  const n = (value: number) => formatNumber(value, locale);
  const linkClass = `${textLinkClassName} text-small`;

  return (
    <dl className="grid grid-cols-1 divide-y divide-border rounded-[1.5rem] bg-background min-[480px]:grid-cols-2 min-[480px]:divide-y-0 min-[480px]:divide-x xl:grid-cols-4">
      <Kpi
        label={t.kpiUnchecked}
        value={n(pairs.unchecked)}
        detail={t.kpiUncheckedDetail(pairs.checked, pairs.total, pairs.lostReports, pairs.foundReports)}
      >
        <div
          role="progressbar"
          aria-label={t.progressLabel}
          aria-valuemin={0}
          aria-valuemax={pairs.total}
          aria-valuenow={pairs.checked}
          className="h-1.5 overflow-hidden rounded-full bg-secondary"
        >
          <div className="h-full rounded-full bg-forest" style={{ width: `${checkedShare}%` }} />
        </div>
      </Kpi>

      <Kpi
        label={t.kpiProblems(TREND_DAYS)}
        value={!window ? "—" : window.checks === 0 ? t.kpiProblemsNone : n(problems)}
        attention={problems > 0}
        detail={
          !window
            ? t.kpiProblemsNoHistory
            : window.checks === 0
              ? t.kpiProblemsEmpty
              : t.kpiProblemsDetail(window.checks, window.completed, window.failed, window.stoppedEarly, window.truncated)
        }
      />

      <Kpi
        label={t.kpiReview}
        value={reviewNeeded === null ? "—" : n(reviewNeeded.staffReady)}
        detail={
          reviewNeeded === null
            ? t.kpiReviewUnavailable
            : t.kpiReviewDetail(reviewNeeded.open)
        }
      >
        <Link href="/admin?section=matches" className={linkClass}>
          {t.reviewMatches}
          <ArrowEndIcon className="size-4" />
        </Link>
      </Kpi>

      <Kpi
        label={t.kpiClaims}
        value={claims ? n(claims.awaitingDecision) : "—"}
        attention={Boolean(claims && claims.assessmentRetry > 0)}
        detail={
          claims ? (
            <>
              {claims.oldestWaitingMs === null ? t.kpiClaimsNone : t.kpiClaimsOldest(formatAge(claims.oldestWaitingMs, t))}
              <br />
              {t.kpiClaimsRetry(claims.assessmentRetry)}
            </>
          ) : (
            t.kpiClaimsUnavailable
          )
        }
      >
        <Link href="/admin?section=claims" className={linkClass}>
          {t.openClaims}
          <ArrowEndIcon className="size-4" />
        </Link>
      </Kpi>
    </dl>
  );
}

/* Charts */

function seriesSummary<K extends string>(
  series: DailySeries<K>,
  count: (value: number) => string,
  unitPlural: string,
  ctx: Ctx,
) {
  const { t, locale } = ctx;
  if (series.total === 0) {
    return t.seriesNone(unitPlural, TREND_DAYS);
  }
  const active = series.points.filter((point) => point.total > 0);
  const first = dayLabel(active[0].key, locale);
  const last = dayLabel(active[active.length - 1].key, locale);
  const range = first === last ? first : t.seriesRange(first, last);
  const base = t.seriesSummary(count(series.total), t.days(series.activeDays), range);
  return series.activeDays < MIN_TREND_DAYS ? `${base} ${t.seriesTooFew}` : base;
}

function toBarPoints<K extends string>(
  series: DailySeries<K>,
  categories: BarCategory<K>[],
  count: (value: number) => string,
  ctx: Ctx,
): BarPoint<K>[] {
  const { chart, locale } = ctx;
  return series.points.map((point) => {
    const label = dayLabel(point.key, locale);
    const parts = categories
      .map((category) => chart.part(point.values[category.key], category.label))
      .join(ctx.t.listSeparator);
    const countText = count(point.total);
    return {
      key: point.key,
      label,
      short: formatNumber(Number(point.key.slice(-2)), locale),
      values: point.values,
      total: point.total,
      countText,
      description: chart.describe(label, countText, point.total > 0 ? parts : ""),
    };
  });
}

function ChartCard<K extends string>({
  title,
  description,
  series,
  categories,
  count,
  unitPlural,
  footnote,
  ctx,
  bare = false,
}: {
  // Inside a disclosure: no panel fill and no repeated title.
  bare?: boolean;
  title: string;
  description: string;
  series: DailySeries<K>;
  categories: BarCategory<K>[];
  count: (value: number) => string;
  unitPlural: string;
  footnote: string;
  ctx: Ctx;
}) {
  const { t, chart } = ctx;
  const labels: BarLabels = {
    legend: chart.legend(title),
    group: chart.group(title, series.points.length),
    showTable: chart.showTable,
    hideTable: chart.hideTable,
    tableCaption: chart.tableCaption(title),
    day: chart.day,
    total: chart.total,
    otherDaysNone: chart.otherDaysNone(series.points.length),
    oldest: chart.oldest,
    newest: chart.newest,
  };
  return (
    <section aria-label={bare ? title : undefined} className={bare ? "flex min-w-0 flex-col gap-3" : panelClassName}>
      <div>
        {bare ? null : <h3 className={panelTitleClassName}>{title}</h3>}
        <p className="mt-1 text-small text-muted-foreground">{description}</p>
      </div>
      <p className="text-small text-foreground">{seriesSummary(series, count, unitPlural, ctx)}</p>
      {series.total > 0 ? (
        <DailyBars points={toBarPoints(series, categories, count, ctx)} categories={categories} labels={labels} />
      ) : (
        <p className="rounded-2xl border border-dashed border-foreground/25 px-4 py-8 text-center text-small text-muted-foreground">
          {t.nothingToChart}
        </p>
      )}
      <p className="text-small text-muted-foreground">{footnote}</p>
    </section>
  );
}

/* Recent checks */

// Checks shown on a phone before "Show more".
const PHONE_RUNS = 3;

function PhoneRuns({
  runs,
  counts,
  ctx,
}: {
  runs: MatchingRun[];
  counts: (run: MatchingRun) => [string, string][];
  ctx: Ctx;
}) {
  const { t, locale } = ctx;
  return (
    <ol className="flex flex-col gap-2">
      {runs.map((run, index) => (
        <li key={`${run.finishedAt}-${index}`} className="rounded-2xl bg-card p-4">
          <p className={`text-small font-semibold ${run.failure ? "text-destructive" : "text-foreground"}`}>
            {runResult(run, t)}
          </p>
          <p className="text-small text-muted-foreground">
            <bdi>{time(run.finishedAt, locale)}</bdi> · <bdi>{t.sources[run.source]}</bdi> ·{" "}
            <bdi>{formatDuration(run.durationMs, ctx)}</bdi>
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-small">
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
  );
}

function RecentChecks({ snapshot, ctx }: { snapshot: MonitoringSnapshot; ctx: Ctx }) {
  const { t, locale } = ctx;
  const { history, recentRuns, window } = snapshot;
  const n = (value: number) => formatNumber(value, locale);
  const counts = (run: MatchingRun): [string, string][] => [
    [t.colChecked, n(run.checked)],
    [t.colPossible, n(run.matched)],
    [t.colUncertain, n(run.uncertain)],
    [t.colNoMatch, n(run.noMatch)],
    [t.colFailed, n(run.failed)],
    [t.colRemaining, run.remaining === null ? "—" : n(run.remaining)],
  ];

  let body: ReactNode;
  if (!history.available) {
    body = <Notice surface="bg-card">{t.recentUnavailable}</Notice>;
  } else if (recentRuns.length === 0) {
    body = (
      <p className="rounded-2xl border border-dashed border-foreground/25 px-4 py-6 text-small text-muted-foreground">
        {snapshot.health === "never_run" || snapshot.health === "nothing_to_check" ? t.recentNever : t.recentNoneSince}
      </p>
    );
  } else {
    const failureKinds = Object.entries(window?.failureKinds ?? {}) as [RunFailure, number][];
    body = (
      <>
        {window ? (
          <p className="text-small text-foreground">
            {t.windowSummary(TREND_DAYS, window.checks, window.completed, window.failed, window.stoppedEarly)}
            {failureKinds.length > 0
              ? ` ${t.windowFailures(
                  failureKinds.map(([kind, count]) => `${t.failureKinds[kind]} (${n(count)})`).join(t.listSeparator),
                )}`
              : ""}
          </p>
        ) : null}

        {/* Phone: one block per check. */}
        <div className="flex flex-col gap-2 md:hidden">
          <PhoneRuns runs={recentRuns.slice(0, PHONE_RUNS)} counts={counts} ctx={ctx} />
          {recentRuns.length > PHONE_RUNS ? (
            <Disclosure label={t.moreChecks(recentRuns.length - PHONE_RUNS)}>
              <PhoneRuns runs={recentRuns.slice(PHONE_RUNS)} counts={counts} ctx={ctx} />
            </Disclosure>
          ) : null}
        </div>
        {/* Wider screens: a real table. */}
        <div
          role="region"
          aria-label={t.tableLabel}
          tabIndex={0}
          className={`hidden overflow-x-auto rounded-xl md:block ${focusRingClassName}`}
        >
          <table className="w-full text-start text-small">
            <caption className="sr-only">{t.tableCaption}</caption>
            <thead className="text-muted-foreground">
              <tr className="whitespace-nowrap border-b border-border">
                <th scope="col" className="py-2 pe-3 text-start font-medium">{t.colFinished}</th>
                <th scope="col" className="py-2 pe-3 text-start font-medium">{t.colSource}</th>
                <th scope="col" className="py-2 pe-3 text-start font-medium">{t.colResult}</th>
                {counts(recentRuns[0]).map(([label]) => (
                  <th key={label} scope="col" className="py-2 pe-3 text-end font-medium">
                    {label}
                  </th>
                ))}
                <th scope="col" className="py-2 text-end font-medium">{t.colTime}</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run, index) => (
                <tr key={`${run.finishedAt}-${index}`} className="border-b border-border last:border-b-0">
                  <td className="whitespace-nowrap py-2 pe-3 text-foreground">{time(run.finishedAt, locale)}</td>
                  <td className="whitespace-nowrap py-2 pe-3 text-foreground">{t.sources[run.source]}</td>
                  <td className={`py-2 pe-3 font-medium ${run.failure ? "text-destructive" : "text-foreground"}`}>
                    {runResult(run, t)}
                  </td>
                  {counts(run).map(([label, value]) => (
                    <td key={label} className="py-2 pe-3 text-end tabular-nums text-foreground">
                      {value}
                    </td>
                  ))}
                  <td className="whitespace-nowrap py-2 text-end tabular-nums text-muted-foreground">
                    {formatDuration(run.durationMs, ctx)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-small text-muted-foreground">{t.recentFootnote(recentRuns.length)}</p>
      </>
    );
  }

  return (
    <section className={panelClassName}>
      <h3 className={panelTitleClassName}>{t.recentTitle}</h3>
      {history.available ? (
        <p className="text-small text-foreground">
          <span className="text-muted-foreground">{t.runHistory}:</span>{" "}
          <span className="font-medium">{historyFact(snapshot, ctx)}</span>
        </p>
      ) : null}
      {body}
      {history.available && snapshot.recentFailures.length > 0 ? (
        <Disclosure label={`${t.recentFailed} (${n(snapshot.recentFailures.length)})`}>
          <ul className="flex flex-col gap-1 text-small text-foreground">
            {snapshot.recentFailures.map((failure) => (
              <li key={`${failure.finishedAt}-${failure.kind}`}>
                {/* Isolated parts keep "Gemini" and the date in order in Arabic. */}
                <bdi>{t.failureKinds[failure.kind]}</bdi>{" "}
                <span className="text-muted-foreground">
                  · <bdi>{time(failure.finishedAt, locale)}</bdi> · <bdi>{t.sources[failure.source]}</bdi>
                </span>
              </li>
            ))}
          </ul>
        </Disclosure>
      ) : null}
    </section>
  );
}

/* Claims */

function Claims({ snapshot, ctx }: { snapshot: MonitoringSnapshot; ctx: Ctx }) {
  const { t, locale } = ctx;
  const { claims } = snapshot;
  return (
    <section className={panelClassName}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={panelTitleClassName}>{t.claimsTitle}</h3>
        <Link href="/admin?section=claims" className={`${textLinkClassName} text-small`}>
          {t.openClaims}
          <ArrowEndIcon className="size-4" />
        </Link>
      </div>
      {claims ? (
        <>
          <dl className="flex flex-col divide-y divide-border text-small">
            {(
              [
                [t.claimsAwaiting, claims.awaitingDecision],
                [t.claimsRetry, claims.assessmentRetry],
                [t.claimsAnswers, claims.awaitingAnswers],
                [t.claimsNoQuestions, claims.noQuestions],
                [t.claimsApproved, claims.approved],
                [t.claimsRejected, claims.rejected],
              ] as [string, number][]
            ).map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-foreground">{label}</dt>
                <dd className="font-semibold tabular-nums text-foreground">{formatNumber(value, locale)}</dd>
              </div>
            ))}
          </dl>
          <p className="text-small text-muted-foreground">{t.claimsFootnote(claims.total)}</p>
        </>
      ) : (
        <Notice surface="bg-card">{t.ownershipUnavailable}</Notice>
      )}
    </section>
  );
}

/* Approval rate */

function rateText(rate: ReviewRate, { t, locale }: Ctx) {
  return rate.rate === null ? t.approvalNone : formatNumber(rate.rate / 100, locale, { style: "percent" });
}

function MatchReviewPanel({ review, ctx }: { review: MatchReview | null; ctx: Ctx }) {
  const { t, locale } = ctx;
  const n = (value: number) => formatNumber(value, locale);
  return (
    <section aria-labelledby="match-review-title" className={panelClassName}>
      <div>
        <h3 id="match-review-title" className={panelTitleClassName}>
          {t.approvalTitle}
        </h3>
        <p className="mt-1 max-w-[62ch] text-small text-muted-foreground">{t.approvalIntro}</p>
      </div>
      {!review ? (
        <Notice surface="bg-card">{t.ownershipUnavailable}</Notice>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            {review.rate === null ? (
              <p className="text-subheading text-muted-foreground">{rateText(review, ctx)}</p>
            ) : (
              <Figure value={rateText(review, ctx)} size="lg" />
            )}
            {review.reviewed > 0 ? (
              <dl className="flex flex-wrap gap-x-6 gap-y-1 text-small">
                {(
                  [
                    [t.approved, review.approved],
                    [t.rejected, review.rejected],
                    [t.reviewed, review.reviewed],
                  ] as [string, number][]
                ).map(([label, value]) => (
                  <div key={label} className="flex gap-1.5">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-semibold tabular-nums text-foreground">{n(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
          {review.reviewed > 0 && review.smallSample ? (
            <p className="flex items-start gap-2 text-small font-medium text-wait-ink">
              <ClockIcon className="mt-0.5 size-4 shrink-0" />
              {t.smallSample(review.reviewed)}
            </p>
          ) : null}

          <Disclosure label={t.bandsTitle}>
            <p className="text-small text-muted-foreground">{t.bandsIntro}</p>
          <ul className="grid divide-y divide-border rounded-2xl bg-card md:grid-cols-3 md:divide-x md:divide-y-0">
            {review.bands.map((band) => (
              <li key={band.key} className="flex min-w-0 flex-col gap-1.5 p-4">
                <p className="text-small font-semibold text-foreground">{t.band(t.bandLabels[band.key])}</p>
                {band.rate === null ? (
                  <p className="text-small text-muted-foreground">{t.bandNone}</p>
                ) : (
                  <Figure value={formatNumber(band.rate / 100, locale, { style: "percent" })} />
                )}
                <p className="text-small text-muted-foreground">
                  {band.reviewed === 0 ? t.bandEmpty : t.bandDetail(band.approved, band.rejected, band.reviewed)}
                </p>
                {band.reviewed > 0 && band.smallSample ? (
                  <p className="text-small font-medium text-wait-ink">{t.bandSmall(MIN_RELIABLE_REVIEWS)}</p>
                ) : null}
              </li>
            ))}
          </ul>
          </Disclosure>
          <p className="max-w-[72ch] text-small text-muted-foreground">{t.approvalFootnote(review.unscored)}</p>
        </>
      )}
    </section>
  );
}

/* Demo */

function DemoBanner({ demo, t }: { demo: boolean; t: Messages }) {
  const link = `font-semibold text-foreground underline underline-offset-4 ${focusRingClassName}`;
  if (demo) {
    return (
      <Notice role="status" tone="warning" title={t.demoTitle}>
        {t.demoBody}{" "}
        <Link href="/admin?section=monitoring&demo=0" className={link}>
          {t.demoShowReal}
        </Link>
      </Notice>
    );
  }
  if (process.env.NODE_ENV !== "development") {
    return null;
  }
  return (
    <p className="text-small text-muted-foreground">
      {t.devOnly}{" "}
      <Link href="/admin?section=monitoring&demo=1" className={link}>
        {t.demoPreview}
      </Link>
    </p>
  );
}

export type ReviewNeeded = {
  // Owner has answered: staff decide now. The Matches nav badge counts these.
  staffReady: number;
  // Every possible match without a staff decision, including those waiting on owners.
  open: number;
};

export async function MonitoringPanel({
  snapshot,
  reviewNeeded,
  demo = false,
}: {
  snapshot: MonitoringSnapshot;
  // Possible matches with no staff decision; null when not loaded.
  reviewNeeded: ReviewNeeded | null;
  // Development-only synthetic snapshot; never mixed with live counts.
  demo?: boolean;
}) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages(adminTools)]);
  const ctx: Ctx = { t: messages.monitoring, chart: messages.chart, locale };
  const { t } = ctx;

  // Brand hues on the data only. Lost and found also differ in the legend and
  // the table; brass is a fill here, never text.
  const reportCategories: BarCategory<ReportSeriesKey>[] = [
    { key: "lost", label: t.lost, swatch: "bg-brass" },
    { key: "found", label: t.found, swatch: "bg-forest" },
  ];
  const comparisonCategories: BarCategory<ComparisonSeriesKey>[] = [
    { key: "match", label: t.possibleMatch, swatch: "bg-forest" },
    { key: "insufficient_information", label: t.notEnoughInfo, swatch: "bg-brass" },
    { key: "no_match", label: t.noMatch, swatch: "bg-sage" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <DemoBanner demo={demo} t={t} />
      <HealthSummary snapshot={snapshot} ctx={ctx} />
      <Metrics snapshot={snapshot} reviewNeeded={reviewNeeded} ctx={ctx} />

      {/* One chart answers "is checking keeping up?"; report intake is on demand. */}
      <ChartCard
        title={t.comparisonsTitle}
        description={t.comparisonsIntro(TREND_DAYS)}
        series={snapshot.comparisonsDaily}
        categories={comparisonCategories}
        count={t.comparisons}
        unitPlural={t.comparisonsPlural}
        footnote={t.comparisonsFootnote}
        ctx={ctx}
      />

      <div className="grid items-start gap-5 min-[1600px]:grid-cols-[minmax(0,1fr)_20rem]">
        <RecentChecks snapshot={snapshot} ctx={ctx} />
        <Claims snapshot={snapshot} ctx={ctx} />
      </div>

      <MatchReviewPanel review={snapshot.matchReview} ctx={ctx} />

      <Disclosure label={t.reportsTitle} className="rounded-[1.5rem] bg-background px-4 py-1.5 sm:px-5">
        <div className="mb-3">
          <ChartCard
            title={t.reportsTitle}
            description={t.reportsIntro(TREND_DAYS)}
            series={snapshot.reportsDaily}
            categories={reportCategories}
            count={t.reports}
            unitPlural={t.reportsPlural}
            footnote={t.reportsFootnote}
            ctx={ctx}
            bare
          />
        </div>
      </Disclosure>
    </div>
  );
}
