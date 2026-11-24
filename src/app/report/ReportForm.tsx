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
import { rememberJustSaved, trackingHref } from "@/app/report/tracking";
import { useMatchingProgress } from "@/app/report/useMatchingProgress";
import { FillChip } from "@/app/report/form/FillChips";
import { FormStage } from "@/app/report/form/FormStage";
import "@/app/report/form/form-stage.css";
import { ClockIcon, KeyholeGlyph, LensIcon, LockIcon, TagIcon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import {
  FieldError,
  Notice,
  ReportKindCue,
  Spinner,
  fieldClassName,
  frameClassName,
  hintClassName,
  labelClassName,
  primaryButtonLargeClassName,
  secondaryButtonClassName,
  textareaClassName,
} from "@/components/ui";
import { formatNumber } from "@/i18n/format";
import { useLocale, useMessages } from "@/i18n/LocaleProvider";
import { common } from "@/i18n/messages/common";
import { report } from "@/i18n/messages/report";

/*
  The two reporting forms, as the next scene of the homepage: the pine stage
  continues behind the question, and the form sheet sits on the desk beside
  it. One component, two kinds: what differs is the question, the examples
  and the shape of the sheet. Lost is a slip torn from the desk's pad (the
  report you leave); found is a tag hanging from its eyelet (the tag tied to
  the item). The difference is carried by the words, the mark and the shape,
  never by colour alone.
*/

function storageKey(reportType: ReportType) {
  return `amanah:submission:${reportType}`;
}

const EMPTY: ReportFields = { itemName: "", description: "", location: "" };
const FIELD_ORDER: ReportFieldName[] = ["itemName", "description", "location"];
// The description counter shows once this many characters are typed.
const COUNTER_FROM = DESCRIPTION_MAX - 300;

// Fields take the page direction while empty and follow their text after
// (dir="auto"); the hint, the example and any error are read with the field.
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
  after,
  children,
}: {
  name: ReportFieldName;
  label: string;
  hint: string;
  error?: string;
  // Under the field: the example chip that fills it.
  after?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={name} className={labelClassName}>
        {label}
      </label>
      <div id={`${name}-hint`} className="contents">
        <p className={hintClassName}>{hint}</p>
        {children}
      </div>
      {after}
      {error ? (
        <FieldError id={`${name}-error`}>
          <span className="break-words">{error}</span>
        </FieldError>
      ) : null}
    </div>
  );
}

export default function ReportForm({
  reportType,
  sandbox = false,
}: {
  reportType: ReportType;
  // The public test version: a quiet note that the report is deleted after a few days.
  sandbox?: boolean;
}) {
  const t = useMessages(report);
  const c = useMessages(common);
  const k = t.kinds[reportType];
  // One example set per visit. The server and the first paint show the first
  // set, then the browser picks one at random; every chip is a single line,
  // so the swap never moves the form.
  const [exampleIndex, setExampleIndex] = useState(0);
  const example = k.examples[exampleIndex] ?? k.examples[0];
  const { locale } = useLocale();
  const validationMessages = { ...t, locationRequired: k.locationRequired };

  const [fields, setFields] = useState<ReportFields>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [canRetrySubmit, setCanRetrySubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // The field a chip just wrote into, for one short animation.
  const [justFilled, setJustFilled] = useState<ReportFieldName | null>(null);
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
    const timer = setTimeout(() => setExampleIndex(Math.floor(Math.random() * k.examples.length)), 0);
    return () => clearTimeout(timer);
  }, [k.examples.length]);

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

  function fill(name: ReportFieldName, text: string) {
    updateField(name, text);
    setJustFilled(null);
    requestAnimationFrame(() => setJustFilled(name));
    const input = fieldRefs.current[name];
    if (input) {
      input.focus();
      requestAnimationFrame(() => input.setSelectionRange(text.length, text.length));
    }
  }

  function chipFor(name: ReportFieldName, label: string, text: string) {
    return (
      <FillChip
        id={`${name}-fill`}
        label={t.fillLabel}
        groupLabel={t.fillGroupLabel(label)}
        text={text}
        value={fields[name]}
        disabled={isSubmitting}
        onFill={(value) => fill(name, value)}
      />
    );
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
        rememberJustSaved(result.credential);
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
  // The counter appears only once the limit is close, so it is a warning and
  // not a running tally beside every description.
  const showCounter = descriptionLength >= COUNTER_FROM;
  const counterText =
    overLimit > 0
      ? t.overLimit(formatNumber(overLimit, locale))
      : t.counter(formatNumber(descriptionLength, locale), formatNumber(DESCRIPTION_MAX, locale));

  const lost = reportType === "lost";

  return (
    <>
      <SiteHeader tone="pine" />
      <main id="main" className="flex-1">
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
                <Notice>
                  <span className="font-normal">{t.noTrackingLink}</span>
                </Notice>
              )}
            </LostConfirmation>
          )
        ) : (
          /*
            One grid. Row one is the pine band (its background is a grid item
            that bleeds to the viewport edges); the sheet spans both rows from
            lg, so its top sits against the band like a sheet on the counter.
            Phones read the question, the sheet, then what happens after.
          */
          <section className="relative isolate overflow-x-clip pb-20 sm:pb-28">
            <div
              className={`${frameClassName} grid gap-x-12 gap-y-0 pt-3 sm:pt-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:pt-8`}
            >
              <span
                aria-hidden
                className="form-band-bg pointer-events-none relative -z-10 col-span-full row-start-1 -mt-3 self-stretch sm:-mt-5 lg:-mt-8"
              />
              <FormStage
                kind={reportType}
                title={k.title}
                intro={k.intro}
                artAlt={k.artAlt}
                backLabel={c.backHome}
              />

              {/*
                The form sheet. Its shape is a layer behind the fields: a slip
                torn along its bottom for lost, a hanging tag with a punched
                eyelet for found. Focus rings are never clipped.
              */}
              <form
                onSubmit={handleSubmit}
                aria-busy={isSubmitting}
                aria-label={k.formLabel}
                noValidate
                className={`form-sheet relative isolate -mt-7 min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-12 ${
                  lost ? "pb-9" : "pt-7"
                }`}
              >
                {lost ? (
                  <span aria-hidden className="edge-torn absolute inset-0 -z-10 bg-card" />
                ) : (
                  <>
                    <span aria-hidden className="form-tag absolute inset-0 -z-10 bg-card" />
                    <span
                      aria-hidden
                      className="eyelet absolute left-1/2 top-[1.75rem] size-6 -translate-x-1/2 -translate-y-1/2"
                    />
                  </>
                )}

                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 pt-5 sm:px-8 sm:pt-6 lg:px-10">
                  <ReportKindCue kind={reportType}>{k.kind}</ReportKindCue>
                  <p className="text-small text-muted-foreground">{t.required}</p>
                </div>
                <span aria-hidden className="perforation mx-5 mt-3 block text-foreground/20 sm:mx-8 lg:mx-10" />

                <div className="flex flex-col gap-6 px-5 pb-6 pt-5 sm:px-8 sm:pb-8 lg:px-10">
                  <Field
                    name="itemName"
                    label={t.itemNameLabel}
                    hint={t.itemNameHint}
                    error={errors.itemName}
                    after={chipFor("itemName", t.itemNameLabel, example.itemName)}
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
                      onAnimationEnd={() => setJustFilled(null)}
                      disabled={isSubmitting}
                      autoComplete="off"
                      enterKeyHint="next"
                      className={`${fieldClassName} ${justFilled === "itemName" ? "form-filled" : ""}`}
                      aria-invalid={Boolean(errors.itemName)}
                      aria-describedby={describedBy("itemName", errors.itemName)}
                    />
                  </Field>

                  <Field
                    name="description"
                    label={k.descriptionLabel}
                    hint={k.descriptionHint}
                    error={errors.description}
                    after={chipFor("description", k.descriptionLabel, example.description)}
                  >
                    <textarea
                      ref={(node) => {
                        fieldRefs.current.description = node;
                      }}
                      id="description"
                      name="description"
                      dir={fields.description ? "auto" : undefined}
                      rows={4}
                      value={fields.description}
                      onChange={(event) => updateField("description", event.target.value)}
                      onAnimationEnd={() => setJustFilled(null)}
                      disabled={isSubmitting}
                      className={`${textareaClassName} min-h-32 ${justFilled === "description" ? "form-filled" : ""}`}
                      aria-invalid={Boolean(errors.description)}
                      aria-describedby={describedBy(
                        "description",
                        errors.description,
                        showCounter ? "description-count" : undefined,
                      )}
                    />
                    {showCounter ? (
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
                    ) : null}
                  </Field>

                  <Field
                    name="location"
                    label={k.locationLabel}
                    hint={k.locationHint}
                    error={errors.location}
                    after={chipFor("location", k.locationLabel, example.location)}
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
                      onAnimationEnd={() => setJustFilled(null)}
                      disabled={isSubmitting}
                      autoComplete="off"
                      enterKeyHint="done"
                      className={`${fieldClassName} ${justFilled === "location" ? "form-filled" : ""}`}
                      aria-invalid={Boolean(errors.location)}
                      aria-describedby={describedBy("location", errors.location)}
                    />
                  </Field>

                  <span aria-hidden className="perforation block text-foreground/20" />

                  {formError ? (
                    <Notice tone="error" role="alert">
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

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
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
                          <>
                            {lost ? (
                              <LensIcon className="size-5 shrink-0" />
                            ) : (
                              <TagIcon className="size-5 shrink-0" />
                            )}
                            {k.submit}
                          </>
                        )}
                      </button>
                      {/* Visible while saving; the sr-only status line above announces it. */}
                      {isSubmitting ? (
                        <p aria-hidden className="text-small text-muted-foreground">
                          {t.savingStatus}
                        </p>
                      ) : null}
                    </div>
                    <p className="flex items-start gap-2.5 text-small text-foreground/80">
                      <LockIcon className="mt-1 size-4 shrink-0 text-forest" />
                      <span>{lost ? t.privacy : t.privacyFound}</span>
                    </p>
                    {sandbox ? (
                      <p className="-mt-1 flex items-start gap-2.5 text-small text-foreground/80">
                        <ClockIcon className="mt-1 size-4 shrink-0 text-forest" />
                        <span>{t.sandboxNote}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </form>

              {/*
                What happens after you save: three short lines, under the desk
                on wide screens and right after the save button on phones.
                Lost reads as a sequence, so it is an ordered list.
              */}
              <aside
                aria-labelledby="after-title"
                className="min-w-0 pt-8 motion-safe:animate-rise motion-safe:[animation-delay:220ms] lg:col-start-1 lg:row-start-2 lg:pt-32"
              >
                <h2 id="after-title" className="text-subheading text-foreground">
                  {k.afterTitle}
                </h2>
                {lost ? (
                  <ol className="mt-3 flex flex-col gap-2.5">
                    {k.afterSteps.map((line) => (
                      <li key={line} className="flex gap-3 text-body text-foreground/90">
                        <span
                          aria-hidden
                          className="mt-[0.55em] size-3 shrink-0 rounded-full border-2 border-dashed border-pine/70"
                        />
                        <span className="min-w-0 break-words">{line}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {k.afterSteps.map((line) => (
                      <li key={line} className="flex gap-3 text-body text-foreground/90">
                        <KeyholeGlyph className="mt-[0.45em] size-4 shrink-0 text-forest" />
                        <span className="min-w-0 break-words">{line}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
