import { getGeminiModel } from "@/utils/gemini/compareReports";
import {
  buildMonitoringSnapshot,
  MATCHING_RUN_COLUMNS,
  toMatchingRun,
  type ClaimSummaryInput,
  type MonitoringInput,
  type MonitoringSnapshot,
} from "@/utils/monitoring/snapshot";
import { isMissingTableCode } from "@/utils/monitoring/runLog";
import { excludeDemoData, isDemoModel, isDemoReportName } from "@/utils/monitoring/demoRecords";
import type { createAdminClient } from "@/utils/supabase/admin";

// Server-only (admin client). Loads what the monitoring view counts. Report
// IDs are read only to count pairs and never leave this function.

type AdminClient = ReturnType<typeof createAdminClient>;

// Enough for the 14-day check statistics at MVP scale; the view says when
// more checks exist than were loaded.
export const RUN_LOAD_LIMIT = 200;

export type MonitoringLoad =
  | {
      ok: true;
      snapshot: MonitoringSnapshot;
      // Possible matches still needing review, without demo records.
      reviewNeeded: number | null;
    }
  | { ok: false };

type SuggestionRef = {
  lost_report_id: string;
  found_report_id: string;
  ai_decision: string;
  model?: string | null;
};

export async function loadMonitoringSnapshot(
  supabase: AdminClient,
  {
    suggestions,
    claims,
    needsReview = null,
  }: {
    suggestions: SuggestionRef[];
    claims: (ClaimSummaryInput & { lostReportId?: string; model?: string | null })[] | null;
    // Suggestions that still need staff review; null when that is unknown.
    needsReview?: SuggestionRef[] | null;
  },
): Promise<MonitoringLoad> {
  // Demo runs are filtered in the query, so the count and first date are real too.
  const [reportsResult, checksResult, runsResult, firstRunResult, demoRunsResult] =
    await Promise.all([
    supabase.from("reports").select("id, report_type, item_name, created_at"),
    supabase
      .from("report_pair_checks")
      .select("lost_report_id, found_report_id, ai_decision, checked_at"),
    supabase
      .from("matching_runs")
      .select(MATCHING_RUN_COLUMNS, { count: "exact" })
      .not("model", "ilike", "%demo%")
      .order("finished_at", { ascending: false })
      .limit(RUN_LOAD_LIMIT),
    supabase
      .from("matching_runs")
      .select("finished_at")
      .not("model", "ilike", "%demo%")
      .order("finished_at", { ascending: true })
      .limit(1),
    supabase
      .from("matching_runs")
      .select("finished_at", { count: "exact", head: true })
      .ilike("model", "%demo%"),
  ]);

  if (reportsResult.error || checksResult.error) {
    console.error(
      "Monitoring: failed to load counts:",
      reportsResult.error?.code ?? checksResult.error?.code,
    );
    return { ok: false };
  }
  // A missing table is expected until the matching_runs migration is applied;
  // the view says so. Anything else is a real error.
  const runsError = runsResult.error ?? firstRunResult.error;
  if (runsError && !isMissingTableCode(runsError.code)) {
    console.error("Monitoring: run history unavailable:", runsError.code);
  }

  const reports = (reportsResult.data ?? []) as (MonitoringInput["reports"][number] & {
    item_name: string;
  })[];
  const demoReportIds = new Set(
    reports.filter((row) => isDemoReportName(row.item_name)).map((row) => row.id),
  );
  const reviewNeeded = needsReview
    ? needsReview.filter(
        (row) =>
          !demoReportIds.has(row.lost_report_id) &&
          !demoReportIds.has(row.found_report_id) &&
          !isDemoModel(row.model),
      ).length
    : null;

  const { input, excluded } = excludeDemoData(
    {
      now: new Date(),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      model: getGeminiModel(),
      reports,
      pairChecks: (checksResult.data ?? []) as MonitoringInput["pairChecks"],
      suggestions,
      history: runsError
        ? null
        : {
            runs: ((runsResult.data ?? []) as Parameters<typeof toMatchingRun>[0][]).map(
              toMatchingRun,
            ),
            total: runsResult.count ?? (runsResult.data ?? []).length,
            firstAt: (firstRunResult.data?.[0] as { finished_at: string } | undefined)?.finished_at ?? null,
          },
      claims,
    },
    runsError ? 0 : (demoRunsResult.count ?? 0),
  );

  return {
    ok: true,
    snapshot: buildMonitoringSnapshot({ ...input, excludedDemo: excluded }),
    reviewNeeded,
  };
}
