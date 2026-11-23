"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { OwnershipStage } from "@/app/report/SubmissionConfirmation";
import {
  getOwnershipVerification,
  submitOwnershipAnswer,
  submitOwnershipFollowupAnswer,
} from "@/app/report/track/actions";
import { LockIcon, QuestionIcon, RefreshIcon, SendIcon } from "@/components/icons";
import {
  FieldError,
  LoadingRow,
  Spinner,
  StatusChip,
  primaryButtonClassName,
  textareaClassName,
} from "@/components/ui";
import { useMessages } from "@/i18n/LocaleProvider";
import { track } from "@/i18n/messages/track";
import type { OwnerVerificationView } from "@/utils/ownership/service";

const OWNER_ANSWER_MAX = 1000;

type Settled = "staff_review" | "answers_received" | "approved" | "rejected";

function settledOf(view: OwnerVerificationView): Settled | null {
  switch (view.state) {
    case "staff_review":
    case "answers_received":
      return view.state;
    case "decided":
      return view.decision === "approved" ? "approved" : "rejected";
    default:
      return null;
  }
}

function stageOf(loading: boolean, view: OwnerVerificationView | null): OwnershipStage | null {
  if (loading) return "loading";
  if (!view || view.state === "not_needed") return null;
  if (view.state === "decided") {
    return view.decision === "approved" ? "approved" : "rejected";
  }
  return view.state;
}

const settledTone: Record<Settled, "ok" | "bad" | "wait"> = {
  staff_review: "wait",
  answers_received: "wait",
  approved: "ok",
  rejected: "bad",
};

function QuestionProgress({ number, total }: { number: number; total: number }) {
  return (
    <div aria-hidden className="flex w-24 gap-1.5">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`h-1.5 flex-1 rounded-full ${
            index < number - 1 ? "bg-pine-deep" : index === number - 1 ? "bg-brass" : "bg-secondary"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Asks the owner the private verification questions one at a time. It only
 * ever receives the owner-safe view: never the found report or expected answers.
 *
 * `headlineShown`: the tracking page already says the settled state (approved,
 * rejected, waiting) in its main heading and case tag, so the slip steps aside.
 */
export function OwnershipVerification({
  credential,
  onStageChange,
  headlineShown = false,
}: {
  credential: string;
  // Lets the tracking page show the same state in its heading and progress steps.
  onStageChange?: (stage: OwnershipStage | null) => void;
  headlineShown?: boolean;
}) {
  const t = useMessages(track);
  const [view, setView] = useState<OwnerVerificationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusAfterUpdate = useRef(false);

  const load = useCallback(async () => {
    // Clear any previous outcome so a reload never flashes approved/rejected
    // (or old questions) before this fetch finishes.
    setView(null);
    setLoading(true);
    try {
      const result = await getOwnershipVerification(credential);
      // An unknown link is already handled by the tracking page.
      setView(result.ok ? result.view : null);
    } catch {
      setView({ state: "retry", reason: "failed" });
    } finally {
      setLoading(false);
    }
  }, [credential]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const stage = stageOf(loading, view);
  useEffect(() => {
    onStageChange?.(stage);
  }, [stage, onStageChange]);

  // After an answer is saved, move focus to the next question or the outcome.
  useEffect(() => {
    if (!focusAfterUpdate.current || !view) {
      return;
    }
    focusAfterUpdate.current = false;
    if (view.state === "question" || view.state === "followup") {
      answerRef.current?.focus();
    } else {
      headingRef.current?.focus();
    }
  }, [view]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!view || (view.state !== "question" && view.state !== "followup") || saving) {
      return;
    }
    const text = answer.trim();
    if (!text) {
      setAnswerError(t.verify.errors.empty);
      answerRef.current?.focus();
      return;
    }
    if (text.length > OWNER_ANSWER_MAX) {
      setAnswerError(t.verify.errors.tooLong(OWNER_ANSWER_MAX));
      answerRef.current?.focus();
      return;
    }
    setAnswerError(null);
    setSaving(true);
    try {
      const result =
        view.state === "followup"
          ? await submitOwnershipFollowupAnswer(credential, text)
          : await submitOwnershipAnswer(credential, view.number, text);
      if (result.ok) {
        setAnswer("");
        focusAfterUpdate.current = true;
        setView(result.view);
      } else if (result.reason === "invalid_answer") {
        setAnswerError(t.verify.errors.invalid);
      } else if (result.reason === "invalid_link") {
        setAnswerError(t.verify.errors.invalidLink);
      } else {
        setAnswerError(t.verify.errors.saveFailed);
      }
    } catch {
      setAnswerError(t.verify.errors.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  if (!loading && (!view || view.state === "not_needed")) {
    return null;
  }

  const settled = view ? settledOf(view) : null;
  const asking = view?.state === "question" || view?.state === "followup";
  const announcement = loading
    ? t.verify.loadingRow
    : view?.state === "question"
      ? t.verify.announce.question(view.number, view.total)
      : view?.state === "followup"
        ? t.verify.announce.followup
        : view?.state === "retry"
          ? t.verify.retry[view.reason]
          : settled
            ? `${t.verify.settled[settled].title}. ${t.verify.settled[settled].body}`
            : "";

  // The page heading, its live status line and the case tag already carry a
  // settled state, so the slip steps aside.
  if (settled && headlineShown) {
    return null;
  }

  const heading = (text: string) => (
    <h2
      id="verification-title"
      ref={headingRef}
      tabIndex={-1}
      className="flex items-center gap-2 text-subheading text-foreground outline-none"
    >
      <QuestionIcon className="size-5 shrink-0 text-brass-ink" />
      {text}
    </h2>
  );

  // A paper slip torn from the desk's pad; the tear and the shadow sit on a
  // layer behind the content, so focus rings are never clipped.
  return (
    <section
      aria-labelledby="verification-title"
      aria-busy={loading || saving}
      className="track-paper relative isolate px-5 pb-10 pt-6 motion-safe:animate-rise sm:px-8 sm:pt-7"
    >
      <span aria-hidden className="edge-torn absolute inset-0 -z-10 bg-card" />
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {loading ? (
        <>
          {heading(t.verify.loadingTitle)}
          <div className="mt-4">
            <LoadingRow>{t.verify.loadingRow}</LoadingRow>
          </div>
        </>
      ) : settled && view ? (
        <div className="flex flex-col items-start gap-3">
          <StatusChip tone={settledTone[settled]}>
            {settled === "approved"
              ? t.verify.chip.approved
              : settled === "rejected"
                ? t.verify.chip.rejected
                : t.verify.chip.waiting}
          </StatusChip>
          <h2
            id="verification-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-heading text-foreground outline-none"
          >
            {t.verify.settled[settled].title}
          </h2>
          <p className="text-body text-foreground/85">{t.verify.settled[settled].body}</p>
        </div>
      ) : asking && view ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            {heading(
              view.state === "question" ? t.verify.progress(view.number, view.total) : t.verify.followupTitle,
            )}
            {view.state === "question" ? <QuestionProgress number={view.number} total={view.total} /> : null}
          </div>
          <span aria-hidden className="perforation mt-4 block text-foreground/20" />
          <form onSubmit={handleSubmit} noValidate aria-busy={saving} className="mt-5 flex flex-col gap-3">
            {/* The question and the answer may be in either language. No suggestions: they would hint the answer. */}
            <label htmlFor="ownership-answer" dir="auto" className="text-heading text-foreground">
              {view.question}
            </label>
            <p id="ownership-answer-intro" className="max-w-[58ch] text-small text-foreground/80">
              {view.state === "followup" ? t.verify.followupIntro : t.verify.questionIntro}
            </p>
            <textarea
              ref={answerRef}
              id="ownership-answer"
              name="answer"
              dir="auto"
              rows={4}
              maxLength={OWNER_ANSWER_MAX}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              disabled={saving}
              className={textareaClassName}
              aria-invalid={Boolean(answerError)}
              aria-describedby={
                answerError
                  ? "ownership-answer-error ownership-answer-intro ownership-answer-help"
                  : "ownership-answer-intro ownership-answer-help"
              }
            />
            {answerError ? (
              <FieldError id="ownership-answer-error" role="alert">
                {answerError}
              </FieldError>
            ) : null}
            <button type="submit" disabled={saving} className={`${primaryButtonClassName} mt-1 sm:self-start`}>
              {saving ? (
                <>
                  <Spinner />
                  {t.verify.saving}
                </>
              ) : (
                <>
                  <SendIcon className="size-4" />
                  {t.verify.submit}
                </>
              )}
            </button>
            <p id="ownership-answer-help" className="flex items-start gap-2 text-small text-foreground/80">
              <LockIcon className="mt-1 size-4 shrink-0 text-forest" />
              <span>{t.verify.help}</span>
            </p>
          </form>
        </>
      ) : view?.state === "retry" ? (
        <>
          {heading(t.verify.retry.title)}
          <p className="mt-3 max-w-[58ch] text-body text-foreground/85">{t.verify.retry[view.reason]}</p>
          <button type="button" onClick={() => void load()} className={`${primaryButtonClassName} mt-5`}>
            <RefreshIcon className="size-4" />
            {t.actions.tryAgain}
          </button>
        </>
      ) : null}
    </section>
  );
}
