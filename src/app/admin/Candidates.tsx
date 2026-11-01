"use client";

import { useState, useTransition } from "react";
import { createCandidate, reviewCandidate } from "@/app/admin/actions";
import {
  Notice,
  Spinner,
  fieldClassName,
  primaryButtonClassName,
  rejectButtonClassName,
  textareaClassName,
} from "@/components/ui";
import { CANDIDATE_NOTE_MAX, STAFF_CANDIDATE_MODEL, type CandidateListItem } from "@/utils/matching/candidates";

function ErrorMessage({ message }: { message: string | null }) {
  return message ? (
    <Notice tone="error" role="alert">
      {message}
    </Notice>
  ) : null;
}

function DetailList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <div className="rounded-2xl bg-card p-4">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportColumn({ label, report }: { label: string; report: CandidateListItem["lost"] }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-card p-4">
      <p className="text-[0.8125rem] font-semibold text-muted-foreground">{label}</p>
      <h3 className="font-serif text-xl font-semibold leading-snug text-foreground">{report.item_name}</h3>
      <p className="text-sm leading-relaxed text-foreground">{report.description}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">Location: {report.location}</p>
    </div>
  );
}

function CandidateActions({ item }: { item: CandidateListItem }) {
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const noteId = `candidate-note-${item.id}`;

  function submit(action: "ownership_review" | "dismissed") {
    setError(null);
    startTransition(async () => {
      try {
        const result = await reviewCandidate(item.lostReportId, item.foundReportId, action, note);
        if (!result.ok) {
          setError(result.message);
        }
      } catch {
        setError("The review could not be saved. Please try again.");
      }
    });
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div className="flex flex-col gap-2">
        <label htmlFor={noteId} className="text-sm font-medium text-foreground">
          Note <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id={noteId}
          value={note}
          maxLength={CANDIDATE_NOTE_MAX}
          onChange={(event) => setNote(event.target.value)}
          placeholder="What should the next staff member know?"
          className={textareaClassName}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className={primaryButtonClassName}
          disabled={isPending}
          onClick={() => submit("ownership_review")}
        >
          {isPending ? <Spinner /> : null}
          Worth ownership review
        </button>
        <button
          type="button"
          className={rejectButtonClassName}
          disabled={isPending}
          onClick={() => submit("dismissed")}
        >
          Not the same item
        </button>
      </div>
      <ErrorMessage message={error} />
    </form>
  );
}

function CandidateCard({ item }: { item: CandidateListItem }) {
  const staffAdded = item.model === STAFF_CANDIDATE_MODEL;
  const marked = item.review?.action === "ownership_review";

  return (
    <li className="flex flex-col gap-4 rounded-[1.5rem] bg-secondary/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="font-serif text-2xl font-semibold leading-tight text-foreground">
            {item.lost.item_name}
            <span className="mx-2 font-sans text-base font-medium text-muted-foreground">and</span>
            {item.found.item_name}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {staffAdded ? "Added by staff" : item.score === null ? "Not scored" : `AI similarity ${item.score}/100`}
            {staffAdded ? null : ". A low score can still be a candidate."}
          </p>
        </div>
      </div>

      <p className="rounded-2xl bg-background px-4 py-3 text-sm leading-relaxed text-foreground">
        Possible candidate, not a confirmed match. Staff still decide. This does not verify ownership or approve a handover.
      </p>
      {marked ? (
        <p className="text-sm leading-relaxed text-foreground">
          Marked for ownership review. Ownership questions and any handover stay on their own steps.
          {item.review?.note ? ` Note: ${item.review.note}` : null}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <ReportColumn label="Lost" report={item.lost} />
        <ReportColumn label="Found (private)" report={item.found} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <DetailList title="Overlap" items={item.comparison.overlap} emptyText="No shared clue recorded." />
        <DetailList title="Differences" items={item.comparison.differences} emptyText="No difference recorded." />
        <DetailList title="Unknown" items={item.comparison.unknown} emptyText="Nothing left unknown in the saved result." />
      </div>

      <p className="text-sm leading-relaxed text-foreground">
        <span className="font-medium">{staffAdded ? "Staff note: " : "Saved result: "}</span>
        {item.explanation}
      </p>

      {item.review?.action === "dismissed" ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Dismissed as not the same item.{item.review.note ? ` Note: ${item.review.note}` : null} A later review stays in the log.
        </p>
      ) : null}

      <CandidateActions item={item} />
    </li>
  );
}

function AddCandidateForm({
  lostReports,
  foundReports,
}: {
  lostReports: { id: string; item_name: string }[];
  foundReports: { id: string; item_name: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [lostId, setLostId] = useState("");
  const [foundId, setFoundId] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const ready = lostReports.length > 0 && foundReports.length > 0;

  function submit() {
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
      } catch {
        setError("The candidate could not be saved. Please try again.");
      }
    });
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-[1.5rem] bg-secondary/70 p-4 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) {
          submit();
        }
      }}
    >
      <div>
        <h2 className="font-serif text-[1.75rem] font-semibold leading-tight text-foreground">Add a candidate</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Choose a lost report and a found report yourself when the AI did not surface the pair. This still does not confirm a match.
        </p>
      </div>
      {ready ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="candidate-lost" className="text-sm font-medium text-foreground">
                Lost report
              </label>
              <select
                id="candidate-lost"
                value={lostId}
                onChange={(event) => setLostId(event.target.value)}
                className={fieldClassName}
                required
              >
                <option value="">Choose a lost report</option>
                {lostReports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.item_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="candidate-found" className="text-sm font-medium text-foreground">
                Found report
              </label>
              <select
                id="candidate-found"
                value={foundId}
                onChange={(event) => setFoundId(event.target.value)}
                className={fieldClassName}
                required
              >
                <option value="">Choose a found report</option>
                {foundReports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.item_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="new-candidate-note" className="text-sm font-medium text-foreground">
              Note <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="new-candidate-note"
              value={note}
              maxLength={CANDIDATE_NOTE_MAX}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Why is this pair worth checking?"
              className={textareaClassName}
            />
          </div>
          <button type="submit" className={primaryButtonClassName} disabled={isPending}>
            {isPending ? <Spinner /> : null}
            Add candidate
          </button>
        </>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          A manual candidate needs at least one lost report and one found report.
        </p>
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
  return (
    <div id="candidates" className="flex scroll-mt-6 flex-col gap-4">
      {reviewsState === "not_set_up" ? (
        <Notice tone="info">
          The candidate list is ready. Marking or dismissing a pair needs the report_candidate_reviews migration applied locally.
        </Notice>
      ) : null}
      {reviewsState === "error" ? (
        <Notice tone="error" role="alert">
          Could not load earlier candidate reviews. Please try again.
        </Notice>
      ) : null}

      <AddCandidateForm lostReports={lostReports} foundReports={foundReports} />

      <section aria-labelledby="open-candidates-heading" className="flex flex-col gap-3">
        <h2 id="open-candidates-heading" className="font-serif text-[1.75rem] font-semibold leading-tight text-foreground">
          To review{" "}
          <span className="font-sans text-lg font-medium tabular-nums text-muted-foreground">{open.length}</span>
        </h2>
        {open.length === 0 ? (
          <p className="rounded-[1.5rem] border border-dashed border-foreground/20 px-5 py-8 text-[0.9375rem] leading-relaxed text-foreground/70">
            No potential candidates to review. A pair appears here when the saved result says there is not enough information, the item types match, and the reports share a real clue.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {open.map((item) => (
              <CandidateCard key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>

      {dismissed.length > 0 ? (
        <details className="rounded-[1.5rem] bg-secondary/70 px-4 py-1.5 sm:px-5">
          <summary className="-ml-2 inline-flex min-h-11 w-fit max-w-full cursor-pointer list-none items-center gap-1.5 rounded-full px-2 text-left text-[0.9375rem] font-semibold text-foreground outline-none [&::-webkit-details-marker]:hidden">
            Dismissed ({dismissed.length})
          </summary>
          <ul className="mb-4 mt-3 flex flex-col gap-3">
            {dismissed.map((item) => (
              <CandidateCard key={item.id} item={item} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
