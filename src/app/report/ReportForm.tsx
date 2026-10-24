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
import { ArrowRightIcon, KeyholeMark } from "@/components/icons";
import {
  Eyebrow,
  FieldError,
  Notice,
  PageShell,
  Spinner,
} from "@/components/ui";

// Report-form controls follow Amanah's 44px form standard and use a clear
// forest focus ring.
const inputClassName =
  "h-11 w-full rounded-lg border border-foreground/50 bg-background px-3 text-base text-foreground outline-none transition-[border-color,box-shadow] duration-150 hover:border-foreground/75 focus-visible:border-forest focus-visible:ring-3 focus-visible:ring-forest/40 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15";

const descriptionClassName = `${inputClassName} h-auto min-h-36 resize-y py-3 leading-relaxed`;

const submitClassName = `inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground transition-[background-color,transform] duration-150 hover:bg-pine active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto outline-none focus-visible:ring-3 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-card`;

const legendClassName =
  "mb-5 font-serif text-[1.6rem] font-semibold leading-tight tracking-tight text-foreground";

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
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={name} className="text-base font-semibold leading-snug text-foreground">
          {label}
        </label>
        <p id={`${name}-hint`} className="text-sm leading-relaxed text-muted-foreground">
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
            eyebrow="Report saved"
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
                <span className="font-normal text-muted-foreground">
                  A private tracking link could not be created for this report,
                  so its progress cannot be followed later. Your report is still
                  saved.
                </span>
              </Notice>
            )}
          </LostConfirmation>
        )
      ) : (
        <>
          <header className="mt-6 max-w-3xl motion-safe:animate-enter sm:mt-10">
            <div className="flex items-center gap-2.5">
              <KeyholeMark className="size-7" />
              <Eyebrow>{eyebrow}</Eyebrow>
            </div>
            <h1 className="mt-4 text-balance font-serif text-[2.6rem] font-semibold leading-[1.04] tracking-tight text-foreground sm:text-[3.5rem]">
              {title}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {intro}
            </p>
          </header>

          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:gap-8">
            <form
              onSubmit={handleSubmit}
              aria-busy={isSubmitting}
              aria-label={title}
              className="rounded-2xl border border-border bg-card p-5 shadow-card motion-safe:animate-enter motion-safe:[animation-delay:90ms] sm:p-8"
              noValidate
            >
              <p className="text-sm leading-relaxed text-muted-foreground">
                All fields are required.
              </p>

              <fieldset className="mt-6">
                <legend className={legendClassName}>What it is</legend>
                <div className="flex flex-col gap-6">
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
                      className={inputClassName}
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

              <fieldset className="mt-10">
                <legend className={legendClassName}>Where</legend>
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
                    className={inputClassName}
                    aria-invalid={Boolean(errors.location)}
                    aria-describedby={describedBy("location", errors)}
                  />
                </Field>
              </fieldset>

              {formError ? (
                <Notice tone="error" role="alert" className="mt-8">
                  {formError}
                </Notice>
              ) : null}

              <div className="mt-10">
                <button type="submit" disabled={isSubmitting} className={submitClassName}>
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
                className="rounded-2xl border border-border bg-muted/60 p-5 motion-safe:animate-enter motion-safe:[animation-delay:90ms] sm:p-6"
              >
                <Eyebrow tone="clay">
                  <span id="next-steps-title">After you submit</span>
                </Eyebrow>
                <ol className="mt-4 flex flex-col gap-4">
                  {nextSteps.map((step, index) => (
                    <li key={step} className="flex gap-3 text-base leading-relaxed text-foreground">
                      <span
                        aria-hidden
                        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-sage/30 text-xs font-semibold tabular-nums text-pine"
                      >
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </aside>
            ) : (
              <aside className="rounded-2xl border border-border bg-muted/60 p-5 motion-safe:animate-enter motion-safe:[animation-delay:90ms] sm:p-6">
                <Eyebrow tone="forest">Handled with care</Eyebrow>
                <h2 className="mt-3 max-w-[16ch] font-serif text-3xl font-semibold leading-tight tracking-tight text-foreground">
                  Every found item is an amanah.
                </h2>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  Your report stays private and helps staff return the item safely.
                </p>
              </aside>
            )}

          </div>
        </>
      )}
    </PageShell>
  );
}
