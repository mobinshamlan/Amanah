"use client";

import { useState, useTransition } from "react";
import {
  askOwnershipFollowup,
  decideOwnership,
  resetOwnershipDecision,
  retryOwnershipAssessment,
} from "@/app/admin/actions";
import {
  FieldError,
  Notice,
  Spinner,
  textareaClassName,
  primaryButtonClassName,
  rejectButtonClassName,
  secondaryButtonClassName,
} from "@/components/ui";

function ErrorMessage({ message }: { message: string | null }) {
  return message ? (
    <Notice tone="error" role="alert">
      {message}
    </Notice>
  ) : null;
}

function Busy({ label }: { label: string }) {
  return (
    <>
      <Spinner />
      {label}
    </>
  );
}

export function RetryAssessmentButton({ verificationId }: { verificationId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRetry() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await retryOwnershipAssessment(verificationId);
        if (!result.ok) {
          setError(result.message);
        }
      } catch {
        setError("The AI assessment did not finish. The answers are saved. You can try again.");
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleRetry}
        disabled={isPending}
        className={secondaryButtonClassName}
      >
        {isPending ? <Busy label="Assessing…" /> : "Retry AI assessment"}
      </button>
      <ErrorMessage message={error} />
    </div>
  );
}

const DECISION_CHOICES = {
  approved: { action: "Approve for ownership follow-up", confirm: "Confirm approval" },
  rejected: { action: "Reject this claim", confirm: "Confirm rejection" },
} as const;

/**
 * Staff decision for a claim pending review: choose an action, optionally add
 * a note, then confirm. Approval means staff may proceed with ownership
 * follow-up; it does not return the item automatically.
 */
export function OwnershipDecisionForm({ verificationId }: { verificationId: string }) {
  const [choice, setChoice] = useState<"approved" | "rejected" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const noteId = `decision-${verificationId}-note`;

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
        }
      } catch {
        setError("The decision could not be saved. Please try again.");
      }
    });
  }

  // Buttons sit side by side only when this panel itself has room; in the
  // narrow decision column they stack at full width.
  if (!choice) {
    return (
      <div className="@container flex flex-col gap-3">
        <div className="flex flex-col gap-2 @md:flex-row @md:flex-wrap">
          <button
            type="button"
            onClick={() => setChoice("approved")}
            className={primaryButtonClassName}
          >
            {DECISION_CHOICES.approved.action}
          </button>
          <button
            type="button"
            onClick={() => setChoice("rejected")}
            className={rejectButtonClassName}
          >
            {DECISION_CHOICES.rejected.action}
          </button>
        </div>
        <p className="text-sm leading-relaxed text-foreground/70">
          Approval does not return the item automatically. Either decision can
          be reset to pending review later.
        </p>
      </div>
    );
  }

  return (
    <fieldset className="@container flex min-w-0 flex-col gap-3" disabled={isPending}>
      <legend className="text-base font-semibold text-foreground">
        {DECISION_CHOICES[choice].action}
      </legend>
      <label htmlFor={noteId} className="text-sm font-medium text-foreground">
        Note for staff (optional)
      </label>
      <textarea
        id={noteId}
        rows={2}
        maxLength={1000}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        className={textareaClassName}
      />
      <div className="flex flex-col gap-2 @md:flex-row @md:flex-wrap">
        <button
          type="button"
          onClick={handleConfirm}
          className={choice === "approved" ? primaryButtonClassName : rejectButtonClassName}
        >
          {isPending ? <Busy label="Saving…" /> : DECISION_CHOICES[choice].confirm}
        </button>
        <button
          type="button"
          onClick={() => {
            setChoice(null);
            setError(null);
          }}
          className={secondaryButtonClassName}
        >
          Cancel
        </button>
      </div>
      <ErrorMessage message={error} />
    </fieldset>
  );
}

/**
 * Resets an approved or rejected decision to pending review. The earlier
 * decision and the reset both stay in the decision history.
 */
export function ResetDecisionForm({ verificationId }: { verificationId: string }) {
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
        setOpen(false);
        setReason("");
      } catch {
        setError("The decision could not be reset. Please try again.");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${secondaryButtonClassName} self-start`}
      >
        Reset to pending review
      </button>
    );
  }

  return (
    <fieldset className="@container flex min-w-0 flex-col gap-3" disabled={isPending}>
      <legend className="text-base font-semibold text-foreground">
        Reset decision to pending review
      </legend>
      <label htmlFor={reasonId} className="text-sm font-medium text-foreground">
        Reason (optional)
      </label>
      <textarea
        id={reasonId}
        rows={2}
        maxLength={1000}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className={textareaClassName}
      />
      <p className="text-sm leading-relaxed text-foreground/70">
        The claim goes back to pending review and the owner no longer sees the
        decision. The current decision stays in the history.
      </p>
      <div className="flex flex-col gap-2 @md:flex-row @md:flex-wrap">
        <button type="button" onClick={handleReset} className={primaryButtonClassName}>
          {isPending ? <Busy label="Resetting…" /> : "Confirm reset"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className={secondaryButtonClassName}
        >
          Cancel
        </button>
      </div>
      <ErrorMessage message={error} />
    </fieldset>
  );
}

const FOLLOWUP_MAX = 500;

/**
 * Optional: staff asks the owner one plain-language follow-up question on a
 * claim with no decision. It is written by staff, only one is allowed, and it
 * never approves or rejects the claim.
 */
export function AskFollowupForm({ verificationId }: { verificationId: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fieldId = `followup-${verificationId}`;

  function handleSend() {
    const text = question.trim();
    if (!text) {
      setFieldError("Write a question first.");
      return;
    }
    if (text.length > FOLLOWUP_MAX) {
      setFieldError(`Keep the question under ${FOLLOWUP_MAX} characters.`);
      return;
    }
    setFieldError(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await askOwnershipFollowup(verificationId, text);
        if (!result.ok) {
          setError(result.message);
        }
      } catch {
        setError("The follow-up question could not be saved. Please try again.");
      }
    });
  }

  if (!open) {
    return (
      <div className="@container flex flex-col items-start gap-2">
        <button type="button" onClick={() => setOpen(true)} className={secondaryButtonClassName}>
          Ask a follow-up question
        </button>
        <p className="text-sm leading-relaxed text-foreground/70">
          Optional. Use it only if the existing answers need clarifying. You can also decide
          without one.
        </p>
      </div>
    );
  }

  return (
    <fieldset className="@container flex min-w-0 flex-col gap-3" disabled={isPending}>
      <legend className="text-base font-semibold text-foreground">Ask a follow-up question</legend>
      <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
        Question for the owner
      </label>
      <textarea
        id={fieldId}
        rows={3}
        maxLength={FOLLOWUP_MAX}
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        className={textareaClassName}
        aria-invalid={Boolean(fieldError)}
        aria-describedby={fieldError ? `${fieldId}-error ${fieldId}-help` : `${fieldId}-help`}
      />
      {fieldError ? <FieldError id={`${fieldId}-error`} role="alert">{fieldError}</FieldError> : null}
      <p id={`${fieldId}-help`} className="text-sm leading-relaxed text-foreground/70">
        <span className="tabular-nums">{question.length}/{FOLLOWUP_MAX}</span> · The owner sees this
        on their private tracking page and can answer once. Only one follow-up is allowed, and it
        cannot be changed. It does not approve or reject the claim. Do not include details from the
        found report.
      </p>
      <div className="flex flex-col gap-2 @md:flex-row @md:flex-wrap">
        <button type="button" onClick={handleSend} className={primaryButtonClassName}>
          {isPending ? <Busy label="Sending…" /> : "Send question"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setFieldError(null);
            setError(null);
          }}
          className={secondaryButtonClassName}
        >
          Cancel
        </button>
      </div>
      <ErrorMessage message={error} />
    </fieldset>
  );
}
