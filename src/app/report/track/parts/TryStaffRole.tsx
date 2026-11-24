"use client";

import { useState, type ReactNode } from "react";
import { tryStaffDecision } from "@/app/report/track/actions";
import { CheckIcon, RefreshIcon, UserIcon, XIcon } from "@/components/icons";
import {
  Spinner,
  StatusChip,
  primaryButtonClassName,
  rejectButtonClassName,
  secondaryButtonClassName,
} from "@/components/ui";
import { useMessages } from "@/i18n/LocaleProvider";
import { track } from "@/i18n/messages/track";
import type { OwnerVerificationView } from "@/utils/ownership/service";

type Decision = "approved" | "rejected";
type Failure = "not_sandbox" | "invalid_link" | "not_ready" | "save_failed";

/**
 * Test version only. Once the owner has nothing left to answer, the visitor
 * can play the staff role on their own claim and see the page an owner gets
 * after each decision. Always labelled as simulated, so nobody mistakes it
 * for a real staff decision. The page itself (headline, progress line, the
 * stamp on the case tag) shows the result; this box only offers the choice.
 */
export function TryStaffRole({
  credential,
  decision,
  onDecided,
}: {
  credential: string;
  // The decision on the claim now, if any; then only the other one is offered.
  decision: Decision | null;
  onDecided: (view: OwnerVerificationView) => void;
}) {
  const t = useMessages(track).sandbox.staff;
  const [saving, setSaving] = useState<Decision | null>(null);
  const [error, setError] = useState<Failure | null>(null);
  const [announcement, setAnnouncement] = useState("");

  async function decide(next: Decision) {
    if (saving) return;
    setError(null);
    setAnnouncement(t.saving);
    setSaving(next);
    try {
      const result = await tryStaffDecision(credential, next);
      if (result.ok) {
        setAnnouncement(t.announce[next]);
        onDecided(result.view);
      } else {
        setAnnouncement("");
        setError(result.reason);
      }
    } catch {
      setAnnouncement("");
      setError("save_failed");
    } finally {
      setSaving(null);
    }
  }

  const busy = saving !== null;
  const button = (next: Decision, className: string, label: string, icon: ReactNode) => (
    <button
      type="button"
      onClick={() => void decide(next)}
      aria-disabled={busy}
      className={`${className} ${busy ? "cursor-progress" : ""} ${busy && saving !== next ? "opacity-60" : ""}`}
    >
      {saving === next ? (
        <>
          <Spinner />
          {t.saving}
        </>
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </button>
  );

  return (
    <section
      aria-labelledby="try-staff-title"
      aria-busy={busy}
      className="flex w-full max-w-[32rem] flex-col items-start gap-3 rounded-[1.5rem] bg-secondary px-6 py-6 motion-safe:animate-rise sm:px-8"
    >
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <StatusChip tone="info" icon={<UserIcon className="size-3.5" />}>
        {t.label}
      </StatusChip>
      <h2 id="try-staff-title" className="text-subheading text-foreground">
        {t.title}
      </h2>
      <p className="max-w-[46ch] text-body text-foreground/85">
        {decision ? t.decided[decision] : t.intro}
      </p>
      <div className="mt-1 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
        {decision
          ? button(
              decision === "approved" ? "rejected" : "approved",
              secondaryButtonClassName,
              t.tryOther,
              <RefreshIcon className="size-4" />,
            )
          : (
            <>
              {button("approved", primaryButtonClassName, t.approve, <CheckIcon className="size-4" />)}
              {button("rejected", rejectButtonClassName, t.reject, <XIcon className="size-4" />)}
            </>
          )}
      </div>
      {error ? (
        <p role="alert" className="text-small font-medium text-destructive">
          {t.errors[error]}
        </p>
      ) : null}
    </section>
  );
}
