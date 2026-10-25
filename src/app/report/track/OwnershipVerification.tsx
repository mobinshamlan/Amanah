"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { OwnershipStage } from "@/app/report/SubmissionConfirmation";
import {
  getOwnershipVerification,
  submitOwnershipAnswer,
  submitOwnershipFollowupAnswer,
} from "@/app/report/track/actions";
import { CheckIcon, ClockIcon, XIcon } from "@/components/icons";
import {
  FieldError,
  LoadingRow,
  Notice,
  Spinner,
  primaryButtonClassName,
  secondaryButtonClassName,
  textareaClassName,
} from "@/components/ui";
import type {
  OwnerVerificationView,
  RetryReason,
} from "@/utils/ownership/service";

const OWNER_ANSWER_MAX = 1000;
const NOT_NO_MATCH = "This is not a “no match” result.";

const RETRY_MESSAGES: Record<RetryReason, string> = {
  busy: `We could not prepare your verification questions because the service is busy. Your report and the possible match are saved. ${NOT_NO_MATCH} Please try again in a few minutes.`,
  failed: `We could not prepare your verification questions right now. Your report and the possible match are saved. ${NOT_NO_MATCH}`,
  unavailable: `Verification questions are not available right now. Your report and the possible match are saved, and staff can still review it. ${NOT_NO_MATCH}`,
};

type OutcomeTone = "positive" | "negative" | "neutral";

type SettledCopy = {
  title: string;
  body: string;
  tone: OutcomeTone;
};

function settledMessage(view: OwnerVerificationView): SettledCopy | null {
  switch (view.state) {
    case "staff_review":
      return {
        title: "Staff review needed",
        body: "Staff will review this possible match. There are no questions for you to answer right now. Check back here for updates.",
        tone: "neutral",
      };
    case "answers_received":
      return {
        title: "Answers received; awaiting staff review",
        body: "Thank you. Staff will review your answers and decide on your claim. Check back here for updates.",
        tone: "neutral",
      };
    case "decided":
      return view.decision === "approved"
        ? {
            title: "Approved for ownership follow-up",
            body: "Approval does not hand over the item automatically. Please contact your organization’s lost-and-found staff to arrange the next step.",
            tone: "positive",
          }
        : {
            title: "Claim not verified",
            body: "Staff couldn’t verify this claim. Please contact your organization’s lost-and-found staff if you think there may have been a mistake.",
            tone: "negative",
          };
    default:
      return null;
  }
}

function stageOf(
  loading: boolean,
  view: OwnerVerificationView | null,
): OwnershipStage | null {
  if (loading) return "loading";
  if (!view || view.state === "not_needed") return null;
  if (view.state === "decided") {
    return view.decision === "approved" ? "approved" : "rejected";
  }
  return view.state;
}

const CARD_TONE: Record<OutcomeTone, string> = {
  positive: "bg-ok-soft",
  negative: "bg-bad-soft",
  neutral: "border border-border bg-card",
};

const ICON_TONE: Record<OutcomeTone, string> = {
  positive: "bg-forest text-primary-foreground",
  negative: "bg-destructive text-primary-foreground",
  neutral: "bg-accent text-forest",
};

const TITLE_TONE: Record<OutcomeTone, string> = {
  positive: "text-ok-ink",
  negative: "text-bad-ink",
  neutral: "text-foreground",
};

function OutcomeIcon({ tone }: { tone: OutcomeTone }) {
  const Icon = tone === "positive" ? CheckIcon : tone === "negative" ? XIcon : ClockIcon;
  return (
    <span
      aria-hidden
      className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${ICON_TONE[tone]}`}
    >
      <Icon className="size-5" />
    </span>
  );
}

function QuestionProgress({ number, total }: { number: number; total: number }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[0.9375rem] font-semibold text-pine">
        Question {number} of {total}
      </p>
      <div aria-hidden className="flex gap-1.5">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full ${
              index < number - 1
                ? "bg-forest"
                : index === number - 1
                  ? "bg-clay"
                  : "bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Asks the owner the private verification questions one at a time. It only
 * ever receives the owner-safe view: never the found report or expected answers.
 */
export function OwnershipVerification({
  credential,
  onStageChange,
}: {
  credential: string;
  // Lets the tracking page show the same state in its progress steps.
  onStageChange?: (stage: OwnershipStage | null) => void;
}) {
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
      setAnswerError("Please write an answer.");
      return;
    }
    if (text.length > OWNER_ANSWER_MAX) {
      setAnswerError(`Please keep your answer under ${OWNER_ANSWER_MAX} characters.`);
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
        setAnswerError(result.message);
      } else if (result.reason === "invalid_link") {
        setAnswerError("This tracking link no longer works, so your answer was not saved.");
      } else {
        setAnswerError("Your answer could not be saved. It is still here, so please try again.");
      }
    } catch {
      setAnswerError("Your answer could not be saved. It is still here, so please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!loading && (!view || view.state === "not_needed")) {
    return null;
  }

  const settled = view ? settledMessage(view) : null;
  const tone: OutcomeTone = settled?.tone ?? "neutral";
  const announcement = loading
    ? "Preparing your verification questions."
    : view?.state === "question"
      ? `Question ${view.number} of ${view.total}.`
      : view?.state === "followup"
        ? "Staff have one more question for you."
        : view?.state === "retry"
        ? RETRY_MESSAGES[view.reason]
        : settled
          ? `${settled.title}. ${settled.body}`
          : "";

  return (
    <section
      aria-labelledby="verification-title"
      aria-busy={loading}
      className={`mt-4 rounded-[1.75rem] p-5 motion-safe:animate-rise sm:p-7 ${CARD_TONE[tone]}`}
    >
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <p className="text-[0.9375rem] font-medium text-forest">Ownership review</p>
      {settled ? (
        <div className="mt-3 flex items-start gap-3.5">
          <OutcomeIcon tone={tone} />
          <div className="min-w-0 flex-1">
            <h2
              ref={headingRef}
              id="verification-title"
              tabIndex={-1}
              className={`font-serif text-[2rem] font-semibold leading-tight tracking-[-0.01em] outline-none ${TITLE_TONE[tone]}`}
            >
              {settled.title}
            </h2>
            <p className="mt-2 text-base leading-relaxed text-foreground">
              {settled.body}
            </p>
          </div>
        </div>
      ) : (
        <h2
          ref={headingRef}
          id="verification-title"
          tabIndex={-1}
          className="mt-2 font-serif text-[2rem] font-semibold leading-tight tracking-[-0.01em] text-foreground outline-none"
        >
          {loading
            ? "Preparing your questions"
            : view?.state === "question"
              ? "A few questions about your item"
              : view?.state === "followup"
                ? "One more question from staff"
                : "Questions not ready yet"}
        </h2>
      )}

      {loading ? (
        <div className="mt-4">
          <LoadingRow>Preparing your questions…</LoadingRow>
        </div>
      ) : view?.state === "question" || view?.state === "followup" ? (
        <>
          <p className="mt-2 text-base leading-relaxed text-foreground">
            {view.state === "followup"
              ? "Staff would like a little more detail to review your claim. Please answer from memory in your own words, or say if you are not sure."
              : "To help staff check that this item is yours, please answer from memory in your own words. If you are not sure, say so rather than guessing."}
          </p>
          <form
            onSubmit={handleSubmit}
            noValidate
            aria-busy={saving}
            className="mt-6 flex flex-col gap-3 rounded-2xl bg-secondary p-4 sm:p-5"
          >
            {view.state === "question" ? (
              <QuestionProgress number={view.number} total={view.total} />
            ) : (
              <p className="text-[0.9375rem] font-semibold text-pine">Question from staff</p>
            )}
            <label
              htmlFor="ownership-answer"
              className="mt-1 font-serif text-[1.5rem] font-semibold leading-snug text-foreground"
            >
              {view.question}
            </label>
            <textarea
              ref={answerRef}
              id="ownership-answer"
              name="answer"
              rows={4}
              maxLength={OWNER_ANSWER_MAX}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              disabled={saving}
              className={textareaClassName.replace("bg-background", "bg-card")}
              aria-invalid={Boolean(answerError)}
              aria-describedby={
                answerError
                  ? "ownership-answer-error ownership-answer-help"
                  : "ownership-answer-help"
              }
            />
            {answerError ? (
              <FieldError id="ownership-answer-error" role="alert">
                {answerError}
              </FieldError>
            ) : null}
            <p
              id="ownership-answer-help"
              className="text-[0.9375rem] leading-relaxed text-foreground/75"
            >
              You can’t change an answer after submitting it. Staff review
              every answer; answering does not confirm ownership on its own.
            </p>
            <button
              type="submit"
              disabled={saving}
              className={`${primaryButtonClassName} mt-1 sm:self-start`}
            >
              {saving ? (
                <>
                  <Spinner />
                  Saving…
                </>
              ) : (
                "Submit answer"
              )}
            </button>
          </form>
        </>
      ) : view?.state === "retry" ? (
        <>
          <Notice className="mt-4">
            <span className="font-normal">{RETRY_MESSAGES[view.reason]}</span>
          </Notice>
          <button
            type="button"
            onClick={() => void load()}
            className={`${secondaryButtonClassName} mt-4`}
          >
            Try again
          </button>
        </>
      ) : null}
    </section>
  );
}
