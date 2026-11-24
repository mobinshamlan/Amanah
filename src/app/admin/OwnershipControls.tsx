"use client";

import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import {
  askOwnershipFollowup,
  decideOwnership,
  resetOwnershipDecision,
  retryOwnershipAssessment,
} from "@/app/admin/actions";
import { CheckIcon, QuestionIcon, RefreshIcon, SendIcon, XIcon } from "@/components/icons";
import {
  FieldError,
  Notice,
  Spinner,
  focusRingClassName,
  hintClassName,
  labelClassName,
  primaryButtonClassName,
  quietButtonClassName,
  rejectButtonClassName,
  secondaryButtonClassName,
  textareaClassName,
} from "@/components/ui";
import { ErrorMessage } from "@/app/admin/parts/ui";
import { useMessages } from "@/i18n/LocaleProvider";
import { adminTools } from "@/i18n/messages/admin-tools";

// Staff decisions on an ownership claim. Approve is always green with a check,
// reject always red with a cross, and every action the owner will see on their
// tracking page (a decision, a reset, a follow-up question) asks once before it
// is saved and says what the owner will see.

/** Filled green pill for approval: the same shape as the primary button. */
const approveButtonClassName = `inline-flex min-h-11 w-full max-w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2 text-center text-base font-semibold leading-tight transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0 sm:w-auto ${focusRingClassName} bg-ok-ink text-paper hover:bg-forest`;

/**
 * A saved decision or reset swaps the claim's controls (decide <-> reset), so
 * the control that just acted unmounts. It leaves its outcome here and the
 * control that mounts next shows it once and takes focus, so the result is
 * announced and focus is not lost.
 */
const recentOutcomes = new Map<string, string>();

function SavedOutcome({ verificationId }: { verificationId: string }) {
  const [message] = useState(() => recentOutcomes.get(verificationId) ?? null);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    recentOutcomes.delete(verificationId);
    if (message) {
      ref.current?.focus();
    }
  }, [verificationId, message]);
  return (
    <div ref={ref} tabIndex={-1} role="status" className="outline-none empty:hidden">
      {message ? <Notice tone="success">{message}</Notice> : null}
    </div>
  );
}

function Busy({ label }: { label: string }) {
  return (
    <>
      <Spinner />
      {label}
    </>
  );
}

/**
 * A confirmation step: a question as its heading (focused when it appears),
 * the consequence for the owner in plain words, then the fields and buttons.
 */
function ConfirmStep({
  title,
  consequence,
  tone,
  disabled,
  children,
}: {
  title: string;
  consequence: string;
  tone: "ok" | "bad" | "neutral";
  disabled: boolean;
  children: ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const headingId = useId();
  const t = useMessages(adminTools);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  // Disabling the fieldset would drop focus from the pressed button, so the
  // heading keeps it while the action runs and a status line says so.
  useEffect(() => {
    if (disabled) {
      headingRef.current?.focus();
    }
  }, [disabled]);
  const fill = tone === "ok" ? "bg-ok-soft" : tone === "bad" ? "bg-bad-soft" : "bg-secondary";
  return (
    <>
    <p role="status" aria-live="polite" className="sr-only">
      {disabled ? t.shared.saving : ""}
    </p>
    <fieldset
      className={`@container flex min-w-0 flex-col gap-3 rounded-2xl p-4 ${fill}`}
      disabled={disabled}
      aria-labelledby={headingId}
    >
      <h5 id={headingId} ref={headingRef} tabIndex={-1} className="text-subheading text-foreground outline-none">
        {title}
      </h5>
      <p className="text-small text-foreground">{consequence}</p>
      {children}
    </fieldset>
    </>
  );
}

export function RetryAssessmentButton({ verificationId }: { verificationId: string }) {
  const t = useMessages(adminTools).ownership;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const helpId = `retry-${verificationId}-help`;

  function handleRetry() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await retryOwnershipAssessment(verificationId);
        if (!result.ok) {
          setError(result.message);
        }
      } catch {
        setError(t.retryFailed);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleRetry}
        disabled={isPending}
        aria-describedby={helpId}
        className={secondaryButtonClassName}
      >
        {isPending ? <Busy label={t.retrying} /> : (
          <>
            <RefreshIcon className="size-4" />
            {t.retry}
          </>
        )}
      </button>
      <p id={helpId} className={hintClassName}>
        {t.retryHelp}
      </p>
      <ErrorMessage message={error} />
    </div>
  );
}

/**
 * Staff decision for a claim pending review: choose approve or reject, read
 * what the owner will see, optionally add a note, then confirm. Approval means
 * staff may proceed with ownership follow-up; it does not return the item.
 */
export function OwnershipDecisionForm({ verificationId }: { verificationId: string }) {
  const t = useMessages(adminTools);
  const [choice, setChoice] = useState<"approved" | "rejected" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const noteId = `decision-${verificationId}-note`;
  const helpId = `decision-${verificationId}-help`;

  function handleConfirm() {
    if (!choice) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await decideOwnership(verificationId, choice, note);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        recentOutcomes.set(
          verificationId,
          choice === "approved" ? t.ownership.approvedSaved : t.ownership.rejectedSaved,
        );
      } catch {
        setError(t.ownership.decisionFailed);
      }
    });
  }

  if (!choice) {
    return (
      <div className="@container flex flex-col gap-3">
        <SavedOutcome verificationId={verificationId} />
        <div className="flex flex-col gap-2 @md:flex-row @md:flex-wrap">
          <button
            type="button"
            onClick={() => setChoice("approved")}
            aria-describedby={helpId}
            className={approveButtonClassName}
          >
            <CheckIcon className="size-4" />
            {t.ownership.approve}
          </button>
          <button
            type="button"
            onClick={() => setChoice("rejected")}
            aria-describedby={helpId}
            className={rejectButtonClassName}
          >
            <XIcon className="size-4" />
            {t.ownership.reject}
          </button>
        </div>
        <p id={helpId} className="text-small text-foreground/80">
          {t.ownership.decisionHelp}
        </p>
      </div>
    );
  }

  const approving = choice === "approved";
  return (
    <ConfirmStep
      title={approving ? t.ownership.approveTitle : t.ownership.rejectTitle}
      consequence={approving ? t.ownership.approveConsequence : t.ownership.rejectConsequence}
      tone={approving ? "ok" : "bad"}
      disabled={isPending}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={noteId} className={labelClassName}>
          {t.ownership.noteLabel}{" "}
          <span className="font-normal text-muted-foreground">({t.shared.optional})</span>
        </label>
        <textarea
          id={noteId}
          rows={2}
          maxLength={1000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={`${textareaClassName} min-h-20`}
        />
      </div>
      <div className="flex flex-col gap-2 @md:flex-row @md:flex-wrap">
        <button
          type="button"
          onClick={handleConfirm}
          className={approving ? approveButtonClassName : rejectButtonClassName}
        >
          {isPending ? (
            <Busy label={t.shared.saving} />
          ) : (
            <>
              {approving ? <CheckIcon className="size-4" /> : <XIcon className="size-4" />}
              {approving ? t.ownership.confirmApprove : t.ownership.confirmReject}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setChoice(null);
            setError(null);
          }}
          className={quietButtonClassName}
        >
          {t.shared.cancel}
        </button>
      </div>
      <ErrorMessage message={error} />
    </ConfirmStep>
  );
}

/**
 * Resets an approved or rejected decision to pending review. The earlier
 * decision and the reset both stay in the decision history.
 */
export function ResetDecisionForm({ verificationId }: { verificationId: string }) {
  const t = useMessages(adminTools);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const reasonId = `reset-${verificationId}-reason`;

  function handleReset() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await resetOwnershipDecision(verificationId, reason);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        // The refreshed claim replaces this form with the decision buttons,
        // which show the outcome; closing here would show it too early.
        recentOutcomes.set(verificationId, t.ownership.resetSaved);
      } catch {
        setError(t.ownership.resetFailed);
      }
    });
  }

  if (!open) {
    return (
      <div className="flex flex-col items-start gap-3">
        <SavedOutcome verificationId={verificationId} />
        <button type="button" onClick={() => setOpen(true)} className={secondaryButtonClassName}>
          <RefreshIcon className="size-4" />
          {t.ownership.reset}
        </button>
      </div>
    );
  }

  return (
    <ConfirmStep
      title={t.ownership.resetTitle}
      consequence={t.ownership.resetConsequence}
      tone="neutral"
      disabled={isPending}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={reasonId} className={labelClassName}>
          {t.ownership.resetReason}{" "}
          <span className="font-normal text-muted-foreground">({t.shared.optional})</span>
        </label>
        <textarea
          id={reasonId}
          rows={2}
          maxLength={1000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className={`${textareaClassName} min-h-20`}
        />
      </div>
      <div className="flex flex-col gap-2 @md:flex-row @md:flex-wrap">
        <button type="button" onClick={handleReset} className={primaryButtonClassName}>
          {isPending ? <Busy label={t.ownership.resetting} /> : t.ownership.confirmReset}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className={quietButtonClassName}
        >
          {t.shared.cancel}
        </button>
      </div>
      <ErrorMessage message={error} />
    </ConfirmStep>
  );
}

const FOLLOWUP_MAX = 500;

/**
 * Optional: staff asks the owner one plain-language follow-up question on a
 * claim with no decision. Written by staff, one per claim, never changed once
 * sent, and it never approves or rejects the claim. Staff see the question as
 * the owner will before it goes out.
 */
export function AskFollowupForm({ verificationId }: { verificationId: string }) {
  const t = useMessages(adminTools);
  const [step, setStep] = useState<"closed" | "write" | "preview">("closed");
  const [question, setQuestion] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fieldId = `followup-${verificationId}`;
  const helpId = `${fieldId}-open-help`;
  const fieldRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (step === "write") {
      fieldRef.current?.focus();
    }
  }, [step]);

  function handleReview() {
    const text = question.trim();
    if (!text) {
      setFieldError(t.ownership.followupEmpty);
      return;
    }
    if (text.length > FOLLOWUP_MAX) {
      setFieldError(t.ownership.followupTooLong(FOLLOWUP_MAX));
      return;
    }
    setFieldError(null);
    setError(null);
    setStep("preview");
  }

  function handleSend() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await askOwnershipFollowup(verificationId, question.trim());
        if (!result.ok) {
          setError(result.message);
        }
      } catch {
        setError(t.ownership.followupFailed);
      }
    });
  }

  function close() {
    setStep("closed");
    setFieldError(null);
    setError(null);
  }

  if (step === "closed") {
    return (
      <div className="@container flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={() => setStep("write")}
          aria-describedby={helpId}
          className={secondaryButtonClassName}
        >
          <QuestionIcon className="size-4" />
          {t.ownership.followupOpen}
        </button>
        <p id={helpId} className="text-small text-foreground/80">
          {t.ownership.followupHelp}
        </p>
      </div>
    );
  }

  if (step === "preview") {
    return (
      <ConfirmStep
        title={t.ownership.followupPreviewTitle}
        consequence={t.ownership.followupPreviewHelp}
        tone="neutral"
        disabled={isPending}
      >
        <blockquote className="rounded-xl bg-card px-4 py-3 text-body break-words text-foreground">
          {question.trim()}
        </blockquote>
        <div className="flex flex-col gap-2 @md:flex-row @md:flex-wrap">
          <button type="button" onClick={handleSend} className={primaryButtonClassName}>
            {isPending ? (
              <Busy label={t.ownership.sending} />
            ) : (
              <>
                <SendIcon className="size-4" />
                {t.ownership.followupSend}
              </>
            )}
          </button>
          <button type="button" onClick={() => setStep("write")} className={quietButtonClassName}>
            {t.ownership.followupEdit}
          </button>
        </div>
        <ErrorMessage message={error} />
      </ConfirmStep>
    );
  }

  return (
    <fieldset className="@container flex min-w-0 flex-col gap-3" disabled={isPending}>
      <legend className="text-subheading text-foreground">{t.ownership.followupTitle}</legend>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId} className={labelClassName}>
          {t.ownership.followupLabel}
        </label>
        <p id={`${fieldId}-help`} className={hintClassName}>
          {t.ownership.followupHint}
        </p>
        <textarea
          ref={fieldRef}
          id={fieldId}
          rows={3}
          maxLength={FOLLOWUP_MAX}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className={textareaClassName}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? `${fieldId}-error ${fieldId}-help` : `${fieldId}-help`}
        />
        {fieldError ? (
          <FieldError id={`${fieldId}-error`} role="alert">
            {fieldError}
          </FieldError>
        ) : null}
        <p className={`${hintClassName} tabular-nums`}>{t.shared.characters(question.length, FOLLOWUP_MAX)}</p>
      </div>
      <div className="flex flex-col gap-2 @md:flex-row @md:flex-wrap">
        <button type="button" onClick={handleReview} className={primaryButtonClassName}>
          {t.ownership.followupReview}
        </button>
        <button type="button" onClick={close} className={quietButtonClassName}>
          {t.shared.cancel}
        </button>
      </div>
    </fieldset>
  );
}
