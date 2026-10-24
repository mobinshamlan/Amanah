"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { submitReport, type ReportType } from "@/app/report/actions";
import {
  validateReportFields,
  type FieldErrors,
} from "@/app/report/validation";
import {
  FoundConfirmation,
  LostConfirmation,
  statusMessage,
} from "@/app/report/SubmissionConfirmation";
import { trackingHref } from "@/app/report/tracking";
import { useMatchingProgress } from "@/app/report/useMatchingProgress";
import { SiteHeader } from "@/components/site-header";

function storageKey(reportType: ReportType) {
  return `amanah:submission:${reportType}`;
}

type ReportFormProps = {
  reportType: ReportType;
  title: string;
  intro: string;
  locationLabel: string;
  locationRequiredMessage: string;
};

export const fieldClassName =
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
  const {
    credential,
    matching,
    setMatching,
    isContinuing,
    canRetry,
    continueChecks,
    cancel,
    clear,
  } = useMatchingProgress({ reportType, storageKey: storageKey(reportType) });
  const confirmationHeadingRef = useRef<HTMLHeadingElement>(null);
  const itemNameRef = useRef<HTMLInputElement>(null);
  const focusFormAfterReset = useRef(false);
  const showConfirmation = matching !== null;

  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey(reportType));
    if (!saved) {
      return;
    }
    // Resume after a refresh. The credential is kept only in this browser tab.
    const timer = setTimeout(() => void continueChecks(saved), 0);
    return () => {
      clearTimeout(timer);
      cancel();
    };
  }, [reportType, continueChecks, cancel]);

  // Coming back from the tracking page with Back may restore this page as it was
  // left, mid-submit. The report was already saved, so show a fresh form.
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        setIsSubmitting(false);
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

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
    clear();
    sessionStorage.removeItem(storageKey(reportType));
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
    clear();
    sessionStorage.removeItem(storageKey(reportType));
    setIsSubmitting(true);
    let leavingPage = false;

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

      if (result.credential && reportType === "lost") {
        // The private tracking link follows matching from here, and keeps
        // working after a refresh or when the browser is reopened.
        leavingPage = true;
        window.location.assign(trackingHref(result.credential));
      } else if (result.credential) {
        sessionStorage.setItem(storageKey(reportType), result.credential);
        void continueChecks(result.credential);
      } else {
        setMatching({ phase: "unavailable" });
      }
    } catch {
      setFormError("Could not save your report. Please try again.");
    } finally {
      if (!leavingPage) {
        setIsSubmitting(false);
      }
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
                title="Lost report saved"
                intro="Your report is saved."
                view={matching}
                isContinuing={isContinuing}
                canRetry={canRetry}
                onRetry={retryChecks}
                onReportAnother={startAnotherReport}
                headingRef={confirmationHeadingRef}
              >
                {credential ? null : (
                  <p className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                    A private tracking link could not be created for this
                    report, so its progress cannot be followed later. Your
                    report is still saved.
                  </p>
                )}
              </LostConfirmation>
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
