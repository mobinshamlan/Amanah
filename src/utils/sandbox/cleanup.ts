import { SANDBOX_RETENTION_DAYS } from "@/utils/sandbox";
import { ensureSampleReports, SAMPLE_REPORTS } from "@/utils/sandbox/samples";
import { deleteReportsExcept } from "@/utils/db/queries";
import type { Sql } from "@/utils/db/sql";

// Test mode cleanup. Deletes visitors' reports; every related row (matches,
// pair checks, submissions, ownership claims, answers, decisions, candidate
// reviews) goes with them through ON DELETE CASCADE. Sample reports stay.

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
  db: Sql,
  now: Date = new Date(),
  mode: CleanupMode = "expired",
): Promise<CleanupSummary> {
  const cutoff =
    mode === "expired"
      ? new Date(now.getTime() - SANDBOX_RETENTION_DAYS * DAY_MS).toISOString()
      : null;
  const { data: deleted, error } = await deleteReportsExcept(
    db,
    SAMPLE_REPORTS.map((report) => report.id),
    cutoff,
  );
  if (error) {
    throw new Error(`cleanup-delete-failed:${error.code ?? "unknown"}`);
  }
  const samplesAdded = await ensureSampleReports(db);
  return { mode, deletedReports: deleted ?? 0, samplesAdded };
}
