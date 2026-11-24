import type { ReactNode } from "react";
import { ArrowEndIcon, ChevronDownIcon, LockIcon } from "@/components/icons";
import { Notice, ReportKindCue, StatusChip, focusRingClassName, linkClassName } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { AdminMessages } from "@/i18n/messages/admin";
import { clueSegments } from "@/i18n/messages/clues";
import type { MatchedReport, ReportMatch } from "@/app/admin/parts/model";

// Small server-safe pieces shared by the staff sections: disclosures, queue
// headings, empty states, the lost/found pair and the AI clue columns.

/** An action's error, announced as an alert; nothing when there is none. */
export function ErrorMessage({ message }: { message: string | null }) {
  return message ? (
    <Notice tone="error" role="alert">
      {message}
    </Notice>
  ) : null;
}

/** A row on the work sheet: one tone step down from the card. */
export const rowClassName = "min-w-0 rounded-[1.25rem] bg-background";

/** An inner block inside a row: back up to the card tone. */
export const blockClassName = "flex min-w-0 flex-col gap-1.5 rounded-2xl bg-card p-4";

/** Secondary stamps: dates, models. Caption size, grey, tabular. */
export const stampClassName = "text-caption tabular-nums text-muted-foreground";

/** An inline link in running text, at the 44px target height. */
export const inlineLinkClassName = `${linkClassName} min-h-11`;

export const summaryClassName = `-ms-2 inline-flex min-h-11 w-fit max-w-full cursor-pointer list-none items-center gap-1.5 rounded-full px-2 text-start text-small font-semibold text-foreground transition-colors duration-150 hover:text-forest [&::-webkit-details-marker]:hidden ${focusRingClassName}`;

/**
 * A native disclosure. The chevron turns only when its own details element is
 * open, so nested disclosures never rotate each other's arrows.
 */
export function Disclosure({
  label,
  openLabel,
  defaultOpen = false,
  id,
  className = "",
  children,
}: {
  label: ReactNode;
  // Shown instead of `label` while open ("Hide details").
  openLabel?: ReactNode;
  defaultOpen?: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details id={id} className={className} open={defaultOpen || undefined}>
      <summary className={summaryClassName}>
        {openLabel ? (
          <>
            <span className="[details[open]>summary>&]:hidden">{label}</span>
            <span className="hidden [details[open]>summary>&]:inline">{openLabel}</span>
          </>
        ) : (
          label
        )}
        <ChevronDownIcon className="size-4 shrink-0 transition-transform duration-150 [details[open]>summary>&]:rotate-180" />
      </summary>
      <div className="mt-2 flex min-w-0 flex-col gap-3">{children}</div>
    </details>
  );
}

/**
 * A clue line in the staff's language; each report value keeps its own
 * direction. `isolate={false}` leaves the line bare so a `dir="auto"` parent
 * can take its direction from the wording (it skips `<bdi>` children).
 */
export function ClueText({
  text,
  locale,
  isolate = true,
  className,
}: {
  text: string;
  locale: Locale;
  isolate?: boolean;
  className?: string;
}) {
  const parts = clueSegments(text, locale).map((segment, index) =>
    segment.value ? (
      <bdi key={index} dir="auto">
        {segment.text}
      </bdi>
    ) : (
      segment.text
    ),
  );
  return isolate ? (
    <bdi dir="auto" className={className}>
      {parts}
    </bdi>
  ) : (
    <>{parts}</>
  );
}

/** A queue's heading with its count beside it. */
export function QueueHeading({
  id,
  title,
  count,
  intro,
}: {
  id: string;
  title: string;
  count?: number;
  intro?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2 id={id} className="text-subheading text-foreground">
        {title}
        {count !== undefined ? (
          <span className="ms-2 font-medium tabular-nums text-muted-foreground">{count}</span>
        ) : null}
      </h2>
      {intro ? <p className="max-w-[58ch] text-small text-foreground/80">{intro}</p> : null}
    </div>
  );
}

/** What is done and what to do next, in the queue's own frame. */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-[1.25rem] border border-dashed border-foreground/25 px-5 py-6">
      <p className="text-body font-semibold text-foreground">{title}</p>
      <p className="max-w-[58ch] text-small text-foreground/80">{children}</p>
      {action}
    </div>
  );
}

/** A compact "Lost item → Found item" line for list rows; wraps to two lines on phones. */
export function PairLine({
  match,
  t,
  as: Tag = "h3",
}: {
  match: ReportMatch | undefined;
  t: AdminMessages;
  as?: "h3" | "p";
}) {
  return (
    <Tag className="flex min-w-0 flex-col gap-1.5 text-body font-semibold leading-snug text-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
      <span className="flex min-w-0 items-center gap-2">
        <ReportKindCue kind="lost" className="shrink-0">
          {t.kindLost}
        </ReportKindCue>
        <bdi dir="auto" className="min-w-0 break-words">
          {match?.lost?.item_name ?? t.reportUnavailable}
        </bdi>
      </span>
      <ArrowEndIcon className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
      <span className="flex min-w-0 items-center gap-2">
        <ReportKindCue kind="found" className="shrink-0">
          {t.kindFound}
        </ReportKindCue>
        <bdi dir="auto" className="min-w-0 break-words">
          {match?.found?.item_name ?? t.reportUnavailable}
        </bdi>
      </span>
    </Tag>
  );
}

/** Similarity as a quiet ranking aid in a row's meta line. */
export function ScoreNote({ score, t }: { score: number | null; t: AdminMessages }) {
  return (
    <span className={stampClassName}>
      {t.aiSimilarity}{" "}
      {score === null ? (
        t.notScored
      ) : (
        <span dir="ltr" className="tabular-nums">
          {score}
          {t.outOf100}
        </span>
      )}
    </span>
  );
}

/** A small similarity chip for secondary lists. */
export function ScoreChip({ score, t }: { score: number | null; t: AdminMessages }) {
  return (
    <StatusChip tone="neutral">
      {t.aiSimilarity}{" "}
      {score === null ? (
        t.notScored
      ) : (
        <span dir="ltr" className="tabular-nums">
          {score}
          <span className="text-muted-foreground">{t.outOf100}</span>
        </span>
      )}
    </StatusChip>
  );
}

function ReportColumn({
  kind,
  label,
  report,
  t,
  privateNote,
}: {
  kind: "lost" | "found";
  label: string;
  report: MatchedReport | null;
  t: AdminMessages;
  privateNote?: boolean;
}) {
  return (
    <div className={blockClassName}>
      <div className="flex flex-wrap items-center gap-2">
        <ReportKindCue kind={kind}>{label}</ReportKindCue>
        {privateNote ? <LockIcon className="size-4 text-muted-foreground" /> : null}
      </div>
      {report ? (
        <>
          <p dir="auto" className="break-words text-subheading leading-snug text-foreground">
            {report.item_name}
          </p>
          <p dir="auto" className="break-words text-small text-foreground">
            {report.description}
          </p>
          <p className="break-words text-small text-muted-foreground">
            {t.location}: <bdi>{report.location}</bdi>
          </p>
        </>
      ) : (
        <p className="text-small text-muted-foreground">{t.reportUnavailable}</p>
      )}
    </div>
  );
}

/** The lost and found reports side by side on wide screens, stacked on phones. */
export function ReportPair({
  lost,
  found,
  t,
}: {
  lost: MatchedReport | null;
  found: MatchedReport | null;
  t: AdminMessages;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <ReportColumn kind="lost" label={t.kindLost} report={lost} t={t} />
      <ReportColumn kind="found" label={t.foundPrivate} report={found} t={t} privateNote />
    </div>
  );
}

export function DetailList({
  title,
  items,
  emptyText,
  tone = "default",
}: {
  title: string;
  items: string[];
  emptyText: string;
  tone?: "default" | "warning";
}) {
  const warning = tone === "warning" && items.length > 0;
  return (
    <div className={`flex min-w-0 flex-col gap-1 rounded-2xl p-4 ${warning ? "bg-bad-soft" : "bg-card"}`}>
      <h4 className={`text-small font-semibold ${warning ? "text-bad-ink" : "text-foreground"}`}>
        {title}
        <span className="ms-1.5 font-medium tabular-nums text-muted-foreground">{items.length}</span>
      </h4>
      {items.length === 0 ? (
        <p className="text-small text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="list-disc space-y-1 ps-5 text-small text-foreground">
          {items.map((item, index) => (
            <li key={`${index}-${item}`} dir="auto" className="break-words">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Shared clues, differences and unknowns from the saved AI comparison. */
export function ClueColumns({ match, t }: { match: ReportMatch; t: AdminMessages }) {
  const recorded =
    match.supporting_details.length > 0 ||
    match.contradictions.length > 0 ||
    match.missing_information.length > 0;
  if (!recorded) {
    return <p className="text-small text-muted-foreground">{t.notRecorded}</p>;
  }
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <DetailList title={t.sharedClues} items={match.supporting_details} emptyText={t.emptyShared} />
      <DetailList
        title={t.differences}
        items={match.contradictions}
        emptyText={t.emptyDifferences}
        tone="warning"
      />
      <DetailList title={t.unknowns} items={match.missing_information} emptyText={t.emptyUnknowns} />
    </div>
  );
}
