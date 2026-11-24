"use client";

import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import type { PublicMatchingStatus } from "@/utils/matching/publicStatus";
import { CaseTag } from "@/app/report/track/parts/CaseTag";
import { ProgressLine } from "@/app/report/track/parts/ProgressLine";
import { buildSteps, isPossibleMatch } from "@/app/report/track/parts/steps";
import {
  SceneNote,
  TrackScene,
  type SceneArt,
  type SceneMark,
} from "@/app/report/track/parts/TrackScene";
import {
  ArrowEndIcon,
  ClockIcon,
  HandIcon,
  KeyholeGlyph,
  PlusIcon,
  RefreshIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/icons";
import {
  ReportKindCue,
  Spinner,
  primaryButtonClassName,
  secondaryButtonClassName,
  textLinkClassName,
} from "@/components/ui";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { useMessages } from "@/i18n/LocaleProvider";
import { common } from "@/i18n/messages/common";
import { track, type TrackMessages } from "@/i18n/messages/track";

export type MatchingView =
  | PublicMatchingStatus
  | { phase: "stalled" }
  | { phase: "lost_access" };

/** Where the owner's claim stands, as shown by the ownership verification card. */
export type OwnershipStage =
  | "loading"
  | "question"
  | "followup"
  | "retry"
  | "staff_review"
  | "answers_received"
  | "approved"
  | "rejected";

/* Headlines */

export type HeadlineTone = "busy" | "notice" | "neutral" | "match" | "ok" | "bad";

export type Headline = {
  title: string;
  intro: string;
  // A second short sentence, e.g. "some other comparisons did not finish".
  extra?: string;
  tone: HeadlineTone;
};

/**
 * The one headline a lost reporter sees: what is happening and what to do now.
 * Ownership takes over the headline once a possible match has questions or a
 * decision; otherwise the matching phase decides.
 */
export function lostHeadline(
  t: TrackMessages,
  view: MatchingView,
  waiting: boolean,
  ownership?: OwnershipStage | null,
): Headline {
  if (isPossibleMatch(view)) {
    if (!waiting && ownership) {
      const copy = t.ownership[ownership];
      const tone: HeadlineTone =
        ownership === "approved"
          ? "ok"
          : ownership === "rejected"
            ? "bad"
            : ownership === "staff_review" || ownership === "answers_received"
              ? "neutral"
              : "match";
      return { ...copy, tone };
    }
    const partial =
      !waiting &&
      (view.phase === "failed" || view.phase === "unavailable" || view.phase === "rate_limited");
    return {
      ...t.status.possibleMatch,
      extra: partial ? t.status.possibleMatchPartial : undefined,
      tone: "match",
    };
  }
  if (waiting) {
    return view.phase === "rate_limited"
      ? { ...t.status.pausedWaiting, tone: "busy" }
      : { ...t.status.checking, tone: "busy" };
  }
  switch (view.phase) {
    case "complete":
      return "outcome" in view && view.outcome === "uncertain"
        ? { ...t.status.uncertain, tone: "neutral" }
        : { ...t.status.noMatch, tone: "neutral" };
    case "rate_limited":
      return { ...t.status.pausedStopped, tone: "notice" };
    case "unavailable":
      return { ...t.status.unavailable, tone: "notice" };
    case "stalled":
      return { ...t.status.stalled, tone: "notice" };
    case "lost_access":
      return { ...t.status.lostAccess, tone: "neutral" };
    default:
      return { ...t.status.failed, tone: "notice" };
  }
}

function foundNote(t: TrackMessages, view: MatchingView, waiting: boolean, canRetry: boolean) {
  if (waiting) {
    return view.phase === "rate_limited" ? t.found.finishingPaused : t.found.finishing;
  }
  switch (view.phase) {
    case "complete":
    case "lost_access":
      return null;
    case "stalled":
      return t.found.stalled;
    case "rate_limited":
      return t.found.rateLimited;
    default:
      return canRetry ? t.found.failedRetry : t.found.failed;
  }
}

// Callers without the visitor's messages (the report form's live line) still
// speak the page's language: read it from <html lang>, set by the root layout.
function pageMessages(): TrackMessages {
  if (typeof document !== "undefined") {
    const lang = document.documentElement.lang;
    if (isLocale(lang)) return track[lang];
  }
  return track[DEFAULT_LOCALE];
}

/**
 * One sentence for the page's live status line. Pass the visitor's messages
 * (`useMessages(track)`); without them the page's language is used.
 */
export function statusMessage(
  reportType: "lost" | "found",
  view: MatchingView,
  waiting: boolean,
  t: TrackMessages = pageMessages(),
  ownership?: OwnershipStage | null,
) {
  if (reportType === "found") {
    const note = foundNote(t, view, waiting, false);
    const base = waiting ? t.found.announce.checking : t.found.announce.complete;
    return note ? `${base} ${note}` : base;
  }
  const headline = lostHeadline(t, view, waiting, ownership);
  return [headline.title + ".", headline.intro, headline.extra].filter(Boolean).join(" ");
}

/** The lost report's progress line: the four stages, from the same state as everything else. */
export function LostProgress({
  view,
  waiting,
  ownership,
  children,
}: {
  view: MatchingView;
  waiting: boolean;
  ownership?: OwnershipStage | null;
  children?: ReactNode;
}) {
  const t = useMessages(track);
  const steps = buildSteps(t, view, waiting, ownership);
  // Say plainly when there is nothing to answer, rather than implying questions will come.
  const conditional = !waiting && steps.some((step) => step.state === "conditional");
  return (
    <ProgressLine steps={steps} label={t.steps.title} note={conditional ? t.steps.conditionalNote : undefined}>
      {children}
    </ProgressLine>
  );
}

/* Scene */

/** The desk render and headline mark for this moment. */
export function sceneFor(
  headline: Headline,
  ownership?: OwnershipStage | null,
): { art: SceneArt; mark: SceneMark } {
  switch (ownership) {
    // The handover parcel only once staff approve; waiting and a rejection
    // stay at the questions and the comparison.
    case "staff_review":
    case "answers_received":
      return { art: "question", mark: "hand" };
    case "approved":
      return { art: "handover", mark: "check" };
    case "rejected":
      return { art: "compare", mark: "x" };
  }
  if (headline.tone === "match") return { art: "question", mark: "question" };
  if (headline.tone === "notice") return { art: "compare", mark: "pause" };
  return { art: "compare", mark: "lens" };
}

/* Actions */

/** Whether checking can be continued from this page ("Try again" or "Refresh"). */
export function canContinue(view: MatchingView, waiting: boolean, canRetry: boolean) {
  return !waiting && (canRetry || view.phase === "stalled");
}

/** The one action that keeps checking going, when there is one. */
export function RetryAction({
  view,
  waiting,
  canRetry,
  onRetry,
}: {
  view: MatchingView;
  waiting: boolean;
  canRetry: boolean;
  onRetry: () => void;
}) {
  const t = useMessages(track);
  if (waiting) return null;
  if (canRetry) {
    return (
      <button type="button" onClick={onRetry} className={`${primaryButtonClassName} sm:self-start`}>
        <RefreshIcon className="size-4" />
        {t.actions.tryAgain}
      </button>
    );
  }
  if (view.phase === "stalled") {
    return (
      <button
        type="button"
        onClick={() => window.location.reload()}
        className={`${primaryButtonClassName} sm:self-start`}
      >
        <RefreshIcon className="size-4" />
        {t.actions.refresh}
      </button>
    );
  }
  return null;
}

/** The quieter ways on: report another item, or go home. */
export function MoreActions({
  waiting,
  reportAnotherLabel,
  onReportAnother,
}: {
  waiting: boolean;
  reportAnotherLabel: string;
  onReportAnother: () => void;
}) {
  const c = useMessages(common);
  if (waiting) return null;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
      <button type="button" onClick={onReportAnother} className={secondaryButtonClassName}>
        <PlusIcon className="size-4" />
        {reportAnotherLabel}
      </button>
      <Link href="/" className={textLinkClassName}>
        {c.backHome}
        <ArrowEndIcon className="size-4" />
      </Link>
    </div>
  );
}

/* Found confirmation */

type ConfirmationProps = {
  view: MatchingView;
  isContinuing: boolean;
  canRetry: boolean;
  onRetry: () => void;
  onReportAnother: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
};

/**
 * The finder's confirmation: the headline is the one thing left to do (hand
 * the item in), the thanks follows, and the tag says what happens after.
 * Nothing about matches, ever.
 */
export function FoundConfirmation({
  view,
  isContinuing,
  canRetry,
  onRetry,
  onReportAnother,
  headingRef,
}: ConfirmationProps) {
  const t = useMessages(track);
  const c = useMessages(common);
  const note = foundNote(t, view, isContinuing, canRetry);
  const warn = !isContinuing && (view.phase === "stalled" || view.phase === "rate_limited");

  return (
    <TrackScene
      art="handover"
      mark="hand"
      // The tag says how to hand the item in, so on phones it comes first and the render waits.
      stage="task"
      title={t.found.title}
      intro={t.found.intro}
      headingRef={headingRef}
      progress={
        // Only the stages a found report has: nothing about comparisons or ownership.
        <ProgressLine
          label={t.steps.title}
          steps={[
            { key: "saved", state: "done", label: t.steps.labels.saved, short: t.steps.short.saved },
            { key: "hand-in", state: "active", label: t.found.steps.handIn, short: t.found.steps.handInShort },
          ]}
        />
      }
      sheet={
        <div className="relative w-full max-w-[32rem] pt-10">
          <span aria-hidden className="track-string absolute top-0 h-[4.25rem] w-0.5 -translate-x-1/2 bg-brass-light rtl:translate-x-1/2" />
          <span aria-hidden className="track-string absolute top-0 size-2 -translate-x-1/2 rounded-full bg-brass-light rtl:translate-x-1/2" />
          <section aria-labelledby="hand-in-title" aria-busy={isContinuing} className="track-tag relative isolate">
            <span aria-hidden className="shape-tag absolute inset-0 -z-10 bg-card" />
            <span aria-hidden className="eyelet absolute start-4 top-4 size-6 bg-pine-deep" />
            <div className="flex flex-col gap-4 px-6 pb-7 pt-12 sm:px-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <HandIcon className="size-8 text-brass-ink" />
                <ReportKindCue kind="found">{c.kindFound}</ReportKindCue>
              </div>
              <h2 id="hand-in-title" className="text-heading text-foreground">
                {t.found.howTitle}
              </h2>
              <ul className="flex flex-col gap-3">
                {t.found.howSteps.map((line) => (
                  <li key={line} className="flex gap-3 text-body text-foreground">
                    <KeyholeGlyph className="mt-[0.45em] size-4 shrink-0 text-forest" />
                    <span className="min-w-0 max-w-[52ch] break-words">{line}</span>
                  </li>
                ))}
              </ul>
              <span aria-hidden className="perforation block text-foreground/20" />
              <div>
                <h3 className="text-subheading text-foreground">{t.found.nextTitle}</h3>
                <p className="mt-1 max-w-[52ch] text-body text-foreground/85">{t.found.nextBody}</p>
              </div>
              {note ? (
                <p
                  className={`flex items-start gap-2 text-small font-medium ${warn ? "text-wait-ink" : "text-forest"}`}
                >
                  {isContinuing ? (
                    <Spinner className="mt-1 size-4" />
                  ) : (
                    <ClockIcon className="mt-1 size-4 shrink-0" />
                  )}
                  <span>{note}</span>
                </p>
              ) : null}
              <RetryAction view={view} waiting={isContinuing} canRetry={canRetry} onRetry={onRetry} />
            </div>
          </section>
        </div>
      }
      aside={
        isContinuing ? null : (
          <MoreActions
            waiting={isContinuing}
            reportAnotherLabel={t.actions.reportAnotherFound}
            onReportAnother={onReportAnother}
          />
        )
      }
    />
  );
}

/* Lost confirmation */

/**
 * A lost report's status on the report form itself, used only when there is
 * no private link to move to (the tracking page is the usual next screen).
 */
export function LostConfirmation({
  title,
  intro,
  children,
  view,
  isContinuing,
  canRetry,
  onRetry,
  onReportAnother,
  headingRef,
}: ConfirmationProps & {
  title: string;
  intro: ReactNode;
  // Shown under the status tag, e.g. a note that there is no tracking link.
  children?: ReactNode;
}) {
  const t = useMessages(track);
  const headline = lostHeadline(t, view, isContinuing);

  return (
    <TrackScene
      {...sceneFor(headline)}
      mark="check"
      title={title}
      intro={intro}
      headingRef={headingRef}
      progress={<LostProgress view={view} waiting={isContinuing} />}
      sheet={
        <>
          <CaseTag view={view} waiting={isContinuing}>
            <div>
              <p className="text-subheading text-foreground">{headline.title}</p>
              <p className="mt-1 text-body text-foreground/85">
                {headline.intro} {headline.extra}
              </p>
            </div>
            <RetryAction view={view} waiting={isContinuing} canRetry={canRetry} onRetry={onRetry} />
          </CaseTag>
          {children}
        </>
      }
      aside={
        <>
          {headline.tone === "match" ? <SceneNote icon={<ShieldIcon className="size-4" />}>{t.aiNote}</SceneNote> : null}
          <SceneNote icon={<UserIcon className="size-4" />}>{t.staffContact}</SceneNote>
          <MoreActions
            waiting={isContinuing}
            reportAnotherLabel={t.actions.reportAnotherLost}
            onReportAnother={onReportAnother}
          />
        </>
      }
    />
  );
}
