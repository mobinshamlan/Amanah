import { SANDBOX_RETENTION_DAYS } from "@/utils/sandbox";
import { ensureSampleReports, SAMPLE_REPORTS } from "@/utils/sandbox/samples";
import type { createAdminClient } from "@/utils/supabase/admin";

// Test mode cleanup. Deletes visitors' reports; every related row (matches,
// pair checks, submissions, ownership claims, answers, decisions, candidate
// reviews) goes with them through ON DELETE CASCADE. Sample reports stay.

type AdminClient = ReturnType<typeof createAdminClient>;

export type CleanupMode = "expired" | "all";

/** Counts only: never report text or ids. */
export type CleanupSummary = {
  mode: CleanupMode;
  deletedReports: number;
  samplesAdded: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "expired": reports older than SANDBOX_RETENTION_DAYS. "all": every
 * non-sample report regardless of age (the one-time initial clean). Then adds
 * any missing sample report.
 */
export async function cleanupSandbox(
  client: AdminClient,
  now: Date = new Date(),
  mode: CleanupMode = "expired",
): Promise<CleanupSummary> {
  const sampleIds = `(${SAMPLE_REPORTS.map((report) => report.id).join(",")})`;
  let query = client.from("reports").delete({ count: "exact" }).not("id", "in", sampleIds);
  if (mode === "expired") {
    const cutoff = new Date(now.getTime() - SANDBOX_RETENTION_DAYS * DAY_MS).toISOString();
    query = query.lt("created_at", cutoff);
  }
  const { error, count } = await query;
  if (error) {
    throw new Error(`cleanup-delete-failed:${error.code ?? "unknown"}`);
  }
  const samplesAdded = await ensureSampleReports(client);
  return { mode, deletedReports: count ?? 0, samplesAdded };
}
