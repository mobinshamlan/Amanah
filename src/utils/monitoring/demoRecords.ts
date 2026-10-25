import type {
  ClaimSummaryInput,
  DemoExclusions,
  MatchingRun,
  MonitoringInput,
} from "@/utils/monitoring/snapshot";

// Keeps clearly marked fictional records out of Monitoring's operational totals
// and charts. Nothing is deleted or changed: this only decides what is counted.
//
// A record counts as demo only when it is marked, never by guesswork:
//   - a report whose item name starts with the word "DEMO" ("DEMO · Sketchbook",
//     "DEMO — Blue backpack", "DEMO in a colour Navy backpack");
//   - a run, suggestion, or claim whose AI model value contains "demo" (the
//     seeded rows use "demo-fixture"; real runs use a Gemini model name);
//   - anything built on a demo report: a comparison, suggestion, or claim that
//     involves a demo report, including a pair of one demo and one real report.
// Report names are read here only to find the marker. They never reach the
// snapshot, which holds counts only.

/** True when an item name is marked as demo data. */
export function isDemoReportName(itemName: string | null | undefined) {
  return typeof itemName === "string" && /^\s*demo\b/i.test(itemName);
}

/** True when an AI model value marks a seeded or synthetic record. */
export function isDemoModel(model: string | null | undefined) {
  return typeof model === "string" && /demo/i.test(model);
}

export type DemoFilterInput = Omit<MonitoringInput, "reports" | "suggestions" | "claims"> & {
  // item_name is only used to find the marker and is dropped from the result.
  reports: (MonitoringInput["reports"][number] & { item_name?: string | null })[];
  suggestions: (MonitoringInput["suggestions"][number] & { model?: string | null })[];
  claims: (ClaimSummaryInput & { lostReportId?: string; model?: string | null })[] | null;
};

const EMPTY: DemoExclusions = { reports: 0, comparisons: 0, suggestions: 0, runs: 0, claims: 0 };

/**
 * Returns the input without demo records, and counts of what was left out.
 * `demoRunsHidden` adds runs already excluded by the database query.
 */
export function excludeDemoData(
  input: DemoFilterInput,
  demoRunsHidden = 0,
): { input: MonitoringInput; excluded: DemoExclusions } {
  const demoReportIds = new Set(
    input.reports.filter((row) => isDemoReportName(row.item_name)).map((row) => row.id),
  );
  const touchesDemo = (row: { lost_report_id: string; found_report_id: string }) =>
    demoReportIds.has(row.lost_report_id) || demoReportIds.has(row.found_report_id);

  const reports = input.reports
    .filter((row) => !demoReportIds.has(row.id))
    .map(({ id, report_type, created_at }) => ({ id, report_type, created_at }));
  const pairChecks = input.pairChecks.filter((row) => !touchesDemo(row));
  const suggestions = input.suggestions
    .filter((row) => !touchesDemo(row) && !isDemoModel(row.model))
    .map(({ lost_report_id, found_report_id, ai_decision }) => ({
      lost_report_id,
      found_report_id,
      ai_decision,
    }));
  const runs: MatchingRun[] = input.history
    ? input.history.runs.filter((run) => !isDemoModel(run.model))
    : [];
  const claims = input.claims
    ? input.claims
        .filter(
          (claim) =>
            !(claim.lostReportId && demoReportIds.has(claim.lostReportId)) &&
            !isDemoModel(claim.model),
        )
        .map((claim) => ({
          questionCount: claim.questionCount,
          answerCount: claim.answerCount,
          assessed: claim.assessed,
          decision: claim.decision,
          similarityScore: claim.similarityScore,
          waitingSince: claim.waitingSince,
        }))
    : null;

  return {
    input: {
      ...input,
      reports,
      pairChecks,
      suggestions,
      claims,
      history: input.history ? { ...input.history, runs } : null,
    },
    excluded: {
      ...EMPTY,
      reports: input.reports.length - reports.length,
      comparisons: input.pairChecks.length - pairChecks.length,
      suggestions: input.suggestions.length - suggestions.length,
      runs: demoRunsHidden + (input.history ? input.history.runs.length - runs.length : 0),
      claims: input.claims && claims ? input.claims.length - claims.length : 0,
    },
  };
}
