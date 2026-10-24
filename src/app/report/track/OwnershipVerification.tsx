"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { fieldClassName } from "@/app/report/ReportForm";
import {
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/app/report/SubmissionConfirmation";
import {
  getOwnershipVerification,
  submitOwnershipAnswer,
} from "@/app/report/track/actions";
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

function settledMessage(view: OwnerVerificationView) {
  switch (view.state) {
    case "staff_review":
      return {
        title: "Staff review needed",
        body: "Staff will review this possible match. There are no questions for you to answer right now. Check back here for updates.",
      };
    case "answers_received":
      return {
        title: "Answers received; awaiting staff review",
        body: "Thank you. Staff will review your answers and decide on your claim. Check back here for updates.",
      };
    case "decided":
      return view.decision === "approved"
        ? {
            title: "Approved for ownership follow-up",
            body: "Staff approved your claim for ownership follow-up. Please contact your organization’s lost-and-found staff for next steps. The item is handed over only after their checks.",
          }
        : {
            title: "Claim not verified",
            body: "Staff couldn’t verify this claim. Please contact your organization’s lost-and-found staff if you think there may have been a mistake.",
          };
    default:
      return null;
  }
}

/**
 * Asks the owner the private verification questions one at a time. It only
 * ever receives the owner-safe view: never the found report or expected answers.
 */
export function OwnershipVerification({ credential }: { credential: string }) {
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

  // After an answer is saved, move focus to the next question or the outcome.
  useEffect(() => {
    if (!focusAfterUpdate.current || !view) {
      return;
    }
    focusAfterUpdate.current = false;
    if (view.state === "question") {
      answerRef.current?.focus();
    } else {
      headingRef.current?.focus();
    }
  }, [view]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!view || view.state !== "question" || saving) {
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
      const result = await submitOwnershipAnswer(credential, view.number, text);
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
  const announcement = loading
    ? "Preparing your verification questions."
    : view?.state === "question"
      ? `Question ${view.number} of ${view.total}.`
      : view?.state === "retry"
        ? RETRY_MESSAGES[view.reason]
        : settled
          ? `${settled.title}. ${settled.body}`
          : "";

  return (
    <section
      aria-labelledby="verification-title"
      aria-busy={loading}
      className={`mt-4 rounded-2xl border p-5 shadow-card motion-safe:animate-rise sm:p-6 ${
        view?.state === "decided" && view.decision === "approved"
          ? "border-forest/30 bg-accent"
          : "border-border bg-card"
      }`}
    >
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <h2
        ref={headingRef}
        id="verification-title"
        tabIndex={-1}
        className="font-serif text-2xl font-semibold leading-tight tracking-tight text-foreground outline-none sm:text-[1.75rem]"
      >
        {settled ? settled.title : "Ownership verification"}
      </h2>

      {loading ? (
        <div className="mt-3 flex items-center gap-3">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full bg-forest motion-safe:animate-breathe"
          />
          <p className="text-base leading-relaxed text-muted-foreground">
            Preparing your questions…
          </p>
        </div>
      ) : view?.state === "question" ? (
        <>
          <p className="mt-2 text-base leading-relaxed text-foreground">
            To help staff check that this item is yours, please answer from
            memory in your own words. If you are not sure, say so rather than
            guessing.
          </p>
          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-5 flex flex-col gap-2"
          >
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-forest">
              Question {view.number} of {view.total}
            </p>
            <label
              htmlFor="ownership-answer"
              className="text-base font-medium leading-snug text-foreground"
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
              className={`${fieldClassName} h-auto min-h-24 py-2`}
              aria-invalid={Boolean(answerError)}
              aria-describedby={
                answerError
                  ? "ownership-answer-error ownership-answer-help"
                  : "ownership-answer-help"
              }
            />
            {answerError ? (
              <p
                id="ownership-answer-error"
                role="alert"
                className="text-sm font-medium leading-snug text-foreground"
              >
                {answerError}
              </p>
            ) : null}
            <p
              id="ownership-answer-help"
              className="text-sm leading-relaxed text-muted-foreground"
            >
              You can’t change an answer after submitting it. Staff review
              every answer; answering does not confirm ownership on its own.
            </p>
            <button
              type="submit"
              disabled={saving}
              className={`${primaryButtonClassName} mt-2 disabled:opacity-50 sm:self-start`}
            >
              {saving ? "Saving…" : "Submit answer"}
            </button>
          </form>
        </>
      ) : view?.state === "retry" ? (
        <>
          <p className="mt-2 text-base leading-relaxed text-foreground">
            {RETRY_MESSAGES[view.reason]}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className={`${secondaryButtonClassName} mt-4`}
          >
            Try again
          </button>
        </>
      ) : settled ? (
        <p className="mt-2 text-base leading-relaxed text-foreground">
          {settled.body}
        </p>
      ) : null}
    </section>
  );
}
