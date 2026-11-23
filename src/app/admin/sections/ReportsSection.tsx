import Link from "next/link";
import { Notice, ReportKindCue, focusRingClassName, linkClassName } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import { formatDateTime } from "@/i18n/format";
import type { AdminMessages } from "@/i18n/messages/admin";
import type { Filter, Report } from "@/app/admin/parts/model";
import { EmptyState, rowClassName, stampClassName } from "@/app/admin/parts/ui";

// All reports: a lost/found filter, two-line rows on phones and a table from
// tablet up. Long text wraps; the table scrolls inside a labelled region.

function filterHref(value: Filter) {
  return value === "all" ? "/admin?section=reports" : `/admin?section=reports&type=${value}`;
}

/** Lost / found filter as a segmented control of links; `aria-current` marks the active one. */
export function ReportFilter({ filter, t }: { filter: Filter; t: AdminMessages }) {
  return (
    <nav aria-label={t.filterLabel}>
      <ul className="inline-flex max-w-full rounded-full bg-secondary p-1">
        {(["all", "lost", "found"] as const).map((value) => (
          <li key={value}>
            <Link
              href={filterHref(value)}
              aria-current={filter === value ? "page" : undefined}
              className={`inline-flex min-h-10 min-w-16 cursor-pointer items-center justify-center rounded-full px-4 text-small transition-colors duration-150 ${focusRingClassName} ${
                filter === value
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "text-foreground/80 hover:bg-card hover:text-foreground"
              }`}
            >
              {t.filter[value]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function kindOf(type: string): "lost" | "found" {
  return type === "lost" ? "lost" : "found";
}

function ReportsList({ reports, t, locale }: { reports: Report[]; t: AdminMessages; locale: Locale }) {
  return (
    <>
      {/* Phone: two-line rows. */}
      <ul className="flex flex-col gap-2 md:hidden">
        {reports.map((report) => (
          <li key={report.id} className={`${rowClassName} flex flex-col gap-1.5 p-4`}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 break-words text-subheading leading-snug text-foreground">
                {report.item_name}
              </h3>
              <ReportKindCue kind={kindOf(report.report_type)} className="shrink-0">
                {report.report_type === "lost" ? t.kindLost : t.kindFound}
              </ReportKindCue>
            </div>
            <p className="break-words text-small text-foreground">{report.description}</p>
            <p className="break-words text-small text-muted-foreground">
              {t.location}: {report.location}
            </p>
            <p className={stampClassName}>{formatDateTime(report.created_at, locale)}</p>
          </li>
        ))}
      </ul>

      {/* Tablet and desktop: a table in a labelled scroll region keyboard users can focus. */}
      <div
        role="region"
        aria-label={t.reportsRegion}
        tabIndex={0}
        className={`hidden overflow-x-auto rounded-[1.25rem] bg-background md:block ${focusRingClassName}`}
      >
        <table className="w-full text-start text-small">
          <caption className="sr-only">{t.reportsCaption}</caption>
          <thead className="text-muted-foreground">
            <tr className="border-b border-border">
              <th scope="col" className="px-5 py-3.5 text-start font-semibold">
                {t.columns.item}
              </th>
              <th scope="col" className="px-4 py-3.5 text-start font-semibold">
                {t.columns.type}
              </th>
              <th scope="col" className="px-4 py-3.5 text-start font-semibold">
                {t.columns.description}
              </th>
              <th scope="col" className="hidden px-4 py-3.5 text-start font-semibold lg:table-cell">
                {t.columns.location}
              </th>
              <th scope="col" className="px-5 py-3.5 text-end font-semibold">
                {t.columns.saved}
              </th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr
                key={report.id}
                className="border-b border-border/80 align-top last:border-b-0 hover:bg-secondary/60"
              >
                <th scope="row" className="w-[20%] px-5 py-3.5 text-start text-body font-semibold leading-snug text-foreground">
                  <span className="break-words">{report.item_name}</span>
                </th>
                <td className="px-4 py-3">
                  <ReportKindCue kind={kindOf(report.report_type)}>
                    {report.report_type === "lost" ? t.kindLost : t.kindFound}
                  </ReportKindCue>
                </td>
                <td className="w-[40%] px-4 py-3 text-foreground">
                  <span className="break-words">{report.description}</span>
                  <span className="mt-1 block text-muted-foreground lg:hidden">
                    {t.location}: {report.location}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                  <span className="break-words">{report.location}</span>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-end tabular-nums text-muted-foreground">
                  {formatDateTime(report.created_at, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function ReportsSection({
  reports,
  filter,
  error,
  t,
  locale,
}: {
  reports: Report[];
  filter: Filter;
  error: boolean;
  t: AdminMessages;
  locale: Locale;
}) {
  if (error) {
    return (
      <Notice tone="error" role="alert">
        {t.errorReports}
      </Notice>
    );
  }
  if (reports.length === 0) {
    return filter === "all" ? (
      <EmptyState title={t.emptyReportsTitle}>{t.emptyReports}</EmptyState>
    ) : (
      <EmptyState
        title={t.emptyFilteredTitle(filter)}
        action={
          <Link href={filterHref("all")} className={linkClassName}>
            {t.showAll}
          </Link>
        }
      >
        {t.emptyFiltered}
      </EmptyState>
    );
  }
  return (
    <div id="reports" className="scroll-mt-6">
      <ReportsList reports={reports} t={t} locale={locale} />
    </div>
  );
}
