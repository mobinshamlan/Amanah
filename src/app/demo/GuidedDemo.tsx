"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { UmbrellaArt } from "@/app/demo/UmbrellaArt";
import { frameClassName } from "@/components/frame";
import {
  ArrowEndIcon,
  CheckIcon,
  EyeOffIcon,
  KeyholeMark,
  LockIcon,
  RefreshIcon,
  SendIcon,
} from "@/components/icons";
import {
  ReportKindCue,
  SlipRow,
  StatusChip,
  focusRingOnDarkClassName,
  quietButtonClassName,
  secondaryButtonClassName,
  secondaryOnDarkButtonClassName,
} from "@/components/ui";
import { useMessages } from "@/i18n/LocaleProvider";
import { demo, type ClueKey, type Segment } from "@/i18n/messages/demo";

/*
  A conversation at the lost-property desk. Everything lives in this
  component's state: no server action, no fetch, no storage. Each tab is its
  own visitor; a reload or "Restart demo" starts the case over. The visitor is
  always the owner, and the found report's details appear only in the
  optional staff preview at the end.
*/

type Stage = "start" | "sent" | "saved" | "question" | "answered" | "review" | "decision";
type Messages = (typeof demo)["en"];

const ORDER: Stage[] = ["start", "sent", "saved", "question", "answered", "review", "decision"];
const reached = (stage: Stage, point: Stage) => ORDER.indexOf(stage) >= ORDER.indexOf(point);

// One typing beat: long enough to read as a reply arriving, short enough not to feel like waiting.
const BEAT_MS = 520;
const PAUSE_MS = 260;

const SHARED_CLUES: ClueKey[] = ["blue", "folding", "strap", "library", "sunday"];
const PROGRESS: Stage[] = ["saved", "question", "review", "decision"];

const chipClassName = `demo-chip inline-flex min-h-12 max-w-full cursor-pointer items-center gap-3 rounded-full bg-paper py-1.5 pe-1.5 ps-5 text-start text-body font-semibold leading-snug text-pine-deep ${focusRingOnDarkClassName}`;

const stripButtonClassName = `inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-paper/40 px-3.5 text-small font-semibold text-paper transition-colors hover:bg-paper/10 ${focusRingOnDarkClassName}`;

export function GuidedDemo() {
  const t = useMessages(demo);
  const [stage, setStage] = useState<Stage>("start");
  const [typing, setTyping] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [restarts, setRestarts] = useState(0);

  const timers = useRef<number[]>([]);
  const reducedMotion = useRef(false);
  const starterRef = useRef<HTMLButtonElement>(null);
  const answerRef = useRef<HTMLButtonElement>(null);
  const decisionRef = useRef<HTMLButtonElement>(null);
  const decisionHeadingRef = useRef<HTMLHeadingElement>(null);
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);

  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reducedMotion.current = query.matches;
    };
    sync();
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
      clearTimers();
    };
  }, [clearTimers]);

  /** Runs the steps of one reply in order; with reduced motion they all land at once. */
  const run = useCallback(
    (steps: Array<[delay: number, step: () => void]>) => {
      clearTimers();
      if (reducedMotion.current) {
        for (const [, step] of steps) step();
        setTyping(false);
        return;
      }
      for (const [delay, step] of steps) {
        timers.current.push(window.setTimeout(step, delay));
      }
    },
    [clearTimers],
  );

  const sendStarter = () => {
    setStage("sent");
    run([
      [0, () => setTyping(true)],
      [
        BEAT_MS,
        () => {
          setTyping(false);
          setStage("saved");
        },
      ],
      [BEAT_MS + PAUSE_MS, () => setTyping(true)],
      [
        BEAT_MS * 2 + PAUSE_MS,
        () => {
          setTyping(false);
          setStage("question");
        },
      ],
    ]);
  };

  const sendAnswer = () => {
    setStage("answered");
    run([
      [0, () => setTyping(true)],
      [
        BEAT_MS,
        () => {
          setTyping(false);
          setStage("review");
        },
      ],
    ]);
  };

  const showDecision = () => {
    run([
      [0, () => setTyping(true)],
      [
        BEAT_MS,
        () => {
          setTyping(false);
          setStage("decision");
        },
      ],
    ]);
  };

  const restart = () => {
    clearTimers();
    setTyping(false);
    setRevealed(false);
    setStage("start");
    setRestarts((n) => n + 1);
  };

  // Focus follows the case: the next thing to tap, or the new focal heading.
  useEffect(() => {
    if (stage === "question") answerRef.current?.focus();
    if (stage === "review") decisionRef.current?.focus();
    if (stage === "decision") decisionHeadingRef.current?.focus();
  }, [stage]);

  useEffect(() => {
    if (restarts > 0) starterRef.current?.focus();
  }, [restarts]);

  useEffect(() => {
    if (revealed) previewHeadingRef.current?.focus();
  }, [revealed]);

  // The tag swings again each time the case moves on.
  useEffect(() => {
    const tag = tagRef.current;
    if (!tag || stage === "start") return;
    tag.style.animation = "none";
    void tag.offsetWidth;
    tag.style.animation = "";
  }, [stage]);

  const handle = stage === "decision" ? "yellow" : "unknown";
  const status = t.tag.stages[stage];
  const started = stage !== "start";

  return (
    <>
      <div
        className={`${frameClassName} grid gap-x-16 gap-y-6 pb-10 pt-6 sm:pt-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:pb-12`}
      >
        <div className="lg:col-start-1">
          <h1 className="text-heading text-paper">{t.title}</h1>
          <p className="mt-2 max-w-[52ch] text-body text-paper/80">{t.intro}</p>
        </div>

        {/* On phones the case tag is a strip that stays at the top while the conversation scrolls. */}
        <div className="sticky top-0 z-10 bg-pine-deep py-2 lg:hidden">
          <div className="flex items-center gap-3">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-paper">
              <UmbrellaArt handle={handle} className="size-12" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-small font-semibold text-paper">{t.tag.item}</p>
              <p className="truncate text-caption text-paper/80">
                {t.tag.status}: {status}
              </p>
            </div>
            {started ? (
              <button type="button" onClick={restart} className={stripButtonClassName}>
                <RefreshIcon className="size-4" />
                {t.restart}
              </button>
            ) : null}
          </div>
        </div>

        {/* On wide screens the case hangs beside the conversation as a tag on its string. */}
        <aside
          aria-label={t.tag.label}
          className="hidden lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block lg:self-start"
        >
          <div className="sticky top-6 mx-auto w-full max-w-[22rem]">
            <span aria-hidden className="relative block h-12 w-full">
              <span className="absolute start-[1.8rem] top-0 h-full w-0.5 -translate-x-1/2 bg-brass-light/80 rtl:translate-x-1/2" />
              <span className="absolute start-[1.8rem] top-0 size-2 -translate-x-1/2 rounded-full bg-brass-light rtl:translate-x-1/2" />
            </span>
            <div ref={tagRef} className="demo-tag relative isolate text-foreground">
              <span aria-hidden className="shape-tag absolute inset-0 -z-10 bg-paper" />
              <span aria-hidden className="eyelet absolute start-4 top-4 size-6 bg-pine-deep" />
              <div className="flex flex-col gap-5 px-7 pb-7 pt-12">
                <UmbrellaArt
                  handle={handle}
                  title={handle === "yellow" ? t.tag.artAltKnown : t.tag.artAlt}
                  className="mx-auto w-44"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-subheading text-foreground">{t.tag.item}</p>
                  <ReportKindCue kind="lost">{t.tag.kind}</ReportKindCue>
                </div>
                <ul className="flex flex-col text-body">
                  <SlipRow label={t.tag.status} value={status} />
                  <SlipRow
                    label={t.tag.handle}
                    value={handle === "yellow" ? t.tag.handleKnown : t.tag.handleUnknown}
                    muted={handle !== "yellow"}
                  />
                </ul>
                <Progress stage={stage} />
                {started ? (
                  <button type="button" onClick={restart} className={quietButtonClassName}>
                    <RefreshIcon className="size-4" />
                    {t.restart}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </aside>

        <section aria-label={t.threadLabel} className="demo-thread min-w-0 lg:col-start-1">
          <div role="log">
            <ol className="flex flex-col gap-4">
              <DeskEntry t={t}>{t.greeting}</DeskEntry>

              {stage === "start" ? (
                <ChipEntry hint={t.starterHint}>
                  <button ref={starterRef} type="button" onClick={sendStarter} className={chipClassName}>
                    {t.starter}
                    <SendGlyph />
                  </button>
                </ChipEntry>
              ) : null}

              {reached(stage, "sent") ? <VisitorEntry t={t}>{t.starter}</VisitorEntry> : null}
              {reached(stage, "saved") ? <DeskEntry t={t}>{t.saved}</DeskEntry> : null}

              {reached(stage, "question") ? (
                <DeskEntry t={t} slip>
                  <p className="text-body text-foreground/85">{t.matchLead}</p>
                  <h2 className="mt-2 text-heading text-foreground">{t.question}</h2>
                  <p className="mt-3 flex items-start gap-2 text-small font-medium text-muted-foreground">
                    <LockIcon className="mt-1 size-4 shrink-0 text-forest" />
                    {t.questionNote}
                  </p>
                </DeskEntry>
              ) : null}

              {stage === "question" ? (
                <ChipEntry hint={t.starterHint}>
                  <button ref={answerRef} type="button" onClick={sendAnswer} className={chipClassName}>
                    {t.answerChip}
                    <SendGlyph />
                  </button>
                </ChipEntry>
              ) : null}

              {reached(stage, "answered") ? <VisitorEntry t={t}>{t.answer}</VisitorEntry> : null}

              {reached(stage, "review") ? (
                <DeskEntry t={t}>
                  <p>{t.review}</p>
                  <StatusChip tone="wait" className="mt-3">
                    {t.reviewChip}
                  </StatusChip>
                </DeskEntry>
              ) : null}

              {stage === "review" ? (
                <li className="flex justify-end motion-safe:animate-rise">
                  <button
                    ref={decisionRef}
                    type="button"
                    onClick={showDecision}
                    className={secondaryOnDarkButtonClassName}
                  >
                    {t.showDecision}
                    <ArrowEndIcon className="size-4" />
                  </button>
                </li>
              ) : null}

              {stage === "decision" ? (
                <DeskEntry t={t} card>
                  <span className="demo-stamp inline-flex w-fit flex-col items-center rounded-md border-[3px] border-ok-ink px-3 py-1 text-center text-ok-ink sm:absolute sm:end-5 sm:top-5">
                    <span className="flex items-center gap-1.5 text-base font-bold leading-tight">
                      <CheckIcon className="size-4" />
                      {t.decisionStamp}
                    </span>
                    <span className="text-caption font-semibold leading-tight">{t.decisionStampNote}</span>
                  </span>
                  <h2
                    ref={decisionHeadingRef}
                    tabIndex={-1}
                    className="mt-4 text-heading text-foreground outline-none sm:mt-0 sm:pe-36"
                  >
                    {t.decisionTitle}
                  </h2>
                  <p className="mt-3 max-w-[52ch] text-body text-foreground/85">{t.decisionBody}</p>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() => setRevealed((value) => !value)}
                      aria-expanded={revealed}
                      aria-controls="demo-preview"
                      className={secondaryButtonClassName}
                    >
                      <EyeOffIcon className="size-4" />
                      {revealed ? t.hideReveal : t.reveal}
                    </button>
                    <button type="button" onClick={restart} className={quietButtonClassName}>
                      <RefreshIcon className="size-4" />
                      {t.restart}
                    </button>
                  </div>
                </DeskEntry>
              ) : null}

              {typing ? <TypingEntry label={t.typing} /> : null}
            </ol>
          </div>

          {/* The composer, visibly off: in the demo the suggestion does the typing. */}
          <p className="mt-6 flex min-h-14 items-center gap-3 rounded-full border border-paper/25 bg-paper/10 py-1.5 pe-2 ps-5 text-body text-paper/75">
            <span className="min-w-0 flex-1">{t.composer}</span>
            <span className="sr-only">{t.composerNote}</span>
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-paper/15">
              <SendIcon className="size-4" />
            </span>
          </p>
        </section>

        {/* The stage ends as a stub tears off the pad. */}
        <span aria-hidden className="perforation block text-brass-light/40 lg:col-span-2" />
      </div>

      {revealed ? <StaffPreview t={t} headingRef={previewHeadingRef} /> : null}
    </>
  );
}

/* The thread */

function DeskEntry({
  t,
  slip = false,
  card = false,
  children,
}: {
  t: Messages;
  // `slip`: the focal question, torn from the pad. `card`: the decision, a panel with room for the stamp.
  slip?: boolean;
  card?: boolean;
  children: ReactNode;
}) {
  const shape = slip
    ? "edge-torn w-full max-w-[40rem] bg-paper px-5 pt-5 sm:px-6"
    : card
      ? "relative w-full max-w-[40rem] rounded-2xl rounded-es-md bg-paper px-5 py-5 sm:px-6"
      : "max-w-[40rem] rounded-2xl rounded-es-md bg-paper px-5 py-3.5";
  return (
    <li className="flex items-end gap-3 motion-safe:animate-rise">
      <KeyholeMark tone="paper" className="size-9 shrink-0" />
      <div className={`${shape} min-w-0 text-body text-foreground`}>
        <span className="sr-only">{t.deskName}: </span>
        {children}
      </div>
    </li>
  );
}

function VisitorEntry({ t, children }: { t: Messages; children: ReactNode }) {
  return (
    <li className="flex justify-end motion-safe:animate-rise">
      <p className="max-w-[32rem] rounded-2xl rounded-ee-md bg-pine px-5 py-3.5 text-body font-medium text-paper">
        <span className="sr-only">{t.youName}: </span>
        {children}
      </p>
    </li>
  );
}

function ChipEntry({ hint, children }: { hint: string; children: ReactNode }) {
  return (
    <li className="flex flex-col items-end gap-2 motion-safe:animate-rise motion-safe:[animation-delay:120ms]">
      <p className="text-caption font-medium text-paper/80">{hint}</p>
      {children}
    </li>
  );
}

function SendGlyph() {
  return (
    <span
      aria-hidden
      className="demo-chip-send flex size-9 shrink-0 items-center justify-center rounded-full bg-pine-deep text-paper"
    >
      <SendIcon className="size-4" />
    </span>
  );
}

function TypingEntry({ label }: { label: string }) {
  return (
    <li className="flex items-end gap-3 motion-safe:animate-rise">
      <KeyholeMark tone="paper" className="size-9 shrink-0" />
      <div className="flex min-h-11 items-center gap-1.5 rounded-2xl rounded-es-md bg-paper px-4">
        <span className="sr-only">{label}</span>
        <span aria-hidden className="demo-dot size-2 rounded-full bg-forest" />
        <span aria-hidden className="demo-dot size-2 rounded-full bg-forest" />
        <span aria-hidden className="demo-dot size-2 rounded-full bg-forest" />
      </div>
    </li>
  );
}

/* The case tag's one compact progress: four marks, the current one ringed. */
function Progress({ stage }: { stage: Stage }) {
  const index = ORDER.indexOf(stage);
  return (
    <ol aria-hidden className="flex items-center gap-2">
      {PROGRESS.map((point) => {
        const at = ORDER.indexOf(point);
        const done = index >= at;
        const current = done && (PROGRESS.indexOf(point) === PROGRESS.length - 1 || index < ORDER.indexOf(PROGRESS[PROGRESS.indexOf(point) + 1]));
        return (
          <li
            key={point}
            className={`h-2.5 flex-1 rounded-full transition-colors duration-300 ${
              done ? (current ? "bg-forest" : "bg-pine-deep") : "bg-secondary"
            }`}
          />
        );
      })}
    </ol>
  );
}

/* The optional staff preview */

function StaffPreview({
  t,
  headingRef,
}: {
  t: Messages;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <section
      id="demo-preview"
      aria-labelledby="demo-preview-title"
      className="bg-paper text-foreground motion-safe:animate-rise"
    >
      <div className={`${frameClassName} flex flex-col gap-10 py-14 sm:py-20`}>
        <div className="flex max-w-3xl flex-col gap-4">
          <h2
            id="demo-preview-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-title text-foreground outline-none"
          >
            {t.preview.title}
          </h2>
          <p className="text-lead text-foreground/85">
            <StatusChip tone="info" icon={<EyeOffIcon className="size-3.5" />} className="me-2 align-middle">
              {t.preview.label}
            </StatusChip>
            {t.preview.intro}
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          {/* Shared clues first: on phones they come before the slips. */}
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <h3 className="text-subheading text-foreground">{t.preview.cluesTitle}</h3>
              <ul className="flex flex-wrap gap-2">
                {SHARED_CLUES.map((key) => (
                  <li
                    key={key}
                    className="rounded-full bg-brass-soft px-3 py-1 text-small font-semibold text-brass-ink"
                  >
                    {t.preview.clues[key]}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl bg-ok-soft px-5 py-5">
              <h3 className="text-subheading text-foreground">{t.preview.handleTitle}</h3>
              <p className="text-body text-foreground/85">{t.preview.handleBody}</p>
              <ul className="flex flex-col">
                <SlipRow label={t.preview.asked} value={t.question} />
                <SlipRow label={t.preview.ownerSaid} value={t.answer} />
                <SlipRow label={t.preview.foundSays} value={t.preview.clues.handle} />
                <SlipRow
                  label={t.preview.verdict}
                  value={
                    <span className="inline-flex items-center gap-1.5 text-ok-ink">
                      <CheckIcon className="size-4" />
                      {t.preview.verdictValue}
                    </span>
                  }
                />
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ReportSlip t={t} kind="lost" title={t.preview.lostSlip} slip={t.lost} />
              <ReportSlip t={t} kind="found" title={t.preview.foundSlip} slip={t.found} />
            </div>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden className="size-3.5 rounded-sm bg-brass-soft" />
                {t.preview.sharedLegend}
              </span>
              <span className="inline-flex items-center gap-2">
                <span aria-hidden className="size-3.5 rounded-sm bg-ok-soft" />
                {t.preview.verifiedLegend}
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportSlip({
  t,
  kind,
  title,
  slip,
}: {
  t: Messages;
  kind: "lost" | "found";
  title: string;
  slip: Messages["lost"];
}) {
  const labels = t.preview.slip;
  return (
    <article className="edge-torn bg-card px-5 pt-5 text-foreground">
      <div className="flex flex-col items-start gap-2">
        <ReportKindCue kind={kind}>{kind === "lost" ? t.tag.kind : t.tag.foundKind}</ReportKindCue>
        <h4 className="text-subheading text-foreground">{title}</h4>
      </div>
      <span aria-hidden className="perforation my-4 block text-border" />
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-body">
        <dt className="text-small font-medium text-muted-foreground">{labels.item}</dt>
        <dd className="font-medium">{slip.item}</dd>
        <dt className="text-small font-medium text-muted-foreground">{labels.description}</dt>
        <dd>
          <Marked segments={slip.description} />
        </dd>
        <dt className="text-small font-medium text-muted-foreground">{labels.place}</dt>
        <dd>
          <Marked segments={slip.place} />
        </dd>
        <dt className="text-small font-medium text-muted-foreground">{labels.time}</dt>
        <dd>
          <Marked segments={slip.time} />
        </dd>
      </dl>
    </article>
  );
}

/** Slip text with the shared clues marked in brass and the verified clue in green. */
function Marked({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.clue ? (
          <mark
            key={index}
            className={`rounded-sm px-1 py-0.5 box-decoration-clone text-foreground ${
              segment.clue === "handle" ? "bg-ok-soft" : "bg-brass-soft"
            }`}
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}
