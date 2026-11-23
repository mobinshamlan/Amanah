"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import type { PublicMatchingStatus } from "@/utils/matching/publicStatus";
import {
  CheckIcon,
  ClockIcon,
  CopyIcon,
  HandIcon,
  LockIcon,
  SendIcon,
  XIcon,
} from "@/components/icons";
import {
  Notice,
  PageHeading,
  fieldClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
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

function isPossibleMatch(view: MatchingView) {
  return "outcome" in view && view.outcome === "possible_match";
}

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

/** The same sentence, in the visitor's language. For client components. */
export function useStatusMessage(
  reportType: "lost" | "found",
  view: MatchingView | null,
  waiting: boolean,
  ownership?: OwnershipStage | null,
) {
  const t = useMessages(track);
  return view ? statusMessage(reportType, view, waiting, t, ownership) : "";
}

/* Step timeline */

type StepState = "done" | "active" | "paused" | "waiting" | "stopped" | "rejected" | "upcoming";

type Step = { key: string; state: StepState; label: string; detail: string };

function PauseBars({ className = "bg-forest" }: { className?: string }) {
  return (
    <span className="flex gap-[3px]">
      <span className={`h-2.5 w-[3px] rounded-full ${className}`} />
      <span className={`h-2.5 w-[3px] rounded-full ${className}`} />
    </span>
  );
}

function StepNode({ state }: { state: StepState }) {
  // Opaque fills so the track passes behind a node, never through it. One short
  // pop when a node changes state; nothing loops except the "in progress" dot.
  const base =
    "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full motion-safe:animate-pop";
  switch (state) {
    case "done":
      return (
        <span aria-hidden className={`${base} bg-pine-deep text-paper`}>
          <CheckIcon className="size-5" />
        </span>
      );
    case "rejected":
      return (
        <span aria-hidden className={`${base} bg-destructive text-paper`}>
          <XIcon className="size-5" />
        </span>
      );
    case "active":
      return (
        <span aria-hidden className={`${base} border-2 border-forest bg-card`}>
          <span className="size-3 rounded-full bg-forest motion-safe:animate-breathe" />
        </span>
      );
    case "paused":
      return (
        <span aria-hidden className={`${base} border-2 border-forest bg-card`}>
          <PauseBars />
        </span>
      );
    case "waiting":
      return (
        <span aria-hidden className={`${base} border-2 border-forest bg-card text-forest`}>
          <ClockIcon className="size-5" />
        </span>
      );
    case "stopped":
      return (
        <span aria-hidden className={`${base} border-2 border-wait-ink/60 bg-card`}>
          <PauseBars className="bg-wait-ink" />
        </span>
      );
    default:
      return (
        <span aria-hidden className={`${base} border-2 border-border bg-card`}>
          <span className="size-2 rounded-full bg-border" />
        </span>
      );
  }
}

function matchingStep(t: TrackMessages, view: MatchingView, waiting: boolean): Step {
  const d = t.steps.detail;
  const label = t.steps.labels.matching;
  if (waiting) {
    if (view.phase === "rate_limited") {
      return { key: "matching", state: "paused", label, detail: d.matchingPaused };
    }
    return {
      key: "matching",
      state: "active",
      label,
      detail: isPossibleMatch(view) ? d.matchingActiveMatch : d.matchingActive,
    };
  }
  if (view.phase === "complete") {
    return { key: "matching", state: "done", label, detail: d.matchingDone };
  }
  return {
    key: "matching",
    state: "stopped",
    label,
    detail: view.phase === "lost_access" ? d.matchingLostAccess : d.matchingStopped,
  };
}

function ownershipSteps(
  t: TrackMessages,
  view: MatchingView,
  waiting: boolean,
  ownership: OwnershipStage | null | undefined,
): [Step, Step] {
  const d = t.steps.detail;
  const q = t.steps.labels.questions;
  const dec = t.steps.labels.decision;
  const decisionUpcoming: Step = { key: "decision", state: "upcoming", label: dec, detail: d.decisionUpcoming };
  const possible = isPossibleMatch(view);

  if (!possible || !ownership) {
    return [
      {
        key: "questions",
        state: "upcoming",
        label: q,
        detail: possible && waiting ? d.questionsAfterMatch : d.questionsUpcoming,
      },
      decisionUpcoming,
    ];
  }
  const questionsDone = (detail: string): Step => ({ key: "questions", state: "done", label: q, detail });
  switch (ownership) {
    case "loading":
      return [{ key: "questions", state: "active", label: q, detail: d.questionsLoading }, decisionUpcoming];
    case "question":
      return [{ key: "questions", state: "active", label: q, detail: d.questionsActive }, decisionUpcoming];
    case "followup":
      return [{ key: "questions", state: "active", label: q, detail: d.questionsFollowup }, decisionUpcoming];
    case "retry":
      return [{ key: "questions", state: "stopped", label: q, detail: d.questionsRetry }, decisionUpcoming];
    case "staff_review":
      return [
        questionsDone(d.questionsNoneNeeded),
        { key: "decision", state: "waiting", label: dec, detail: d.decisionWaiting },
      ];
    case "answers_received":
      return [
        questionsDone(d.questionsAnswered),
        { key: "decision", state: "waiting", label: dec, detail: d.decisionWaitingAnswers },
      ];
    case "approved":
      return [
        questionsDone(d.questionsCompleted),
        { key: "decision", state: "done", label: dec, detail: d.decisionApproved },
      ];
    case "rejected":
      return [
        questionsDone(d.questionsCompleted),
        { key: "decision", state: "rejected", label: dec, detail: d.decisionRejected },
      ];
  }
}

export function buildSteps(
  t: TrackMessages,
  view: MatchingView,
  waiting: boolean,
  ownership?: OwnershipStage | null,
): Step[] {
  return [
    { key: "saved", state: "done", label: t.steps.labels.saved, detail: t.steps.detail.saved },
    matchingStep(t, view, waiting),
    ...ownershipSteps(t, view, waiting, ownership),
  ];
}

/**
 * The report's four stages on a paper slip, read top to bottom in either
 * direction. Every node also carries its state in words.
 */
export function JourneySteps({
  view,
  waiting,
  ownership,
  className = "",
}: {
  view: MatchingView;
  waiting: boolean;
  ownership?: OwnershipStage | null;
  className?: string;
}) {
  const t = useMessages(track);
  const steps = buildSteps(t, view, waiting, ownership);
  const current = steps.findIndex((step) => step.state !== "done" && step.state !== "upcoming");

  return (
    <section
      aria-labelledby="journey-steps-title"
      aria-busy={waiting}
      className={`edge-torn bg-card px-5 pt-6 sm:px-7 ${className}`}
    >
      <h2 id="journey-steps-title" className="text-subheading font-semibold text-foreground">
        {t.steps.title}
      </h2>
      <ol className="mt-4 flex flex-col">
        {steps.map((step, index) => {
          const last = index === steps.length - 1;
          const next = steps[index + 1];
          // The track below a node is filled once that stage is done.
          const trackClass =
            step.state === "done"
              ? next?.state === "rejected"
                ? "bg-destructive"
                : "bg-pine-deep"
              : "bg-secondary";
          const stateClass =
            step.state === "rejected"
              ? "text-bad-ink"
              : step.state === "stopped"
                ? "text-wait-ink"
                : step.state === "upcoming"
                  ? "text-muted-foreground"
                  : "text-forest";
          return (
            <li
              key={step.key}
              aria-current={index === current ? "step" : undefined}
              className={`relative flex gap-4 ${last ? "" : "pb-6"}`}
            >
              <div className="flex shrink-0 flex-col items-center">
                <StepNode key={step.state} state={step.state} />
                {last ? null : (
                  <span aria-hidden className={`-my-1 w-1 flex-1 rounded-full ${trackClass}`} />
                )}
              </div>
              <div className="min-w-0 flex-1 pt-1.5">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="sr-only">{t.steps.step(index + 1)}: </span>
                  <span
                    className={`text-body font-semibold ${
                      step.state === "upcoming" ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className={`text-small font-medium ${stateClass}`}>
                    <span className="sr-only">, </span>
                    {t.steps.state[step.state]}
                  </span>
                </p>
                <p
                  className={`mt-0.5 text-small ${
                    step.state === "upcoming" ? "text-muted-foreground" : "text-foreground/80"
                  }`}
                >
                  {step.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* Private link */

const subscribeNever = () => () => {};

/**
 * The owner's private link with a copy button, a "send to myself" share when
 * the browser offers one, and the bookmark fallback. `focal` is the brass,
 * highlighted version shown right after the report is saved.
 */
export function TrackingLinkCard({
  url,
  focal = false,
  headingRef,
  className = "",
}: {
  url: string;
  focal?: boolean;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  className?: string;
}) {
  const t = useMessages(track);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed" | "shareFailed">("idle");
  // Browser-only: false on the server and during hydration, then the real answer.
  const canShare = useSyncExternalStore(
    subscribeNever,
    () => typeof navigator.share === "function",
    () => false,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
    } catch {
      inputRef.current?.select();
      setCopyState("failed");
    }
  }

  async function shareLink() {
    try {
      await navigator.share({ title: t.link.shareTitle, text: t.link.shareText, url });
    } catch (error) {
      // Closing the share sheet is not a failure.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setCopyState("shareFailed");
    }
  }

  const statusText =
    copyState === "copied"
      ? t.link.copiedStatus
      : copyState === "failed"
        ? t.link.copyFailed
        : copyState === "shareFailed"
          ? t.link.shareFailed
          : "";

  return (
    <section
      id="private-link"
      aria-labelledby="tracking-link-title"
      className={`relative isolate scroll-mt-6 rounded-[1.75rem] p-5 sm:p-7 ${
        focal ? "bg-brass-soft" : "bg-secondary"
      } ${className}`}
    >
      {focal ? (
        // The brass eyelet: this is the one highlighted thing on the screen.
        <span aria-hidden className="eyelet absolute end-6 top-6 size-5 bg-paper sm:end-7 sm:top-7" />
      ) : null}
      <h2
        id="tracking-link-title"
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        className={`${focal ? "text-heading pe-9" : "text-subheading font-semibold"} text-foreground outline-none`}
      >
        {focal ? t.link.focalTitle : t.link.title}
      </h2>
      <p className={`mt-2 max-w-[58ch] ${focal ? "text-body" : "text-small"} text-foreground/85`}>
        {focal ? t.link.focalBody : t.link.body}
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <label htmlFor="tracking-link" className="sr-only">
          {t.link.label}
        </label>
        <input
          ref={inputRef}
          id="tracking-link"
          type="text"
          readOnly
          dir="ltr"
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          className={`${fieldClassName} truncate text-small`}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={() => void copyLink()} className={primaryButtonClassName}>
            {copyState === "copied" ? (
              <>
                <CheckIcon className="size-4" />
                {t.link.copied}
              </>
            ) : (
              <>
                <CopyIcon className="size-4" />
                {t.link.copy}
              </>
            )}
          </button>
          {canShare ? (
            <button type="button" onClick={() => void shareLink()} className={secondaryButtonClassName}>
              <SendIcon className="size-4" />
              {t.link.share}
            </button>
          ) : null}
        </div>
      </div>
      <p
        aria-live="polite"
        className={`mt-3 min-h-6 text-small font-medium ${copyState === "copied" ? "text-forest" : "text-wait-ink"}`}
      >
        {statusText}
      </p>
      <p className="mt-1 flex items-start gap-2 text-small text-foreground/85">
        <LockIcon className="mt-1 size-4 shrink-0 text-forest" />
        <span>
          {t.link.keepPrivate} {t.link.bookmarkHint}
        </span>
      </p>
    </section>
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

// Kept for modules that still read these as constants; the catalogue is the source.
export const FOUND_DROP_OFF_GUIDANCE = track.en.found.nextBody;
export const STAFF_CONTACT_NOTE = track.en.staffContact;

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

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeading
        context={t.found.context}
        saved
        title={t.found.title}
        intro={t.found.intro}
        headingRef={headingRef}
      />

      <section
        aria-labelledby="hand-in-title"
        className="relative isolate mt-10 py-7 ps-10 pe-6 text-paper motion-safe:animate-rise sm:py-9 sm:ps-14 sm:pe-10"
      >
        <span aria-hidden className="shape-tag absolute inset-0 -z-10 bg-pine-deep" />
        <span aria-hidden className="eyelet absolute start-3 top-1/2 size-4 -translate-y-1/2 bg-paper sm:start-5" />
        <div className="flex items-start gap-4">
          <HandIcon className="mt-1 size-7 shrink-0 text-brass-light" />
          <div className="min-w-0">
            <h2 id="hand-in-title" className="text-heading text-paper">
              {t.found.nextTitle}
            </h2>
            <p className="mt-3 max-w-[52ch] text-body text-paper/85">{t.found.nextBody}</p>
          </div>
        </div>
      </section>

      {note ? (
        <Notice
          tone={isContinuing ? "info" : view.phase === "stalled" || view.phase === "rate_limited" ? "warning" : "info"}
          className="mt-5"
        >
          <span className="font-normal">{note}</span>
        </Notice>
      ) : null}

      {!isContinuing ? (
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {canRetry ? (
            <button type="button" onClick={onRetry} className={primaryButtonClassName}>
              {t.actions.tryAgain}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onReportAnother}
            className={canRetry ? secondaryButtonClassName : primaryButtonClassName}
          >
            {t.actions.reportAnotherFound}
          </button>
          <Link href="/" className={secondaryButtonClassName}>
            {c.backHome}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/* Lost confirmation */

const headlineSurface: Record<HeadlineTone, string> = {
  busy: "bg-card",
  notice: "bg-wait-soft",
  neutral: "bg-card",
  match: "bg-brass-soft",
  ok: "bg-ok-soft",
  bad: "bg-bad-soft",
};

/**
 * The current status as a titled block, for pages whose main heading is not
 * the status itself (the report form's fallback confirmation).
 */
export function StatusBlock({
  headline,
  waiting,
  children,
}: {
  headline: Headline;
  waiting: boolean;
  children?: ReactNode;
}) {
  return (
    <section
      aria-labelledby="matching-result-title"
      aria-busy={waiting}
      className={`relative isolate rounded-[1.75rem] p-5 motion-safe:animate-rise sm:p-7 ${headlineSurface[headline.tone]}`}
    >
      {headline.tone === "match" ? (
        <span aria-hidden className="eyelet absolute end-6 top-6 size-5 bg-paper sm:end-7 sm:top-7" />
      ) : null}
      <h2 id="matching-result-title" className="text-heading pe-9 text-foreground">
        {headline.title}
      </h2>
      <p className="mt-3 max-w-[58ch] text-body text-foreground">{headline.intro}</p>
      {headline.extra ? <p className="mt-2 text-body text-foreground">{headline.extra}</p> : null}
      {children}
    </section>
  );
}

/** The follow-up actions under a lost report's status. */
export function LostActions({
  view,
  waiting,
  canRetry,
  onRetry,
  onReportAnother,
}: {
  view: MatchingView;
  waiting: boolean;
  canRetry: boolean;
  onRetry: () => void;
  onReportAnother: () => void;
}) {
  const t = useMessages(track);
  const c = useMessages(common);
  if (waiting) return null;
  const stalled = view.phase === "stalled";
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      {canRetry ? (
        <button type="button" onClick={onRetry} className={primaryButtonClassName}>
          {t.actions.tryAgain}
        </button>
      ) : stalled ? (
        <button type="button" onClick={() => window.location.reload()} className={primaryButtonClassName}>
          {t.actions.refresh}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onReportAnother}
        className={canRetry || stalled ? secondaryButtonClassName : primaryButtonClassName}
      >
        {t.actions.reportAnotherLost}
      </button>
      <Link href="/" className={secondaryButtonClassName}>
        {c.backHome}
      </Link>
    </div>
  );
}

export function LostConfirmation({
  context,
  saved = false,
  title,
  intro,
  ownership,
  children,
  aside,
  view,
  isContinuing,
  canRetry,
  onRetry,
  onReportAnother,
  headingRef,
}: ConfirmationProps & {
  context: string;
  saved?: boolean;
  title: string;
  intro: ReactNode;
  // Ownership state from the verification card; undefined where it is not shown.
  ownership?: OwnershipStage | null;
  // Shown below the status, e.g. the ownership questions.
  children?: ReactNode;
  // Shown beside the status on wide screens, e.g. the tracking link.
  aside?: ReactNode;
}) {
  const t = useMessages(track);
  const headline = lostHeadline(t, view, isContinuing, ownership);
  const decided = ownership === "approved" || ownership === "rejected";
  const showAiNote = headline.tone === "match";

  // Reading order: heading, the status with what to do now, the ownership
  // card, the actions; the progress slip and any aside sit beside them on
  // wide screens and after them on phones.
  return (
    <div className="@container">
      <PageHeading context={context} saved={saved} title={title} intro={intro} headingRef={headingRef} />
      <div className="mt-8 grid items-start gap-8 @4xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] @4xl:gap-x-12">
        <div className="flex min-w-0 flex-col gap-5">
          <StatusBlock headline={headline} waiting={isContinuing}>
            {showAiNote ? (
              <Notice surface="bg-card/80" className="mt-5">
                <span className="font-normal">{t.aiNote}</span>
              </Notice>
            ) : null}
          </StatusBlock>
          {children}
          {decided ? null : <p className="max-w-[58ch] text-small text-foreground/80">{t.staffContact}</p>}
          <LostActions
            view={view}
            waiting={isContinuing}
            canRetry={canRetry}
            onRetry={onRetry}
            onReportAnother={onReportAnother}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <JourneySteps view={view} waiting={isContinuing} ownership={ownership} />
          {aside}
        </div>
      </div>
    </div>
  );
}
