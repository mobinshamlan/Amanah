"use client";

import { useId, useRef, useState, useTransition, type ReactNode, type RefObject } from "react";
import { createCandidate, reviewCandidate } from "@/app/admin/actions";
import {
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
  QuestionIcon,
  XIcon,
} from "@/components/icons";
import {
  FieldError,
  Notice,
  ReportKindCue,
  Spinner,
  StatusChip,
  focusRingClassName,
  hintClassName,
  labelClassName,
  primaryButtonClassName,
  quietButtonClassName,
  rejectButtonClassName,
  secondaryButtonClassName,
  selectClassName,
  textareaClassName,
} from "@/components/ui";
import { useLocale, useMessages } from "@/i18n/LocaleProvider";
import { localizeClue } from "@/i18n/messages/clues";
import { adminTools } from "@/i18n/messages/admin-tools";
import {
  CANDIDATE_NOTE_MAX,
  STAFF_CANDIDATE_MODEL,
  type CandidateListItem,
} from "@/utils/matching/candidates";

// Potential candidates: pairs the AI could not decide on. Staff compare the two
// reports side by side and save a note for the next person. Nothing here
// reaches the owner: a review is a staff log entry, and a manually added pair
// is stored as "not enough information", never as a possible match.

const summaryClassName = `-ms-2 inline-flex min-h-11 w-fit max-w-full cursor-pointer list-none items-center gap-1.5 rounded-full px-2 text-small font-semibold text-foreground [&::-webkit-details-marker]:hidden ${focusRingClassName}`;

function ErrorMessage({ message }: { message: string | null }) {
  return message ? (
    <Notice tone="error" role="alert">
      {message}
    </Notice>
  ) : null;
}

/** One side of the pair. Lost and found differ by cue shape and icon, not colour. */
function ReportColumn({
  kind,
  report,
}: {
  kind: "lost" | "found";
  report: CandidateListItem["lost"];
}) {
  const t = useMessages(adminTools).shared;
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl bg-card p-4">
      <ReportKindCue kind={kind} className="w-fit">
        {kind === "lost" ? t.lost : t.foundPrivate}
      </ReportKindCue>
      <h4 dir="auto" className="text-subheading break-words text-start text-foreground">
        {report.item_name}
      </h4>
      <p dir="auto" className="text-body break-words text-start text-foreground">
        {report.description}
      </p>
      <p className="text-small break-words text-muted-foreground">{t.location(report.location)}</p>
    </div>
  );
}

/** Shared clues, differences, or one-sided details, each with its own glyph. */
function ClueList({
  title,
  items,
  emptyText,
  icon,
}: {
  title: string;
  items: string[];
  emptyText: string;
  icon: ReactNode;
}) {
  const { locale } = useLocale();
  return (
    <div className="min-w-0">
      <h5 className="text-small font-semibold text-foreground">{title}</h5>
      {items.length === 0 ? (
        <p className="mt-1 text-small text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-small text-foreground">
              <span aria-hidden className="mt-1 shrink-0">
                {icon}
              </span>
              <bdi className="min-w-0 break-words">{localizeClue(item, locale)}</bdi>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CandidateActions({
  item,
  onDismissed,
}: {
  item: CandidateListItem;
  onDismissed: (message: string) => void;
}) {
  const t = useMessages(adminTools);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const noteId = `candidate-note-${item.id}`;
  const helpId = `candidate-help-${item.id}`;

  function submit(action: "ownership_review" | "dismissed") {
    setError(null);
    setStatus("");
    startTransition(async () => {
      try {
        const result = await reviewCandidate(item.lostReportId, item.foundReportId, action, note);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setNote("");
        if (action === "dismissed") {
          // The pair moves to the dismissed list, so the panel announces it.
          onDismissed(t.candidates.savedDismissed);
          return;
        }
        setStatus(t.candidates.savedWorth);
      } catch {
        setError(t.candidates.saveFailed);
      }
    });
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl bg-card p-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <fieldset className="flex min-w-0 flex-col gap-3" disabled={isPending} aria-describedby={helpId}>
        <legend className="text-subheading text-foreground">{t.candidates.actionsLegend}</legend>
        <p id={helpId} className="text-small text-foreground">
          {t.candidates.actionsHelp}
        </p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={noteId} className={labelClassName}>
            {t.candidates.noteLabel}{" "}
            <span className="font-normal text-muted-foreground">({t.shared.optional})</span>
          </label>
          <textarea
            id={noteId}
            value={note}
            rows={2}
            maxLength={CANDIDATE_NOTE_MAX}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t.candidates.notePlaceholder}
            className={`${textareaClassName} min-h-20`}
          />
          <p className={`${hintClassName} tabular-nums`}>{t.shared.characters(note.length, CANDIDATE_NOTE_MAX)}</p>
        </div>
        <div className="flex flex-col gap-2 @md:flex-row @md:flex-wrap">
          <button
            type="button"
            className={primaryButtonClassName}
            onClick={() => submit("ownership_review")}
          >
            {isPending ? <Spinner /> : <CheckIcon className="size-4" />}
            {t.candidates.worth}
          </button>
          <button type="button" className={rejectButtonClassName} onClick={() => submit("dismissed")}>
            <XIcon className="size-4" />
            {t.candidates.dismiss}
          </button>
        </div>
      </fieldset>
      <p role="status" className={`text-small font-medium text-ok-ink ${status ? "" : "sr-only"}`}>
        {status}
      </p>
      <ErrorMessage message={error} />
      <details className="group/how">
        <summary className={summaryClassName}>
          <QuestionIcon className="size-4 shrink-0 text-forest" />
          {t.candidates.howTitle}
          <ChevronDownIcon className="size-4 transition-transform group-open/how:rotate-180" />
        </summary>
        <p className="mt-1 max-w-[62ch] text-small text-foreground">{t.candidates.howVerificationStarts}</p>
      </details>
    </form>
  );
}

function CandidateCard({
  item,
  onDismissed,
  defaultOpen = false,
}: {
  item: CandidateListItem;
  onDismissed: (message: string) => void;
  // The first pair nobody has reviewed opens its comparison.
  defaultOpen?: boolean;
}) {
  const t = useMessages(adminTools).candidates;
  const { locale } = useLocale();
  const staffAdded = item.model === STAFF_CANDIDATE_MODEL;
  const review = item.review;

  const shared = useMessages(adminTools).shared;
  const firstDifference = item.comparison.differences[0];

  return (
    <li className="@container flex min-w-0 flex-col gap-2.5 rounded-[1.25rem] bg-background p-4 sm:px-5">
      <h3 className="flex min-w-0 flex-col gap-1.5 text-body font-semibold leading-snug text-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
        <span className="flex min-w-0 items-center gap-2">
          <ReportKindCue kind="lost" className="shrink-0">
            {shared.lost}
          </ReportKindCue>
          <bdi dir="auto" className="min-w-0 break-words">
            {item.lost.item_name}
          </bdi>
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <ReportKindCue kind="found" className="shrink-0">
            {shared.foundPrivate}
          </ReportKindCue>
          <bdi dir="auto" className="min-w-0 break-words">
            {item.found.item_name}
          </bdi>
        </span>
      </h3>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {review ? (
          <StatusChip
            tone={review.action === "ownership_review" ? "info" : "neutral"}
            icon={
              review.action === "ownership_review" ? (
                <CheckIcon className="size-3.5" />
              ) : (
                <XIcon className="size-3.5" />
              )
            }
          >
            {review.action === "ownership_review" ? t.reviewedWorth : t.reviewedDismissed}
          </StatusChip>
        ) : (
          <StatusChip tone="wait">{t.notReviewed}</StatusChip>
        )}
        <span className="text-caption tabular-nums text-muted-foreground">
          {staffAdded ? t.staffAdded : item.score === null ? t.notScored : t.score(item.score)}
        </span>
      </div>
      {firstDifference ? (
        <p className="flex items-start gap-2 text-small text-foreground">
          <XIcon className="mt-1 size-4 shrink-0 text-destructive" />
          <span className="min-w-0">
            <span className="font-semibold">{t.differences}: </span>
            <bdi className="break-words">{localizeClue(firstDifference, locale)}</bdi>
            {item.comparison.differences.length > 1 ? (
              <span className="text-muted-foreground"> {t.moreDifferences(item.comparison.differences.length - 1)}</span>
            ) : null}
          </span>
        </p>
      ) : null}

      <details className="group/review" open={defaultOpen || undefined}>
        <summary className={summaryClassName}>
          {t.reviewPair}
          <ChevronDownIcon className="size-4 transition-transform group-open/review:rotate-180" />
        </summary>
        <div className="mt-2 flex min-w-0 flex-col gap-4">
          <p className="text-small text-foreground/85">{t.whatThisIs}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <ReportColumn kind="lost" report={item.lost} />
            <ReportColumn kind="found" report={item.found} />
          </div>

          <div className="grid gap-4 rounded-2xl bg-card p-4 lg:grid-cols-3">
            <ClueList
              title={t.sharedClues}
              items={item.comparison.overlap}
              emptyText={t.noShared}
              icon={<CheckIcon className="size-4 text-forest" />}
            />
            <ClueList
              title={t.differences}
              items={item.comparison.differences}
              emptyText={t.noDifferences}
              icon={<XIcon className="size-4 text-destructive" />}
            />
            <ClueList
              title={t.unknown}
              items={item.comparison.unknown}
              emptyText={t.noUnknown}
              icon={<QuestionIcon className="size-4 text-muted-foreground" />}
            />
          </div>

          <p className="text-small break-words text-foreground">
            <span className="font-semibold">{staffAdded ? t.staffNote : t.savedResult}: </span>
            <bdi dir="auto">{item.explanation}</bdi>
          </p>

          {review?.note ? (
            <p className="text-small break-words text-foreground">
              {t.reviewNote(review.note)} <span className="text-muted-foreground">{t.reviewLogged}</span>
            </p>
          ) : null}

          <CandidateActions item={item} onDismissed={onDismissed} />
        </div>
      </details>
    </li>
  );
}

function AddCandidateForm({
  id,
  lostReports,
  foundReports,
  headingRef,
  onSaved,
  onClose,
}: {
  id: string;
  lostReports: { id: string; item_name: string }[];
  foundReports: { id: string; item_name: string }[];
  headingRef: RefObject<HTMLHeadingElement | null>;
  onSaved: (message: string) => void;
  onClose: () => void;
}) {
  const t = useMessages(adminTools);
  const ids = useId();
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [lostId, setLostId] = useState("");
  const [foundId, setFoundId] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const ready = lostReports.length > 0 && foundReports.length > 0;

  function submit() {
    if (!lostId || !foundId) {
      setFieldError(t.candidates.addPickBoth);
      return;
    }
    setFieldError(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await createCandidate(lostId, foundId, note);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setLostId("");
        setFoundId("");
        setNote("");
        onSaved(t.candidates.addSaved);
      } catch {
        setError(t.candidates.addFailed);
      }
    });
  }

  return (
    <form
      id={id}
      className="@container flex flex-col gap-4 rounded-[1.5rem] bg-background p-4 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) {
          submit();
        }
      }}
    >
      <div className="flex flex-col gap-1">
        <h3 ref={headingRef} tabIndex={-1} className="text-subheading text-foreground outline-none">
          {t.candidates.addTitle}
        </h3>
        <p className="max-w-[62ch] text-small text-foreground">{t.candidates.addIntro}</p>
      </div>
      {ready ? (
        <fieldset className="flex min-w-0 flex-col gap-4" disabled={isPending}>
          <legend className="sr-only">{t.candidates.addTitle}</legend>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${ids}-lost`} className={labelClassName}>
                {t.candidates.addLost}
              </label>
              <select
                id={`${ids}-lost`}
                value={lostId}
                onChange={(event) => setLostId(event.target.value)}
                className={selectClassName}
                aria-invalid={Boolean(fieldError && !lostId)}
                aria-describedby={fieldError ? `${ids}-pick-error` : undefined}
              >
                <option value="">{t.candidates.chooseLost}</option>
                {lostReports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.item_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${ids}-found`} className={labelClassName}>
                {t.candidates.addFound}
              </label>
              <select
                id={`${ids}-found`}
                value={foundId}
                onChange={(event) => setFoundId(event.target.value)}
                className={selectClassName}
                aria-invalid={Boolean(fieldError && !foundId)}
                aria-describedby={fieldError ? `${ids}-pick-error` : undefined}
              >
                <option value="">{t.candidates.chooseFound}</option>
                {foundReports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.item_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {fieldError ? (
            <FieldError id={`${ids}-pick-error`} role="alert">
              {fieldError}
            </FieldError>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${ids}-note`} className={labelClassName}>
              {t.candidates.addNote}{" "}
              <span className="font-normal text-muted-foreground">({t.shared.optional})</span>
            </label>
            <textarea
              id={`${ids}-note`}
              value={note}
              rows={2}
              maxLength={CANDIDATE_NOTE_MAX}
              onChange={(event) => setNote(event.target.value)}
              className={`${textareaClassName} min-h-20`}
            />
            <p className={`${hintClassName} tabular-nums`}>{t.shared.characters(note.length, CANDIDATE_NOTE_MAX)}</p>
          </div>
          <div className="flex flex-col gap-2 @md:flex-row @md:flex-wrap">
            <button type="submit" className={primaryButtonClassName}>
              {isPending ? <Spinner /> : <PlusIcon className="size-4" />}
              {t.candidates.addSubmit}
            </button>
            <button type="button" className={quietButtonClassName} onClick={onClose}>
              {t.shared.cancel}
            </button>
          </div>
        </fieldset>
      ) : (
        <>
          <p className="text-small text-foreground">{t.candidates.addNeeds}</p>
          <button type="button" className={`${quietButtonClassName} self-start`} onClick={onClose}>
            {t.candidates.addClose}
          </button>
        </>
      )}
      <ErrorMessage message={error} />
    </form>
  );
}

export function CandidatesPanel({
  open,
  dismissed,
  lostReports,
  foundReports,
  reviewsState,
}: {
  open: CandidateListItem[];
  dismissed: CandidateListItem[];
  lostReports: { id: string; item_name: string }[];
  foundReports: { id: string; item_name: string }[];
  reviewsState: "ok" | "not_set_up" | "error";
}) {
  const t = useMessages(adminTools).candidates;
  const [addOpen, setAddOpen] = useState(false);
  const [panelStatus, setPanelStatus] = useState("");
  const addHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const queueHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const formId = "add-candidate-form";
  // Pairs nobody has reviewed come first; ones marked for ownership review fold away.
  const unreviewed = open.filter((item) => !item.review);
  const reviewed = open.filter((item) => item.review);

  function openForm() {
    setPanelStatus("");
    setAddOpen(true);
    // The form mounts on the next paint; move focus to its heading then.
    requestAnimationFrame(() => addHeadingRef.current?.focus());
  }

  function announceDismissed(message: string) {
    setPanelStatus(message);
    requestAnimationFrame(() => queueHeadingRef.current?.focus());
  }

  function closeForm() {
    setAddOpen(false);
    requestAnimationFrame(() => toggleRef.current?.focus());
  }

  return (
    <div id="candidates" className="flex scroll-mt-6 flex-col gap-5">
      {reviewsState === "not_set_up" ? <Notice tone="warning">{t.notSetUp}</Notice> : null}
      {reviewsState === "error" ? (
        <Notice tone="error" role="alert">
          {t.loadError}
        </Notice>
      ) : null}

      <section aria-labelledby="open-candidates-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2
              ref={queueHeadingRef}
              id="open-candidates-heading"
              tabIndex={-1}
              className="text-subheading tabular-nums text-foreground outline-none"
            >
              {t.queueCount(open.length, open.filter((item) => !item.review).length)}
            </h2>
            <p className="max-w-[62ch] text-small text-foreground/85">{t.queueIntro}</p>
          </div>
          {addOpen ? null : (
            <button
              ref={toggleRef}
              type="button"
              className={secondaryButtonClassName}
              aria-expanded={addOpen}
              aria-controls={formId}
              onClick={openForm}
            >
              <PlusIcon className="size-4" />
              {t.addToggle}
            </button>
          )}
        </div>

        <div role="status">{panelStatus ? <Notice tone="success">{panelStatus}</Notice> : null}</div>
        {addOpen ? (
          <AddCandidateForm
            id={formId}
            lostReports={lostReports}
            foundReports={foundReports}
            headingRef={addHeadingRef}
            onSaved={(message) => {
              setAddOpen(false);
              setPanelStatus(message);
              requestAnimationFrame(() => toggleRef.current?.focus());
            }}
            onClose={closeForm}
          />
        ) : null}

        {open.length === 0 ? (
          <p className="rounded-[1.5rem] border border-dashed border-foreground/25 px-5 py-8 text-small text-foreground">
            {t.empty}
          </p>
        ) : (
          <>
            {unreviewed.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {unreviewed.map((item, index) => (
                  <CandidateCard
                    key={item.id}
                    item={item}
                    onDismissed={announceDismissed}
                    defaultOpen={index === 0}
                  />
                ))}
              </ul>
            ) : null}
            {reviewed.length > 0 ? (
              <details className="group/reviewed rounded-[1.5rem] bg-secondary/70 px-4 py-1.5 sm:px-5">
                <summary className={summaryClassName}>
                  {t.reviewedTitle(reviewed.length)}
                  <ChevronDownIcon className="size-4 transition-transform group-open/reviewed:rotate-180" />
                </summary>
                <ul className="mb-4 mt-3 flex flex-col gap-3">
                  {reviewed.map((item) => (
                    <CandidateCard key={item.id} item={item} onDismissed={announceDismissed} />
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        )}
      </section>

      {dismissed.length > 0 ? (
        <details className="group/dismissed rounded-[1.5rem] bg-background px-4 py-1.5 sm:px-5">
          <summary className={summaryClassName}>
            {t.dismissedTitle(dismissed.length)}
            <ChevronDownIcon className="size-4 transition-transform group-open/dismissed:rotate-180" />
          </summary>
          <ul className="mb-4 mt-3 flex flex-col gap-3">
            {dismissed.map((item) => (
              <CandidateCard key={item.id} item={item} onDismissed={announceDismissed} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
