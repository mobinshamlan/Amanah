import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createAdminClient,
  isLocalAdminEnabled,
} from "@/utils/supabase/admin";
import { SiteHeader } from "@/components/site-header";
import { RunMatching } from "@/app/admin/RunMatching";

export const dynamic = "force-dynamic";

type MatchedReport = {
  item_name: string;
  description: string;
  location: string;
};

type ReportMatch = {
  id: string;
  explanation: string;
  model: string;
  created_at: string;
  ai_decision: "match" | "insufficient_information";
  supporting_details: string[];
  contradictions: string[];
  missing_information: string[];
  ai_similarity_score: number | null;
  status: "pending_review";
  lost: MatchedReport | null;
  found: MatchedReport | null;
};

const MATCH_COLUMNS = `
  id, explanation, model, created_at, ai_decision,
  supporting_details, contradictions, missing_information,
  ai_similarity_score, status,
  lost:reports!report_matches_lost_report_fkey(item_name, description, location),
  found:reports!report_matches_found_report_fkey(item_name, description, location)
`;

function DetailList({
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
  const boxClass =
    tone === "warning" && items.length > 0
      ? "rounded-xl border border-destructive/40 bg-background p-3"
      : "rounded-xl border border-border bg-background p-3";
  const titleClass =
    tone === "warning" && items.length > 0
      ? "text-sm font-medium text-destructive"
      : "text-sm font-medium text-foreground";

  return (
    <div className={boxClass}>
      <h4 className={titleClass}>{title}</h4>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground">
          {items.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MatchedReportDetails({
  label,
  report,
}: {
  label: string;
  report: MatchedReport | null;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-forest">
        {label}
      </p>
      {report ? (
        <>
          <h3 className="font-serif text-xl font-semibold leading-tight tracking-tight text-foreground">
            {report.item_name}
          </h3>
          <p className="text-sm leading-relaxed text-foreground">
            {report.description}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Location: {report.location}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Report unavailable.</p>
      )}
    </div>
  );
}

function SimilarityBadge({ score }: { score: number | null }) {
  return (
    <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-foreground">
      AI similarity:{" "}
      {score === null ? (
        "Not scored"
      ) : (
        <>
          <span className="font-semibold">{score}</span>
          <span className="text-muted-foreground">/100</span>
        </>
      )}
    </span>
  );
}

function byScoreThenNewest(a: ReportMatch, b: ReportMatch) {
  const aScore = a.ai_similarity_score ?? -1;
  const bScore = b.ai_similarity_score ?? -1;
  if (aScore !== bScore) {
    return bScore - aScore;
  }
  return a.created_at < b.created_at ? 1 : -1;
}

const SUMMARY_TOGGLE_CLASS =
  "-ml-2 inline-flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-foreground outline-none transition-colors hover:text-forest focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden";

function Chevron({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={`size-4 transition-transform ${className}`}
    >
      <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MatchCard({ match }: { match: ReportMatch }) {
  const detailsRecorded =
    match.supporting_details.length > 0 ||
    match.contradictions.length > 0 ||
    match.missing_information.length > 0;

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <SimilarityBadge score={match.ai_similarity_score} />
        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground">
          Pending review
        </span>
      </div>

      <dl className="grid gap-2 sm:grid-cols-2 sm:gap-4">
        <div>
          <dt className="text-xs font-medium uppercase tracking-[0.14em] text-forest">
            Lost
          </dt>
          <dd className="font-serif text-xl font-semibold leading-tight tracking-tight text-foreground">
            {match.lost?.item_name ?? "Report unavailable"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-[0.14em] text-forest">
            Found
          </dt>
          <dd className="font-serif text-xl font-semibold leading-tight tracking-tight text-foreground">
            {match.found?.item_name ?? "Report unavailable"}
          </dd>
        </div>
      </dl>

      <p className="line-clamp-2 text-sm leading-relaxed text-foreground">
        {match.explanation}
      </p>

      {match.contradictions.length > 0 ? (
        <DetailList
          title="Contradictions"
          items={match.contradictions}
          emptyText=""
          tone="warning"
        />
      ) : null}

      <details className="group/card">
        <summary className={SUMMARY_TOGGLE_CLASS}>
          <span className="group-open/card:hidden">View details</span>
          <span className="hidden group-open/card:inline">Hide details</span>
          <Chevron className="group-open/card:rotate-180" />
        </summary>
        <div className="mt-2 flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <MatchedReportDetails label="Lost" report={match.lost} />
            <MatchedReportDetails label="Found" report={match.found} />
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            <span className="font-medium">Gemini&apos;s summary: </span>
            {match.explanation}
          </p>
          {detailsRecorded ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailList
                title="Supporting details"
                items={match.supporting_details}
                emptyText="None found in both reports."
              />
              <DetailList
                title="Missing information"
                items={match.missing_information}
                emptyText="None noted."
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Supporting details, contradictions, and missing information were
              not recorded for this suggestion (saved before they were
              collected).
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Suggested {new Date(match.created_at).toLocaleString()} · {match.model}
          </p>
        </div>
      </details>
    </li>
  );
}

type Report = {
  id: string;
  report_type: string;
  item_name: string;
  description: string;
  location: string;
  created_at: string;
};

type Filter = "all" | "lost" | "found";

function parseFilter(value: string | string[] | undefined): Filter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "lost" || raw === "found") {
    return raw;
  }
  return "all";
}

function filterClass(active: boolean) {
  return active
    ? "rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    : "rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  if (!isLocalAdminEnabled()) {
    notFound();
  }

  const params = await searchParams;
  const filter = parseFilter(params.type);

  let reports: Report[] = [];
  let matches: ReportMatch[] = [];
  let loadError = false;
  let matchesError = false;
  let missingConfig = false;

  try {
    const supabase = createAdminClient();

    const matchesResult = await supabase
      .from("report_matches")
      .select(MATCH_COLUMNS)
      .order("created_at", { ascending: false });
    if (matchesResult.error) {
      matchesError = true;
    } else {
      matches = (matchesResult.data ?? []) as unknown as ReportMatch[];
    }

    let query = supabase
      .from("reports")
      .select("id, report_type, item_name, description, location, created_at")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("report_type", filter);
    }

    const { data, error } = await query;
    if (error) {
      loadError = true;
    } else {
      reports = (data ?? []) as Report[];
    }
  } catch (error) {
    if (error instanceof Error && error.message === "missing-admin-config") {
      missingConfig = true;
    } else {
      loadError = true;
    }
  }

  const possibleMatches = matches
    .filter((match) => match.ai_decision === "match")
    .sort(byScoreThenNewest);
  const uncertainMatches = matches
    .filter((match) => match.ai_decision === "insufficient_information")
    .sort(byScoreThenNewest);

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

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-balance font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
                Admin reports
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Local development only. Newest reports appear first.
              </p>
            </div>
            <span className="w-fit rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Local admin
            </span>
          </div>

          {missingConfig ? null : (
            <section
              aria-labelledby="matches-heading"
              className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
            >
              <div>
                <h2
                  id="matches-heading"
                  className="font-serif text-[1.65rem] font-semibold leading-tight tracking-tight text-foreground"
                >
                  Possible matches
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Private AI suggestions from the report text only. Pending
                  review means staff have not checked them yet. A suggestion
                  does not establish ownership or authorize returning an item.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  AI similarity (0–100) is an experimental ranking aid from
                  Gemini. It is not a probability and does not verify
                  ownership.
                </p>
              </div>

              <RunMatching />

              {matchesError ? (
                <p
                  role="alert"
                  className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium leading-snug text-foreground"
                >
                  Could not load possible matches. Please try again.
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-medium text-foreground">
                      AI: possible match ({possibleMatches.length})
                    </h3>
                    {possibleMatches.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                        No possible matches saved yet.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {possibleMatches.map((match) => (
                          <MatchCard key={match.id} match={match} />
                        ))}
                      </ul>
                    )}
                  </div>

                  {uncertainMatches.length > 0 ? (
                    <details className="group/uncertain rounded-xl border border-border px-3 py-2 sm:px-4">
                      <summary className={SUMMARY_TOGGLE_CLASS}>
                        AI: not enough information ({uncertainMatches.length})
                        <Chevron className="group-open/uncertain:rotate-180" />
                      </summary>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        The reports might describe the same item, but the
                        details are too common or too thin to say.
                      </p>
                      <ul className="mt-3 mb-2 flex flex-col gap-3">
                        {uncertainMatches.map((match) => (
                          <MatchCard key={match.id} match={match} />
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </>
              )}
            </section>
          )}

          <nav className="mt-8 flex flex-wrap gap-2" aria-label="Filter reports">
            <Link href="/admin" className={filterClass(filter === "all")}>
              All
            </Link>
            <Link
              href="/admin?type=lost"
              className={filterClass(filter === "lost")}
            >
              Lost
            </Link>
            <Link
              href="/admin?type=found"
              className={filterClass(filter === "found")}
            >
              Found
            </Link>
          </nav>

          {missingConfig ? (
            <p
              role="alert"
              className="mt-6 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium leading-snug text-foreground"
            >
              Admin is not configured. Add SUPABASE_SECRET_KEY to your local
              .env.local file, then restart the dev server.
            </p>
          ) : loadError ? (
            <p
              role="alert"
              className="mt-6 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium leading-snug text-foreground"
            >
              Could not load reports. Please try again.
            </p>
          ) : reports.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
              No reports to show.
            </p>
          ) : (
            <ul className="mt-6 flex flex-col gap-4">
              {reports.map((report) => (
                <li
                  key={report.id}
                  className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
                >
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-forest">
                    {report.report_type}
                  </p>
                  <h2 className="font-serif text-[1.65rem] font-semibold leading-tight tracking-tight text-foreground">
                    {report.item_name}
                  </h2>
                  <p className="text-base leading-relaxed text-foreground">
                    {report.description}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Location: {report.location}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(report.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
