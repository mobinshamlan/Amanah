import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createAdminClient,
  isLocalAdminEnabled,
} from "@/utils/supabase/admin";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

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
  let loadError = false;
  let missingConfig = false;

  try {
    const supabase = createAdminClient();
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
