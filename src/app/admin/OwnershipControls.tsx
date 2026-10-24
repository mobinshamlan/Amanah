"use client";

import { useState, useTransition } from "react";
import {
  decideOwnership,
  resetOwnershipDecision,
  retryOwnershipAssessment,
} from "@/app/admin/actions";

const PRIMARY_BUTTON_CLASS =
  "inline-flex h-11 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/80 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 sm:w-auto";

const OUTLINE_BUTTON_CLASS =
  "inline-flex h-11 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-border bg-background px-6 text-base font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 sm:w-auto";

function ErrorMessage({ message }: { message: string | null }) {
  return message ? (
    <p
      role="alert"
      className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium leading-snug text-foreground"
    >
      {message}
    </p>
  ) : null;
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
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleRetry}
        disabled={isPending}
        className={OUTLINE_BUTTON_CLASS}
      >
        {isPending ? "Assessing…" : "Retry AI assessment"}
      </button>
      <ErrorMessage message={error} />
    </div>
  );
}

const REJECT_BUTTON_CLASS =
  "inline-flex h-11 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-destructive/40 bg-background px-6 text-base font-medium text-destructive outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 sm:w-auto";

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

  if (!choice) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setChoice("approved")}
            className={PRIMARY_BUTTON_CLASS}
          >
            {DECISION_CHOICES.approved.action}
          </button>
          <button
            type="button"
            onClick={() => setChoice("rejected")}
            className={REJECT_BUTTON_CLASS}
          >
            {DECISION_CHOICES.rejected.action}
          </button>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Approval does not return the item automatically. Either decision can
          be reset to pending review later.
        </p>
      </div>
    );
  }

  return (
    <fieldset className="flex flex-col gap-3" disabled={isPending}>
      <legend className="text-sm font-medium text-foreground">
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
        className="w-full rounded-lg border border-foreground/50 bg-background px-3 py-2 text-base outline-none transition-colors hover:border-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleConfirm}
          className={choice === "approved" ? PRIMARY_BUTTON_CLASS : REJECT_BUTTON_CLASS}
        >
          {isPending ? "Saving…" : DECISION_CHOICES[choice].confirm}
        </button>
        <button
          type="button"
          onClick={() => {
            setChoice(null);
            setError(null);
          }}
          className={OUTLINE_BUTTON_CLASS}
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
        className={`${OUTLINE_BUTTON_CLASS} sm:self-start`}
      >
        Reset to pending review
      </button>
    );
  }

  return (
    <fieldset className="flex flex-col gap-3" disabled={isPending}>
      <legend className="text-sm font-medium text-foreground">
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
        className="w-full rounded-lg border border-foreground/50 bg-background px-3 py-2 text-base outline-none transition-colors hover:border-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
      />
      <p className="text-sm leading-relaxed text-muted-foreground">
        The claim goes back to pending review and the owner no longer sees the
        decision. The current decision stays in the history.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={handleReset} className={PRIMARY_BUTTON_CLASS}>
          {isPending ? "Resetting…" : "Confirm reset"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className={OUTLINE_BUTTON_CLASS}
        >
          Cancel
        </button>
      </div>
      <ErrorMessage message={error} />
    </fieldset>
  );
}
