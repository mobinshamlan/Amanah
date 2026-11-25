"use server";

import { randomUUID } from "node:crypto";
import { tryCreateDb } from "@/utils/db/client";
import {
  claimMatchingLease,
  findSubmissionWithReport,
  insertReport,
  insertSubmission,
  listMatchReports,
  listPairCheckKeys,
  listSuggestionKeys,
  listSuggestionStatus,
  releaseMatchingLease,
} from "@/utils/db/queries";
import { currentIpKey } from "@/utils/limits/clientIp";
import { consumeReportSubmission } from "@/utils/limits/usageLimit";
import { runWithUsageScope } from "@/utils/limits/usageScope";
import {
  validateReportFields,
  type FieldErrors,
  type ReportFields,
} from "@/app/report/validation";
import { getMessages } from "@/i18n/server";
import { report as reportMessages } from "@/i18n/messages/report";
import {
  buildPairs,
  type MatchReport,
  type MatchingFailure,
} from "@/utils/matching/runMatchingBatch";
import {
  checkedKeysFrom,
  elapsedSince,
  runNewReportMatching,
} from "@/utils/matching/serverMatching";
import {
  createSubmissionCredential,
  hashSubmissionCredential,
  isSubmissionCredential,
} from "@/utils/matching/submissionCredential";
import {
  hasUncertainSuggestion,
  toPublicStatus,
  type PublicMatchingStatus,
} from "@/utils/matching/publicStatus";
import { isSandboxMode } from "@/utils/sandbox";
import { ensureSampleReportsOnce } from "@/utils/sandbox/samples";
import { getGeminiModel, isGeminiConfigured } from "@/utils/gemini/compareReports";
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

// Longer than the worst case of one call: a 24 s batch request (its fast
// retries and the fallback model stay inside that limit; see withModelFallback
// in compareReports.ts, and only 6 s in the test version), then saving the results.
const PROCESSING_LEASE_MS = 90_000;
const BUSY_WAIT_MS = 2_000;
// After a 429 the page waits this long before asking again.
const RATE_LIMIT_WAIT_MS = 60_000;

export async function submitReport(
  reportType: ReportType,
  input: ReportFields,
): Promise<SubmitReportResult> {
  // Messages in the visitor's language; the form shows them as they come.
  const t = await getMessages(reportMessages);

  // Only allow the two known types — never accept arbitrary client strings.
  if (reportType !== "lost" && reportType !== "found") {
    return { ok: false, message: t.saveFailed };
  }

  const fieldErrors = validateReportFields(input, {
    ...t,
    locationRequired: t.kinds[reportType].locationRequired,
  });

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: t.fixHighlighted, fieldErrors };
  }

  // Only the server can insert reports, so every report goes through this limit.
  const submission = await consumeReportSubmission(await currentIpKey());
  if (submission === "blocked") {
    return { ok: false, message: t.busy };
  }

  const reportId = randomUUID();
  const db = tryCreateDb();
  if (!db) {
    console.error("Report insert unavailable: database not configured");
    return { ok: false, message: t.saveFailed };
  }

  const { error } = await insertReport(db, {
    id: reportId,
    report_type: reportType,
    item_name: input.itemName.trim(),
    description: input.description.trim(),
    location: input.location.trim(),
  });

  if (error) {
    console.error("Failed to insert report:", error.code);
    return { ok: false, message: t.saveFailed };
  }

  const saved = { ok: true, message: t.savedContext };

  const credential = createSubmissionCredential();
  const { error: credentialError } = await insertSubmission(db, {
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

  const ipKey = await currentIpKey();
  const db = tryCreateDb();
  if (!db) {
    return { ok: true, status: { phase: "unavailable" } };
  }

  const loadStartedAt = performance.now();
  const { data: submission, error: submissionError } = await findSubmissionWithReport(
    db,
    hashSubmissionCredential(credential),
  );

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
  const otherType: ReportType = reportType === "lost" ? "found" : "lost";

  const nowIso = new Date().toISOString();
  const { data: lease, error: leaseError } = await claimMatchingLease(
    db,
    submission.report_id,
    new Date(Date.now() + PROCESSING_LEASE_MS).toISOString(),
    nowIso,
  );

  if (leaseError) {
    console.error("Failed to claim matching lease:", leaseError.code);
    return { ok: true, status: { phase: "failed" } };
  }
  const hasLease = (lease ?? []).length > 0;

  let remaining = 0;
  let failure: MatchingFailure | null = null;

  try {
    // Test mode: the sample found reports must exist before the first comparison.
    if (isSandboxMode()) {
      await ensureSampleReportsOnce(db);
    }
    const own = { side: reportType, reportId: report.id };
    const [otherResult, savedResult, checksResult] = await Promise.all([
      listMatchReports(db, otherType),
      listSuggestionKeys(db, own),
      listPairCheckKeys(db, own),
    ]);
    const loadMs = elapsedSince(loadStartedAt);

    const loadError = otherResult.error ?? savedResult.error ?? checksResult.error;
    if (loadError) {
      console.error("Matching (auto) failed to load data:", loadError.code, `${loadMs}ms`);
      // Only the call holding the lease would have run; a waiting call is not a run.
      if (hasLease) {
        await recordMatchingRun(
          db,
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
      if (!isGeminiConfigured()) {
        failure = "config";
      } else {
        const summary = await runWithUsageScope({ ipKey, reportId: report.id }, () =>
          runNewReportMatching({
            db,
            side: reportType,
            pairs,
            checkedKeys,
            loadMs,
          }),
        );
        remaining = summary.remaining;
        failure = summary.failure;
      }
    }
  } finally {
    if (hasLease) {
      const { error: releaseError } = await releaseMatchingLease(db, submission.report_id);
      if (releaseError) {
        console.error("Failed to release matching lease:", releaseError.code);
      }
    }
  }

  let hasMatch = false;
  let hasUncertain = false;
  if (reportType === "lost") {
    const { data: suggestions, error: suggestionsError } = await listSuggestionStatus(
      db,
      report.id,
    );
    if (suggestionsError) {
      console.error("Failed to load suggestion status:", suggestionsError.code);
      return { ok: true, status: { phase: "failed" } };
    }
    hasMatch = (suggestions ?? []).some((row) => row.ai_decision === "match");
    hasUncertain = hasUncertainSuggestion(suggestions ?? []);
  }

  const status = toPublicStatus({ reportType, remaining, failure, hasMatch, hasUncertain });
  if (status.phase === "rate_limited") {
    return { ok: true, status, waitMs: RATE_LIMIT_WAIT_MS };
  }
  const busy = !hasLease && status.phase === "checking";
  return busy ? { ok: true, status, waitMs: BUSY_WAIT_MS } : { ok: true, status };
}
