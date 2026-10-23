"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  continueMatching,
  submitReport,
  type ReportType,
} from "@/app/report/actions";
import {
  validateReportFields,
  type FieldErrors,
} from "@/app/report/validation";
import {
  FoundConfirmation,
  LostConfirmation,
  type MatchingView,
} from "@/app/report/SubmissionConfirmation";
import { SiteHeader } from "@/components/site-header";

// Each continuation request is bounded on the server; this caps requests per page visit.
const MAX_CONTINUATION_STEPS = 40;
// After this many waits for the Gemini rate limit, the submitter must choose Try again.
const MAX_RATE_LIMIT_WAITS = 2;

function storageKey(reportType: ReportType) {
  return `amanah:submission:${reportType}`;
}

function statusMessage(reportType: ReportType, view: MatchingView, waiting: boolean) {
  if (reportType === "found") {
    switch (view.phase) {
      case "checking":
        return "Report saved. Thank you for reporting this item. Finishing up…";
      case "rate_limited":
        return waiting
          ? "Report saved. Thank you for reporting this item. Automatic processing is paused because the service is busy and will continue in about a minute."
          : "Report saved. Thank you for reporting this item. Automatic processing did not finish because the service is busy. You can try again in a few minutes.";
      case "complete":
        return "Report saved. Thank you for reporting this item.";
      case "stalled":
        return "Report saved. Thank you for reporting this item. Processing is taking longer than expected; refresh the page to continue.";
      case "lost_access":
        return "Report saved. Thank you for reporting this item.";
      default:
        return "Report saved. Thank you for reporting this item. Some automatic processing did not finish. You can try again.";
    }
  }

  if ("outcome" in view && view.outcome === "possible_match") {
    return view.phase === "failed" ||
      view.phase === "unavailable" ||
      view.phase === "rate_limited"
      ? "We found a possible match. Ownership verification is the next step. Some other checks did not finish."
      : "We found a possible match. Ownership verification is the next step.";
  }
  switch (view.phase) {
    case "checking":
      return "Report saved. Checking for possible matches…";
    case "rate_limited":
      return waiting
        ? "Your report is saved. Checking is paused because the matching service is busy and will continue in about a minute if this page stays open. This is not a “no match” result."
        : "Your report is saved, but checking for possible matches did not finish because the matching service is busy. This is not a “no match” result. You can try again in a few minutes.";
    case "complete":
      return "outcome" in view && view.outcome === "uncertain"
        ? "Your report is saved. We could not tell from the details whether a found item matches, so staff may review it."
        : "No possible match yet. Your report is saved.";
    case "unavailable":
      return "Your report is saved, but automatic matching is not available right now. This is not a “no match” result.";
    case "stalled":
      return "Your report is saved. Checking is taking longer than expected and is not finished. Refresh the page to continue.";
    case "lost_access":
      return "Your report is saved. Its matching status is no longer available on this page.";
    default:
      return "Your report is saved, but checking for possible matches did not finish. This is not a “no match” result. You can try again.";
  }
}

type ReportFormProps = {
  reportType: ReportType;
  title: string;
  intro: string;
  locationLabel: string;
  locationRequiredMessage: string;
};

const fieldClassName =
  "h-11 w-full rounded-lg border border-foreground/50 bg-background px-3 text-base outline-none transition-colors hover:border-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

export default function ReportForm({
  reportType,
  title,
  intro,
  locationLabel,
  locationRequiredMessage,
}: ReportFormProps) {
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credential, setCredential] = useState<string | null>(null);
  const [matching, setMatching] = useState<MatchingView | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const activeRun = useRef(0);
  const confirmationHeadingRef = useRef<HTMLHeadingElement>(null);
  const itemNameRef = useRef<HTMLInputElement>(null);
  const focusFormAfterReset = useRef(false);
  const showConfirmation = matching !== null;

  const continueChecks = useCallback(
    async (submissionCredential: string) => {
      const run = ++activeRun.current;
      setCredential(submissionCredential);
      setMatching({ phase: "checking" });
      setIsContinuing(true);
      let rateLimitWaits = 0;
      try {
        for (let step = 0; step < MAX_CONTINUATION_STEPS; step += 1) {
          if (run !== activeRun.current) {
            return;
          }
          const result = await continueMatching(submissionCredential);
          if (run !== activeRun.current) {
            return;
          }
          if (!result.ok) {
            sessionStorage.removeItem(storageKey(reportType));
            setMatching({ phase: "lost_access" });
            return;
          }
          setMatching(result.status);
          if (result.status.phase === "complete") {
            sessionStorage.removeItem(storageKey(reportType));
          }
          if (result.status.phase === "rate_limited") {
            if (rateLimitWaits >= MAX_RATE_LIMIT_WAITS) {
              return;
            }
            rateLimitWaits += 1;
          } else if (result.status.phase !== "checking") {
            return;
          }
          if (result.waitMs) {
            await new Promise((resolve) => setTimeout(resolve, result.waitMs));
          }
        }
        setMatching({ phase: "stalled" });
      } catch {
        if (run === activeRun.current) {
          setMatching({ phase: "failed" });
        }
      } finally {
        if (run === activeRun.current) {
          setIsContinuing(false);
        }
      }
    },
    [reportType],
  );

  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey(reportType));
    if (!saved) {
      return;
    }
    // Resume after a refresh. The credential is kept only in this browser tab.
    const timer = setTimeout(() => void continueChecks(saved), 0);
    return () => {
      clearTimeout(timer);
      activeRun.current += 1;
    };
  }, [reportType, continueChecks]);

  // The confirmation replaces the form, so move focus with it.
  useEffect(() => {
    if (showConfirmation) {
      window.scrollTo({ top: 0 });
      confirmationHeadingRef.current?.focus({ preventScroll: true });
    } else if (focusFormAfterReset.current) {
      focusFormAfterReset.current = false;
      itemNameRef.current?.focus();
    }
  }, [showConfirmation]);

  function startAnotherReport() {
    // Stop following the previous submission; it stays saved and is not sent again.
    activeRun.current += 1;
    sessionStorage.removeItem(storageKey(reportType));
    setMatching(null);
    setCredential(null);
    setIsContinuing(false);
    setErrors({});
    setFormError(null);
    setItemName("");
    setDescription("");
    setLocation("");
    focusFormAfterReset.current = true;
  }

  function retryChecks() {
    if (!credential) {
      return;
    }
    // The action buttons hide while checking, so keep focus on the confirmation.
    confirmationHeadingRef.current?.focus();
    void continueChecks(credential);
  }

  const canRetry =
    Boolean(credential) &&
    !isContinuing &&
    (matching?.phase === "failed" ||
      matching?.phase === "rate_limited" ||
      matching?.phase === "unavailable");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const nextErrors = validateReportFields(
      { itemName, description, location },
      locationRequiredMessage,
    );
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    // A new submission replaces the previous one shown on this page.
    activeRun.current += 1;
    setMatching(null);
    setCredential(null);
    sessionStorage.removeItem(storageKey(reportType));
    setIsSubmitting(true);

    try {
      const result = await submitReport(reportType, {
        itemName,
        description,
        location,
      });

      if (!result.ok) {
        if (result.fieldErrors) {
          setErrors(result.fieldErrors);
        }
        setFormError(
          result.message ?? "Could not save your report. Please try again.",
        );
        return;
      }

      setErrors({});
      setItemName("");
      setDescription("");
      setLocation("");

      if (result.credential) {
        sessionStorage.setItem(storageKey(reportType), result.credential);
        void continueChecks(result.credential);
      } else {
        setMatching({ phase: "unavailable" });
      }
    } catch {
      setFormError("Could not save your report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col px-5 pb-16 pt-6 sm:px-8 sm:pb-24 sm:pt-10">
          <Link
            href="/"
            className="-ml-2 inline-flex w-fit items-center rounded-md px-2 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Back to home
          </Link>

          {/* Always mounted so screen readers announce each status change. */}
          <p role="status" className="sr-only">
            {matching ? statusMessage(reportType, matching, isContinuing) : ""}
          </p>

          {matching ? (
            reportType === "found" ? (
              <FoundConfirmation
                view={matching}
                isContinuing={isContinuing}
                canRetry={canRetry}
                onRetry={retryChecks}
                onReportAnother={startAnotherReport}
                headingRef={confirmationHeadingRef}
              />
            ) : (
              <LostConfirmation
                view={matching}
                isContinuing={isContinuing}
                canRetry={canRetry}
                onRetry={retryChecks}
                onReportAnother={startAnotherReport}
                headingRef={confirmationHeadingRef}
              />
            )
          ) : (
            <>
              <h1 className="mt-5 text-balance font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
                {title}
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {intro}
              </p>

              <form
                onSubmit={handleSubmit}
                className="mt-8 flex flex-col gap-5 sm:mt-10"
                noValidate
              >
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="itemName"
                    className="text-base font-medium leading-snug text-foreground"
                  >
                    Item name
                  </label>
                  <input
                    ref={itemNameRef}
                    id="itemName"
                    name="itemName"
                    type="text"
                    value={itemName}
                    onChange={(event) => setItemName(event.target.value)}
                    disabled={isSubmitting}
                    className={fieldClassName}
                    aria-invalid={Boolean(errors.itemName)}
                    aria-describedby={
                      errors.itemName ? "itemName-error" : undefined
                    }
                  />
                  {errors.itemName ? (
                    <p
                      id="itemName-error"
                      className="text-sm font-medium leading-snug text-foreground"
                    >
                      {errors.itemName}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="description"
                    className="text-base font-medium leading-snug text-foreground"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    disabled={isSubmitting}
                    className={`${fieldClassName} h-auto min-h-24 py-2`}
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={
                      errors.description ? "description-error" : undefined
                    }
                  />
                  {errors.description ? (
                    <p
                      id="description-error"
                      className="text-sm font-medium leading-snug text-foreground"
                    >
                      {errors.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="location"
                    className="text-base font-medium leading-snug text-foreground"
                  >
                    {locationLabel}
                  </label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    disabled={isSubmitting}
                    className={fieldClassName}
                    aria-invalid={Boolean(errors.location)}
                    aria-describedby={
                      errors.location ? "location-error" : undefined
                    }
                  />
                  {errors.location ? (
                    <p
                      id="location-error"
                      className="text-sm font-medium leading-snug text-foreground"
                    >
                      {errors.location}
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/80 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 sm:w-auto sm:self-start"
                >
                  {isSubmitting ? "Saving…" : "Submit report"}
                </button>
              </form>

              {formError ? (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium leading-snug text-foreground"
                >
                  {formError}
                </p>
              ) : null}
            </>
          )}
        </div>
      </main>
    </>
  );
}
