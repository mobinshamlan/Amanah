"use server";

import { revalidatePath } from "next/cache";
import {
  buildPairs,
  type MatchReport,
  type MatchingRunSummary,
} from "@/utils/matching/runMatchingBatch";
import {
  checkedKeysFrom,
  elapsedSince,
  REPORT_COLUMNS,
  runMatchingPairs,
} from "@/utils/matching/serverMatching";
import {
  askFollowup,
  DECISION_NOTE_MAX,
  FOLLOWUP_QUESTION_MAX,
  recordDecision,
  resetDecision,
  retryAssessment,
  type DecisionResult,
  type FollowupResult,
  type OwnershipDeps,
} from "@/utils/ownership/service";
import { createOwnershipDeps } from "@/utils/ownership/server";
import {
  createAdminClient,
  isLocalAdminEnabled,
} from "@/utils/supabase/admin";
import { getGeminiModel, isGeminiConfigured } from "@/utils/gemini/compareReports";
import { currentIpKey } from "@/utils/limits/clientIp";
import { runWithUsageScope } from "@/utils/limits/usageScope";
import {
  CANDIDATE_NOTE_MAX,
  candidateNote,
  manualCandidateInsert,
  staffReviewGate,
  type CandidateReport,
} from "@/utils/matching/candidates";
import { loadFailureRow, recordMatchingRun } from "@/utils/monitoring/runLog";
import { getMessages } from "@/i18n/server";
import { adminTools, type AdminToolsMessages } from "@/i18n/messages/admin-tools";

// Every message returned to the browser comes from the staff-tools catalogue in
// the visitor's language. Validation, limits and access checks are unchanged.
function messages() {
  return getMessages(adminTools);
}

export type RunMatchingResult =
  | { ok: true; summary: MatchingRunSummary }
  | { ok: false; message: string };

let runInProgress = false;

function tryCreateAdminClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

export async function runMatching(): Promise<RunMatchingResult> {
  const t = (await messages()).actions;
  if (!isLocalAdminEnabled()) {
    return { ok: false, message: t.notAvailable };
  }

  if (runInProgress) {
    return { ok: false, message: t.runInProgress };
  }

  if (!isGeminiConfigured()) {
    return { ok: false, message: t.geminiNotConfigured };
  }

  runInProgress = true;

  try {
    const supabase = tryCreateAdminClient();
    if (!supabase) {
      return { ok: false, message: t.adminNotConfigured };
    }

    const loadStartedAt = performance.now();
    const [lostResult, foundResult, savedResult, checksResult] = await Promise.all([
      supabase.from("reports").select(REPORT_COLUMNS).eq("report_type", "lost"),
      supabase.from("reports").select(REPORT_COLUMNS).eq("report_type", "found"),
      supabase.from("report_matches").select("lost_report_id, found_report_id"),
      supabase.from("report_pair_checks").select("lost_report_id, found_report_id"),
    ]);
    const loadMs = elapsedSince(loadStartedAt);

    const loadError =
      lostResult.error ?? foundResult.error ?? savedResult.error ?? checksResult.error;
    if (loadError) {
      console.error("Failed to load matching data:", loadError.code, `${loadMs}ms`);
      await recordMatchingRun(
        supabase,
        loadFailureRow("admin", { durationMs: loadMs, model: getGeminiModel() }),
      );
      return { ok: false, message: t.loadFailed };
    }

    const summary = await runWithUsageScope({ ipKey: await currentIpKey(), reportId: null }, () =>
      runMatchingPairs({
        supabase,
        pairs: buildPairs(
          (lostResult.data ?? []) as MatchReport[],
          (foundResult.data ?? []) as MatchReport[],
        ),
        checkedKeys: checkedKeysFrom([
          ...(savedResult.data ?? []),
          ...(checksResult.data ?? []),
        ]),
        source: "admin",
        loadMs,
      }),
    );

    revalidatePath("/admin");
    return { ok: true, summary };
  } finally {
    runInProgress = false;
  }
}

export type OwnershipActionResult = { ok: true } | { ok: false; message: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Retries a missing AI assessment. It is a recommendation only. */
export async function retryOwnershipAssessment(
  verificationId: string,
): Promise<OwnershipActionResult> {
  const t = (await messages()).actions;
  if (!isLocalAdminEnabled()) {
    return { ok: false, message: t.notAvailable };
  }
  if (typeof verificationId !== "string" || !UUID_PATTERN.test(verificationId)) {
    return { ok: false, message: t.unknownVerification };
  }
  const deps = createOwnershipDeps();
  if (!deps) {
    return { ok: false, message: t.retry.unavailable };
  }
  const result = await runWithUsageScope({ ipKey: await currentIpKey(), reportId: null }, () =>
    retryAssessment(deps, verificationId),
  );
  revalidatePath("/admin");
  if (result === "saved" || result === "already_assessed") {
    return { ok: true };
  }
  return { ok: false, message: t.retry[result] };
}

/** Shared checks for staff decision actions (local admin only). */
function decisionDeps(
  verificationId: unknown,
  t: AdminToolsMessages["actions"],
): { ok: true; deps: OwnershipDeps } | { ok: false; message: string } {
  if (!isLocalAdminEnabled()) {
    return { ok: false, message: t.notAvailable };
  }
  if (typeof verificationId !== "string" || !UUID_PATTERN.test(verificationId)) {
    return { ok: false, message: t.unknownVerification };
  }
  const deps = createOwnershipDeps();
  if (!deps) {
    return { ok: false, message: t.adminNotConfigured };
  }
  return { ok: true, deps };
}

function decisionResult(
  result: DecisionResult,
  invalidMessage: string,
  t: AdminToolsMessages["actions"],
): OwnershipActionResult {
  if (result === "saved") {
    return { ok: true };
  }
  return { ok: false, message: result === "invalid" ? invalidMessage : t.decision[result] };
}

/**
 * Saves a staff decision while the claim is pending review. Approval means
 * staff may proceed with ownership follow-up; it does not return the item
 * automatically. A decision can be reset to pending review.
 */
export async function decideOwnership(
  verificationId: string,
  decision: string,
  note: string,
): Promise<OwnershipActionResult> {
  const t = (await messages()).actions;
  const checked = decisionDeps(verificationId, t);
  if (!checked.ok) {
    return checked;
  }
  const result = await recordDecision(checked.deps, verificationId, decision, note);
  revalidatePath("/admin");
  return decisionResult(result, t.decisionInvalid(DECISION_NOTE_MAX), t);
}

/**
 * Resets an approved or rejected decision back to pending review. The earlier
 * decision and this reset both stay in the private decision log.
 */
export async function resetOwnershipDecision(
  verificationId: string,
  note: string,
): Promise<OwnershipActionResult> {
  const t = (await messages()).actions;
  const checked = decisionDeps(verificationId, t);
  if (!checked.ok) {
    return checked;
  }
  const result = await resetDecision(checked.deps, verificationId, note);
  revalidatePath("/admin");
  return decisionResult(result, t.resetInvalid(DECISION_NOTE_MAX), t);
}

/**
 * Staff asks one optional follow-up question on an undecided claim. The owner
 * sees it on their private tracking page. It never approves or rejects the
 * claim, and no AI is used.
 */
export async function askOwnershipFollowup(
  verificationId: string,
  question: string,
): Promise<OwnershipActionResult> {
  const t = (await messages()).actions;
  const checked = decisionDeps(verificationId, t);
  if (!checked.ok) {
    return checked;
  }
  const result: FollowupResult = await askFollowup(checked.deps, verificationId, question);
  revalidatePath("/admin");
  if (result === "saved") {
    return { ok: true };
  }
  return {
    ok: false,
    message:
      result === "invalid" ? t.followupInvalid(FOLLOWUP_QUESTION_MAX) : t.followup[result],
  };
}

function candidateGate(t: AdminToolsMessages["actions"]) {
  const gate = staffReviewGate(isLocalAdminEnabled());
  if (!gate.ok) {
    return { ok: false as const, message: t.notAvailable };
  }
  const admin = tryCreateAdminClient();
  if (!admin) {
    return { ok: false as const, message: t.adminNotConfiguredShort };
  }
  return { ok: true as const, admin };
}

function isUuid(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function missingCandidateTable(code: string | undefined) {
  return code === "PGRST205" || code === "42P01";
}

/**
 * Records a staff look at one saved pair. Worth ownership review does not start
 * questions or approve a handover. Dismissed means it is not the same item.
 * The saved AI decision is left unchanged.
 */
export async function reviewCandidate(
  lostReportId: string,
  foundReportId: string,
  action: string,
  note: string,
): Promise<OwnershipActionResult> {
  const t = (await messages()).actions;
  const checked = candidateGate(t);
  if (!checked.ok) {
    return checked;
  }
  if (!isUuid(lostReportId) || !isUuid(foundReportId) || lostReportId === foundReportId) {
    return { ok: false, message: t.candidateNotListed };
  }
  if (action !== "ownership_review" && action !== "dismissed") {
    return { ok: false, message: t.candidateAction };
  }
  const parsedNote = candidateNote(note);
  if (!parsedNote.ok) {
    return { ok: false, message: t.candidateNoteTooLong(CANDIDATE_NOTE_MAX) };
  }

  const existing = await checked.admin
    .from("report_matches")
    .select("id")
    .eq("lost_report_id", lostReportId)
    .eq("found_report_id", foundReportId)
    .maybeSingle();
  if (existing.error) {
    console.error("Candidate: lookup failed", existing.error.code);
    return { ok: false, message: t.candidateReviewFailed };
  }
  if (!existing.data) {
    return { ok: false, message: t.candidateNotListed };
  }

  const inserted = await checked.admin.from("report_candidate_reviews").insert({
    lost_report_id: lostReportId,
    found_report_id: foundReportId,
    action,
    note: parsedNote.note,
  });
  if (inserted.error) {
    console.error("Candidate: review failed", inserted.error.code);
    if (missingCandidateTable(inserted.error.code)) {
      return { ok: false, message: t.candidateReviewsNotSetUp };
    }
    return { ok: false, message: t.candidateReviewFailed };
  }

  console.info(`Candidate: ${action} saved`);
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Staff add a lost report and a found report as a candidate. No AI call.
 * The row is stored as not enough information, not as a confirmed match.
 */
export async function createCandidate(
  lostReportId: string,
  foundReportId: string,
  note: string,
): Promise<OwnershipActionResult> {
  const t = (await messages()).actions;
  const checked = candidateGate(t);
  if (!checked.ok) {
    return checked;
  }
  if (!isUuid(lostReportId) || !isUuid(foundReportId) || lostReportId === foundReportId) {
    return { ok: false, message: t.candidateChooseBoth };
  }
  const parsedNote = candidateNote(note);
  if (!parsedNote.ok) {
    return { ok: false, message: t.candidateNoteTooLong(CANDIDATE_NOTE_MAX) };
  }

  const loaded = await checked.admin
    .from("reports")
    .select("id, report_type, item_name, description, location")
    .in("id", [lostReportId, foundReportId]);
  if (loaded.error) {
    console.error("Candidate: reports failed", loaded.error.code);
    return { ok: false, message: t.candidateCreateFailed };
  }
  const rows = (loaded.data ?? []) as {
    id: string;
    report_type: string;
    item_name: string;
    description: string;
    location: string;
  }[];
  const lost = rows.find((row) => row.id === lostReportId && row.report_type === "lost");
  const found = rows.find((row) => row.id === foundReportId && row.report_type === "found");
  if (!lost || !found) {
    return { ok: false, message: t.candidateChooseBoth };
  }

  const lostReport: CandidateReport = {
    item_name: lost.item_name,
    description: lost.description,
    location: lost.location,
  };
  const foundReport: CandidateReport = {
    item_name: found.item_name,
    description: found.description,
    location: found.location,
  };
  const inserted = await checked.admin.from("report_matches").insert({
    lost_report_id: lostReportId,
    found_report_id: foundReportId,
    ...manualCandidateInsert(lostReport, foundReport, parsedNote.note),
  });
  if (inserted.error) {
    console.error("Candidate: create failed", inserted.error.code);
    if (inserted.error.code === "23505") {
      return { ok: false, message: t.candidateDuplicate };
    }
    return { ok: false, message: t.candidateCreateFailed };
  }

  console.info("Candidate: manual pair saved");
  revalidatePath("/admin");
  return { ok: true };
}
