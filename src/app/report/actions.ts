"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  validateReportFields,
  type FieldErrors,
  type ReportFields,
} from "@/app/report/validation";
import {
  buildPairs,
  type MatchReport,
  type MatchingFailure,
} from "@/utils/matching/runMatchingBatch";
import {
  checkedKeysFrom,
  elapsedSince,
  REPORT_COLUMNS,
  runNewReportMatching,
} from "@/utils/matching/serverMatching";
import {
  createSubmissionCredential,
  hashSubmissionCredential,
  isSubmissionCredential,
} from "@/utils/matching/submissionCredential";
import {
  toPublicStatus,
  type PublicMatchingStatus,
} from "@/utils/matching/publicStatus";
import { getGeminiModel } from "@/utils/gemini/compareReports";
import { loadFailureRow, recordMatchingRun } from "@/utils/monitoring/runLog";

export type ReportType = "lost" | "found";

export type SubmitReportResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
  // Present only when automatic matching can be continued for this submission.
  credential?: string;
};

export type ContinueMatchingResult =
  | { ok: true; status: PublicMatchingStatus; waitMs?: number }
  | { ok: false };

const LOCATION_REQUIRED: Record<ReportType, string> = {
  lost: "Last-seen location is required.",
  found: "Found location is required.",
};

// Longer than the worst case of one call: a 30 s batch request, one retry after
// 2 s, another 30 s, then saving the results.
const PROCESSING_LEASE_MS = 90_000;
const BUSY_WAIT_MS = 2_000;
// After a 429 the page waits this long before asking again.
const RATE_LIMIT_WAIT_MS = 60_000;

function tryCreateAdminClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

export async function submitReport(
  reportType: ReportType,
  input: ReportFields,
): Promise<SubmitReportResult> {
  // Only allow the two known types — never accept arbitrary client strings.
  if (reportType !== "lost" && reportType !== "found") {
    return {
      ok: false,
      message: "Could not save your report. Please try again.",
    };
  }

  const fieldErrors = validateReportFields(
    input,
    LOCATION_REQUIRED[reportType],
  );

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  // Public roles can insert but not read reports, so the server picks the id.
  const reportId = randomUUID();
  const supabase = await createClient();

  const { error } = await supabase.from("reports").insert({
    id: reportId,
    report_type: reportType,
    item_name: input.itemName.trim(),
    description: input.description.trim(),
    location: input.location.trim(),
  });

  if (error) {
    console.error("Failed to insert report:", error.code);
    return {
      ok: false,
      message: "Could not save your report. Please try again.",
    };
  }

  const saved = { ok: true, message: "Report saved." };

  const admin = tryCreateAdminClient();
  if (!admin) {
    console.error("Automatic matching unavailable: admin client not configured");
    return saved;
  }

  const credential = createSubmissionCredential();
  const { error: credentialError } = await admin.from("report_submissions").insert({
    report_id: reportId,
    token_hash: hashSubmissionCredential(credential),
  });

  if (credentialError) {
    console.error("Failed to create submission credential:", credentialError.code);
    return saved;
  }

  return { ...saved, credential };
}

/**
 * Runs one bounded batch of automatic matching for the submission that owns
 * this credential, then returns only the public status. Called repeatedly by
 * the submitter's browser until checking is no longer in progress, and again
 * whenever a lost reporter opens their private tracking link.
 */
export async function continueMatching(
  credential: string,
  expectedType: ReportType,
): Promise<ContinueMatchingResult> {
  if (!isSubmissionCredential(credential)) {
    return { ok: false };
  }

  const supabase = tryCreateAdminClient();
  if (!supabase) {
    return { ok: true, status: { phase: "unavailable" } };
  }

  const loadStartedAt = performance.now();
  const { data: submission, error: submissionError } = await supabase
    .from("report_submissions")
    .select(`report_id, report:reports(report_type, ${REPORT_COLUMNS})`)
    .eq("token_hash", hashSubmissionCredential(credential))
    .maybeSingle();

  if (submissionError) {
    console.error("Failed to load submission:", submissionError.code);
    return { ok: true, status: { phase: "failed" } };
  }
  const report = submission?.report as
    | (MatchReport & { report_type: ReportType })
    | null
    | undefined;
  // A credential only works on the page for its own report type.
  if (!submission || !report || report.report_type !== expectedType) {
    return { ok: false };
  }

  const reportType = report.report_type;
  const ownColumn = reportType === "lost" ? "lost_report_id" : "found_report_id";
  const otherType: ReportType = reportType === "lost" ? "found" : "lost";

  const nowIso = new Date().toISOString();
  const { data: lease, error: leaseError } = await supabase
    .from("report_submissions")
    .update({ processing_until: new Date(Date.now() + PROCESSING_LEASE_MS).toISOString() })
    .eq("report_id", submission.report_id)
    .or(`processing_until.is.null,processing_until.lt.${nowIso}`)
    .select("report_id");

  if (leaseError) {
    console.error("Failed to claim matching lease:", leaseError.code);
    return { ok: true, status: { phase: "failed" } };
  }
  const hasLease = (lease ?? []).length > 0;

  let remaining = 0;
  let failure: MatchingFailure | null = null;

  try {
    const [otherResult, savedResult, checksResult] = await Promise.all([
      supabase.from("reports").select(REPORT_COLUMNS).eq("report_type", otherType),
      supabase.from("report_matches").select("lost_report_id, found_report_id").eq(ownColumn, report.id),
      supabase.from("report_pair_checks").select("lost_report_id, found_report_id").eq(ownColumn, report.id),
    ]);
    const loadMs = elapsedSince(loadStartedAt);

    const loadError = otherResult.error ?? savedResult.error ?? checksResult.error;
    if (loadError) {
      console.error("Matching (auto) failed to load data:", loadError.code, `${loadMs}ms`);
      // Only the call holding the lease would have run; a waiting call is not a run.
      if (hasLease) {
        await recordMatchingRun(
          supabase,
          loadFailureRow("auto", { durationMs: loadMs, model: getGeminiModel() }),
        );
      }
      return { ok: true, status: { phase: "failed" } };
    }

    const others = (otherResult.data ?? []) as MatchReport[];
    const pairs =
      reportType === "lost" ? buildPairs([report], others) : buildPairs(others, [report]);
    const checkedKeys = checkedKeysFrom([
      ...(savedResult.data ?? []),
      ...(checksResult.data ?? []),
    ]);
    remaining = pairs.filter((pair) => !checkedKeys.has(pair.key)).length;

    if (hasLease && remaining > 0) {
      if (!process.env.GEMINI_API_KEY?.trim()) {
        failure = "config";
      } else {
        const summary = await runNewReportMatching({
          supabase,
          side: reportType,
          pairs,
          checkedKeys,
          loadMs,
        });
        remaining = summary.remaining;
        failure = summary.failure;
      }
    }
  } finally {
    if (hasLease) {
      const { error: releaseError } = await supabase
        .from("report_submissions")
        .update({ processing_until: null })
        .eq("report_id", submission.report_id);
      if (releaseError) {
        console.error("Failed to release matching lease:", releaseError.code);
      }
    }
  }

  let hasMatch = false;
  let hasUncertain = false;
  if (reportType === "lost") {
    const { data: suggestions, error: suggestionsError } = await supabase
      .from("report_matches")
      .select("ai_decision")
      .eq("lost_report_id", report.id);
    if (suggestionsError) {
      console.error("Failed to load suggestion status:", suggestionsError.code);
      return { ok: true, status: { phase: "failed" } };
    }
    hasMatch = (suggestions ?? []).some((row) => row.ai_decision === "match");
    hasUncertain = (suggestions ?? []).some(
      (row) => row.ai_decision === "insufficient_information",
    );
  }

  const status = toPublicStatus({ reportType, remaining, failure, hasMatch, hasUncertain });
  if (status.phase === "rate_limited") {
    return { ok: true, status, waitMs: RATE_LIMIT_WAIT_MS };
  }
  const busy = !hasLease && status.phase === "checking";
  return busy ? { ok: true, status, waitMs: BUSY_WAIT_MS } : { ok: true, status };
}
