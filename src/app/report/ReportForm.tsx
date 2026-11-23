"use client";

import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { submitReport, type ReportType } from "@/app/report/actions";
import {
  DESCRIPTION_MAX,
  validateReportFields,
  type FieldErrors,
  type ReportFieldName,
  type ReportFields,
} from "@/app/report/validation";
import {
  FoundConfirmation,
  LostConfirmation,
  statusMessage,
} from "@/app/report/SubmissionConfirmation";
import { trackingHref } from "@/app/report/tracking";
import { useMatchingProgress } from "@/app/report/useMatchingProgress";
import { KeyholeGlyph, LensIcon, LockIcon, TagIcon } from "@/components/icons";
import {
  FieldError,
  Notice,
  PageShell,
  Spinner,
  fieldClassName,
  hintClassName,
  labelClassName,
  primaryButtonLargeClassName,
  secondaryButtonClassName,
  textareaClassName,
} from "@/components/ui";
import { formatNumber } from "@/i18n/format";
import { useLocale, useMessages } from "@/i18n/LocaleProvider";
import { report } from "@/i18n/messages/report";

/*
  The two reporting forms. One component, two kinds: what differs is the
  question in the headline, the examples in the fields and the shape of the
  guidance piece. Lost is a slip torn from the desk's pad (the report you
  leave); found is a tag on deep pine (the tag tied to the item). The
  difference is carried by the words, the mark and the shape, never by colour
  alone.
*/

function storageKey(reportType: ReportType) {
  return `amanah:submission:${reportType}`;
}

const EMPTY: ReportFields = { itemName: "", description: "", location: "" };
const FIELD_ORDER: ReportFieldName[] = ["itemName", "description", "location"];

// Fields take the page direction while empty (an empty dir="auto" field lays
// its placeholder out left-to-right in Chrome) and follow their text after.
function describedBy(name: ReportFieldName, error: string | undefined, extra?: string) {
  return [`${name}-hint`, extra, error ? `${name}-error` : undefined]
    .filter(Boolean)
    .join(" ");
}

function Field({
  name,
  label,
  hint,
  error,
  children,
}: {
  name: ReportFieldName;
  label: string;
  hint: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={name} className={labelClassName}>
          {label}
        </label>
        <p id={`${name}-hint`} className={hintClassName}>
          {hint}
        </p>
      </div>
      {children}
      {error ? (
        <FieldError id={`${name}-error`}>
          <span className="break-words">{error}</span>
        </FieldError>
      ) : null}
    </div>
  );
}

/** The kind's mark: a lens in a dashed ring for lost, a tag on a filled tile for found. */
function KindMark({ kind }: { kind: ReportType }) {
  return kind === "lost" ? (
    <span
      aria-hidden
      className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-pine/60 text-pine sm:size-16"
    >
      <LensIcon className="size-6 sm:size-8" />
    </span>
  ) : (
    <span
      aria-hidden
      className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-pine sm:size-16"
    >
      <TagIcon className="size-6 sm:size-8" />
    </span>
  );
}

export default function ReportForm({ reportType }: { reportType: ReportType }) {
  const t = useMessages(report);
  const k = t.kinds[reportType];
  const { locale } = useLocale();
  const validationMessages = { ...t, locationRequired: k.locationRequired };

  const [fields, setFields] = useState<ReportFields>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [canRetrySubmit, setCanRetrySubmit] = useState(false);
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
  const fieldRefs = useRef<Record<ReportFieldName, HTMLInputElement | HTMLTextAreaElement | null>>({
    itemName: null,
    description: null,
    location: null,
  });
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
      fieldRefs.current.itemName?.focus();
    }
  }, [showConfirmation]);

  function focusFirstInvalid(fieldErrors: FieldErrors) {
    const first = FIELD_ORDER.find((name) => fieldErrors[name]);
    if (first) {
      fieldRefs.current[first]?.focus();
    }
  }

  function updateField(name: ReportFieldName, value: string) {
    const next = { ...fields, [name]: value };
    setFields(next);
    // After one attempt, errors clear as soon as the field is fixed.
    if (attempted) {
      setErrors(validateReportFields(next, validationMessages));
    }
  }

  function resetForm() {
    setErrors({});
    setAttempted(false);
    setFormError(null);
    setCanRetrySubmit(false);
    setFields(EMPTY);
  }

  function startAnotherReport() {
    // Stop following the previous submission; it stays saved and is not sent again.
    clear();
    sessionStorage.removeItem(storageKey(reportType));
    resetForm();
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

  async function submit() {
    if (isSubmitting) {
      return;
    }
    setFormError(null);
    setCanRetrySubmit(false);
    setAttempted(true);

    const nextErrors = validateReportFields(fields, validationMessages);
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
      const result = await submitReport(reportType, fields);

      if (!result.ok) {
        if (result.fieldErrors) {
          setErrors(result.fieldErrors);
          setFormError(result.message ?? t.fixHighlighted);
          focusFirstInvalid(result.fieldErrors);
        } else {
          setFormError(result.message ?? t.saveFailed);
          setCanRetrySubmit(true);
        }
        return;
      }

      resetForm();

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
      setFormError(t.saveFailed);
      setCanRetrySubmit(true);
    } finally {
      if (!leavingPage) {
        setIsSubmitting(false);
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  const descriptionLength = fields.description.trim().length;
  const overLimit = descriptionLength - DESCRIPTION_MAX;
  const counterText =
    overLimit > 0
      ? t.overLimit(formatNumber(overLimit, locale))
      : t.counter(formatNumber(descriptionLength, locale), formatNumber(DESCRIPTION_MAX, locale));

  const lost = reportType === "lost";

  return (
    <PageShell width={matching ? "narrow" : "wide"}>
      {/* Always mounted so screen readers announce each status change. */}
      <p role="status" className="sr-only">
        {matching
          ? statusMessage(reportType, matching, isContinuing)
          : isSubmitting
            ? t.savingStatus
            : ""}
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
            context={t.savedContext}
            saved
            title={k.savedTitle}
            intro={k.savedIntro}
            view={matching}
            isContinuing={isContinuing}
            canRetry={canRetry}
            onRetry={retryChecks}
            onReportAnother={startAnotherReport}
            headingRef={confirmationHeadingRef}
          >
            {credential ? null : (
              <Notice className="mt-4">
                <span className="font-normal">{t.noTrackingLink}</span>
              </Notice>
            )}
          </LostConfirmation>
        )
      ) : (
        // Phones read the question, the form, then the guidance; wide screens
        // put the guidance under the question, beside the form sheet.
        <div className="mt-4 grid items-start gap-8 sm:mt-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-10">
          <header className="flex min-w-0 flex-col items-start gap-4 motion-safe:animate-rise lg:col-start-1 lg:row-start-1 lg:gap-6">
            <KindMark kind={reportType} />
            <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
              <h1 className="max-w-[14ch] text-title text-foreground">{k.title}</h1>
              <p className="max-w-[46ch] text-lead text-foreground/85">{k.intro}</p>
            </div>
          </header>

          <form
            onSubmit={handleSubmit}
            aria-busy={isSubmitting}
            aria-label={k.formLabel}
            className="min-w-0 rounded-[1.75rem] bg-card p-5 motion-safe:animate-rise motion-safe:[animation-delay:80ms] sm:p-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:p-10"
            noValidate
          >
            <p className="text-small text-muted-foreground">{t.required}</p>

            <div className="mt-6 flex flex-col gap-7">
              <Field
                name="itemName"
                label={t.itemNameLabel}
                hint={t.itemNameHint}
                error={errors.itemName}
              >
                <input
                  ref={(node) => {
                    fieldRefs.current.itemName = node;
                  }}
                  id="itemName"
                  name="itemName"
                  type="text"
                  dir={fields.itemName ? "auto" : undefined}
                  value={fields.itemName}
                  onChange={(event) => updateField("itemName", event.target.value)}
                  placeholder={k.itemNamePlaceholder}
                  disabled={isSubmitting}
                  autoComplete="off"
                  enterKeyHint="next"
                  className={fieldClassName}
                  aria-invalid={Boolean(errors.itemName)}
                  aria-describedby={describedBy("itemName", errors.itemName)}
                />
              </Field>

              <Field
                name="description"
                label={k.descriptionLabel}
                hint={k.descriptionHint}
                error={errors.description}
              >
                <textarea
                  ref={(node) => {
                    fieldRefs.current.description = node;
                  }}
                  id="description"
                  name="description"
                  dir={fields.description ? "auto" : undefined}
                  rows={5}
                  value={fields.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder={k.descriptionPlaceholder}
                  disabled={isSubmitting}
                  className={`${textareaClassName} min-h-36`}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={describedBy("description", errors.description, "description-count")}
                />
                <p
                  id="description-count"
                  data-numeric
                  className={`-mt-1 text-end text-caption ${
                    overLimit > 0 ? "font-semibold text-destructive" : "text-muted-foreground"
                  }`}
                >
                  <span className="sr-only">{t.counterLabel}: </span>
                  <span dir={overLimit > 0 ? undefined : "ltr"}>{counterText}</span>
                </p>
              </Field>

              <Field
                name="location"
                label={k.locationLabel}
                hint={k.locationHint}
                error={errors.location}
              >
                <input
                  ref={(node) => {
                    fieldRefs.current.location = node;
                  }}
                  id="location"
                  name="location"
                  type="text"
                  dir={fields.location ? "auto" : undefined}
                  value={fields.location}
                  onChange={(event) => updateField("location", event.target.value)}
                  placeholder={k.locationPlaceholder}
                  disabled={isSubmitting}
                  autoComplete="off"
                  enterKeyHint="done"
                  className={fieldClassName}
                  aria-invalid={Boolean(errors.location)}
                  aria-describedby={describedBy("location", errors.location)}
                />
              </Field>
            </div>

            <span aria-hidden className="perforation my-8 block text-foreground/20" />

            {formError ? (
              <Notice tone="error" role="alert" className="mb-6">
                <p>{formError}</p>
                {canRetrySubmit ? (
                  <button
                    type="button"
                    onClick={() => void submit()}
                    className={`${secondaryButtonClassName} mt-3`}
                  >
                    {t.retry}
                  </button>
                ) : null}
              </Notice>
            ) : null}

            <div className="flex flex-col gap-5">
              <p className="flex items-start gap-2.5 text-small text-foreground/80">
                <LockIcon className="mt-1 size-4 shrink-0 text-forest" />
                <span>{lost ? t.privacy : t.privacyFound}</span>
              </p>
              <button
                type="submit"
                aria-disabled={isSubmitting}
                className={`${primaryButtonLargeClassName} ${
                  isSubmitting ? "cursor-progress opacity-80" : ""
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Spinner />
                    {k.saving}
                  </>
                ) : (
                  k.submit
                )}
              </button>
            </div>
          </form>

          {lost ? (
            <aside
              aria-labelledby="guide-title"
              className="edge-torn min-w-0 bg-secondary px-5 pt-7 motion-safe:animate-rise motion-safe:[animation-delay:160ms] sm:px-8 sm:pt-8 lg:col-start-1 lg:row-start-2"
            >
              <h2 id="guide-title" className="text-heading text-foreground">
                {k.guideTitle}
              </h2>
              <ul className="mt-4 flex flex-col gap-3">
                {k.guide.map((line) => (
                  <li key={line} className="flex gap-3 text-body text-foreground">
                    <KeyholeGlyph className="mt-1.5 size-4 shrink-0 text-forest" />
                    <span className="min-w-0 break-words">{line}</span>
                  </li>
                ))}
              </ul>
              <h3 className="mt-7 text-subheading text-foreground">{k.afterTitle}</h3>
              <p className="mt-1.5 max-w-[48ch] text-body text-foreground/85">{k.after}</p>
            </aside>
          ) : (
            <aside
              aria-labelledby="guide-title"
              className="relative isolate min-w-0 px-6 py-8 ps-9 text-paper motion-safe:animate-rise motion-safe:[animation-delay:160ms] sm:px-9 sm:ps-12 lg:col-start-1 lg:row-start-2"
            >
              <span aria-hidden className="shape-tag absolute inset-0 -z-10 bg-pine-deep" />
              <h2 id="guide-title" className="text-heading text-paper">
                {k.guideTitle}
              </h2>
              <ul className="mt-4 flex flex-col gap-3">
                {k.guide.map((line) => (
                  <li key={line} className="flex gap-3 text-body text-paper">
                    <KeyholeGlyph className="mt-1.5 size-4 shrink-0 text-brass-light" />
                    <span className="min-w-0 break-words">{line}</span>
                  </li>
                ))}
              </ul>
              <h3 className="mt-7 text-subheading text-paper">{k.afterTitle}</h3>
              <p className="mt-1.5 max-w-[48ch] text-body text-paper/80">{k.after}</p>
            </aside>
          )}
        </div>
      )}
    </PageShell>
  );
}
