"use client";

import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
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
import { ArrowRightIcon, KeyholeGlyph, KeyholeMark } from "@/components/icons";
import {
  FieldError,
  Notice,
  PageShell,
  Spinner,
  fieldClassName,
  primaryButtonLargeClassName,
  textareaClassName,
} from "@/components/ui";

const descriptionClassName = `${textareaClassName} min-h-40`;

const legendClassName =
  "font-serif text-[1.75rem] font-semibold leading-tight tracking-[-0.01em] text-foreground";

function storageKey(reportType: ReportType) {
  return `amanah:submission:${reportType}`;
}

type ReportFormProps = {
  reportType: ReportType;
  eyebrow: string;
  title: string;
  intro: string;
  locationLabel: string;
  locationHint: string;
  locationRequiredMessage: string;
  // Supporting guidance shown beside the form on desktop and after it on phones.
  nextSteps?: string[];
};

type FieldName = keyof FieldErrors;

function describedBy(name: FieldName, errors: FieldErrors) {
  return errors[name] ? `${name}-hint ${name}-error` : `${name}-hint`;
}

function Field({
  name,
  label,
  hint,
  error,
  children,
}: {
  name: FieldName;
  label: string;
  hint: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-1">
        <label htmlFor={name} className="text-base font-semibold leading-snug text-foreground">
          {label}
        </label>
        <p id={`${name}-hint`} className="text-[0.9375rem] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      </div>
      {children}
      {error ? <FieldError id={`${name}-error`}>{error}</FieldError> : null}
    </div>
  );
}

export default function ReportForm({
  reportType,
  eyebrow,
  title,
  intro,
  locationLabel,
  locationHint,
  locationRequiredMessage,
  nextSteps,
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
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
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

  function focusFirstInvalid(fieldErrors: FieldErrors) {
    if (fieldErrors.itemName) {
      itemNameRef.current?.focus();
    } else if (fieldErrors.description) {
      descriptionRef.current?.focus();
    } else if (fieldErrors.location) {
      locationRef.current?.focus();
    }
  }

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
      focusFirstInvalid(nextErrors);
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
    <PageShell width={matching ? "narrow" : "wide"}>
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
            context="Report saved"
            saved
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
              <Notice className="mt-4">
                <span className="font-normal">
                  A private tracking link could not be created for this report,
                  so its progress cannot be followed later. Your report is still
                  saved.
                </span>
              </Notice>
            )}
          </LostConfirmation>
        )
      ) : (
        // Phones read title, form, then guidance; wide screens put the
        // guidance under the title, beside the form.
        <div className="mt-6 grid items-start gap-10 sm:mt-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-12">
          <header className="flex flex-col motion-safe:animate-rise lg:col-start-1 lg:row-start-1">
            <p className="flex items-center gap-2.5 text-[0.9375rem] font-medium text-forest">
              <KeyholeMark className="size-7" />
              {eyebrow}
            </p>
            <h1 className="mt-5 max-w-[12ch] text-balance font-serif text-[2.75rem] font-semibold leading-[1.0] tracking-[-0.02em] text-foreground sm:text-6xl lg:text-[4.25rem]">
              {title}
            </h1>
            <p className="mt-5 max-w-[46ch] text-pretty text-base leading-relaxed text-foreground/80 sm:text-lg">
              {intro}
            </p>
          </header>

          <form
            onSubmit={handleSubmit}
            aria-busy={isSubmitting}
            aria-label={title}
            className="rounded-[1.75rem] border border-border bg-card p-5 motion-safe:animate-rise motion-safe:[animation-delay:80ms] sm:p-10 lg:col-start-2 lg:row-span-2 lg:row-start-1"
            noValidate
          >
            <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">
              All fields are required.
            </p>

            <fieldset className="mt-6">
              <legend className={legendClassName}>What it is</legend>
              <div className="mt-5 flex flex-col gap-7">
                <Field
                  name="itemName"
                  label="Item name"
                  hint="A short name, for example “Black backpack”."
                  error={errors.itemName}
                >
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
                    aria-describedby={describedBy("itemName", errors)}
                  />
                </Field>

                <Field
                  name="description"
                  label="Description"
                  hint="Colour, brand, size, contents, or anything distinctive."
                  error={errors.description}
                >
                  <textarea
                    ref={descriptionRef}
                    id="description"
                    name="description"
                    rows={4}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    disabled={isSubmitting}
                    className={descriptionClassName}
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={describedBy("description", errors)}
                  />
                </Field>
              </div>
            </fieldset>

            <span aria-hidden className="perforation my-9 block text-foreground/20" />

            <fieldset>
              <legend className={legendClassName}>Where</legend>
              <div className="mt-5">
                <Field
                  name="location"
                  label={locationLabel}
                  hint={locationHint}
                  error={errors.location}
                >
                  <input
                    ref={locationRef}
                    id="location"
                    name="location"
                    type="text"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    disabled={isSubmitting}
                    className={fieldClassName}
                    aria-invalid={Boolean(errors.location)}
                    aria-describedby={describedBy("location", errors)}
                  />
                </Field>
              </div>
            </fieldset>

            {formError ? (
              <Notice tone="error" role="alert" className="mt-8">
                {formError}
              </Notice>
            ) : null}

            {reportType === "found" ? (
              <Notice className="mt-8">
                After submitting this report, please drop off the item with your
                organization’s lost-and-found staff.
              </Notice>
            ) : null}

            <div className="mt-10">
              <button
                type="submit"
                disabled={isSubmitting}
                className={primaryButtonLargeClassName}
              >
                {isSubmitting ? (
                  <>
                    <Spinner />
                    Saving…
                  </>
                ) : (
                  <>
                    Submit report
                    <ArrowRightIcon className="size-5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {nextSteps ? (
            <aside
              aria-labelledby="next-steps-title"
              className="edge-torn bg-secondary px-5 pt-7 motion-safe:animate-rise motion-safe:[animation-delay:160ms] sm:px-8 sm:pt-8 lg:col-start-1 lg:row-start-2"
            >
              <h2
                id="next-steps-title"
                className="font-serif text-[1.75rem] font-semibold leading-tight text-foreground"
              >
                After you submit
              </h2>
              <ol className="mt-5 flex flex-col gap-4">
                {nextSteps.map((step) => (
                  <li key={step} className="flex gap-3 text-base leading-relaxed text-foreground">
                    <KeyholeGlyph className="mt-1 size-4 shrink-0 text-forest" />
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </aside>
          ) : (
            <aside
              aria-labelledby="care-title"
              className="relative isolate px-6 py-8 pl-9 text-cream motion-safe:animate-rise motion-safe:[animation-delay:160ms] sm:px-9 sm:pl-12 lg:col-start-1 lg:row-start-2"
            >
              <span aria-hidden className="shape-tag absolute inset-0 -z-10 bg-forest" />
              <h2
                id="care-title"
                className="max-w-[16ch] font-serif text-[2rem] font-semibold leading-[1.05] tracking-[-0.01em] text-cream"
              >
                Every found item is an amanah.
              </h2>
              <p className="mt-3 max-w-[40ch] text-base leading-relaxed text-cream/90">
                Your report stays private and helps staff return the item safely.
              </p>
            </aside>
          )}
        </div>
      )}
    </PageShell>
  );
}
