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
import { getGeminiModel } from "@/utils/gemini/compareReports";
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
  if (!isLocalAdminEnabled()) {
    return { ok: false, message: "Not available." };
  }

  if (runInProgress) {
    return { ok: false, message: "A matching run is already in progress." };
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return {
      ok: false,
      message:
        "Gemini is not configured. Add GEMINI_API_KEY to .env.local, then restart the dev server.",
    };
  }

  runInProgress = true;

  try {
    const supabase = tryCreateAdminClient();
    if (!supabase) {
      return {
        ok: false,
        message:
          "Admin is not configured. Add SUPABASE_SECRET_KEY to .env.local, then restart the dev server.",
      };
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
      return { ok: false, message: "Could not load reports. Nothing was checked." };
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

const ASSESSMENT_RETRY_MESSAGES: Record<string, string> = {
  busy: "Amanah is busy right now. The answers are saved. Please try again later.",
  failed: "The AI assessment did not finish. The answers are saved. You can try again.",
  unavailable:
    "The AI assessment is not available. Check GEMINI_API_KEY and that the ownership migration is applied.",
  not_ready: "The owner has not answered every question yet.",
};

/** Retries a missing AI assessment. It is a recommendation only. */
export async function retryOwnershipAssessment(
  verificationId: string,
): Promise<OwnershipActionResult> {
  if (!isLocalAdminEnabled()) {
    return { ok: false, message: "Not available." };
  }
  if (typeof verificationId !== "string" || !UUID_PATTERN.test(verificationId)) {
    return { ok: false, message: "Unknown verification." };
  }
  const deps = createOwnershipDeps();
  if (!deps) {
    return { ok: false, message: ASSESSMENT_RETRY_MESSAGES.unavailable };
  }
  const result = await runWithUsageScope({ ipKey: await currentIpKey(), reportId: null }, () =>
    retryAssessment(deps, verificationId),
  );
  revalidatePath("/admin");
  if (result === "saved" || result === "already_assessed") {
    return { ok: true };
  }
  return { ok: false, message: ASSESSMENT_RETRY_MESSAGES[result] };
}

const DECISION_MESSAGES: Record<Exclude<DecisionResult, "saved" | "invalid">, string> = {
  already_decided:
    "This claim already has a decision. Reset it to pending review first.",
  not_decided: "This claim is already pending review.",
  changed:
    "Another staff action was saved for this claim first. The page has been refreshed; check it and try again.",
  failed: "The decision could not be saved. Please try again.",
};

/** Shared checks for staff decision actions (local admin only). */
function decisionDeps(
  verificationId: unknown,
): { ok: true; deps: OwnershipDeps } | { ok: false; message: string } {
  if (!isLocalAdminEnabled()) {
    return { ok: false, message: "Not available." };
  }
  if (typeof verificationId !== "string" || !UUID_PATTERN.test(verificationId)) {
    return { ok: false, message: "Unknown verification." };
  }
  const deps = createOwnershipDeps();
  if (!deps) {
    return {
      ok: false,
      message:
        "Admin is not configured. Add SUPABASE_SECRET_KEY to .env.local, then restart the dev server.",
    };
  }
  return { ok: true, deps };
}

function decisionResult(result: DecisionResult, invalidMessage: string): OwnershipActionResult {
  if (result === "saved") {
    return { ok: true };
  }
  return { ok: false, message: result === "invalid" ? invalidMessage : DECISION_MESSAGES[result] };
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
  const checked = decisionDeps(verificationId);
  if (!checked.ok) {
    return checked;
  }
  const result = await recordDecision(checked.deps, verificationId, decision, note);
  revalidatePath("/admin");
  return decisionResult(
    result,
    `Choose approve or reject, and keep the note under ${DECISION_NOTE_MAX} characters.`,
  );
}

/**
 * Resets an approved or rejected decision back to pending review. The earlier
 * decision and this reset both stay in the private decision log.
 */
export async function resetOwnershipDecision(
  verificationId: string,
  note: string,
): Promise<OwnershipActionResult> {
  const checked = decisionDeps(verificationId);
  if (!checked.ok) {
    return checked;
  }
  const result = await resetDecision(checked.deps, verificationId, note);
  revalidatePath("/admin");
  return decisionResult(result, `Keep the reason under ${DECISION_NOTE_MAX} characters.`);
}

const FOLLOWUP_MESSAGES: Record<Exclude<FollowupResult, "saved" | "invalid">, string> = {
  already_asked: "A follow-up question was already asked on this claim. Only one is allowed.",
  already_decided: "This claim already has a decision, so a follow-up can no longer be asked.",
  not_set_up: "Follow-up questions are not set up yet. Apply the ownership_followups migration, then refresh.",
  failed: "The follow-up question could not be saved. Please try again.",
};

/**
 * Staff asks one optional follow-up question on an undecided claim. The owner
 * sees it on their private tracking page. It never approves or rejects the
 * claim, and no AI is used.
 */
export async function askOwnershipFollowup(
  verificationId: string,
  question: string,
): Promise<OwnershipActionResult> {
  const checked = decisionDeps(verificationId);
  if (!checked.ok) {
    return checked;
  }
  const result = await askFollowup(checked.deps, verificationId, question);
  revalidatePath("/admin");
  if (result === "saved") {
    return { ok: true };
  }
  return {
    ok: false,
    message:
      result === "invalid"
        ? `Write a question of up to ${FOLLOWUP_QUESTION_MAX} characters.`
        : FOLLOWUP_MESSAGES[result],
  };
}

function candidateGate() {
  const gate = staffReviewGate(isLocalAdminEnabled());
  if (!gate.ok) {
    return gate;
  }
  const admin = tryCreateAdminClient();
  if (!admin) {
    return { ok: false as const, message: "Admin is not configured." };
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
  const checked = candidateGate();
  if (!checked.ok) {
    return checked;
  }
  if (!isUuid(lostReportId) || !isUuid(foundReportId) || lostReportId === foundReportId) {
    return { ok: false, message: "That pair is not in the candidate list." };
  }
  if (action !== "ownership_review" && action !== "dismissed") {
    return { ok: false, message: "Choose ownership review or not the same item." };
  }
  const parsedNote = candidateNote(note);
  if (!parsedNote.ok) {
    return { ok: false, message: `Keep the note under ${CANDIDATE_NOTE_MAX} characters.` };
  }

  const existing = await checked.admin
    .from("report_matches")
    .select("id")
    .eq("lost_report_id", lostReportId)
    .eq("found_report_id", foundReportId)
    .maybeSingle();
  if (existing.error) {
    console.error("Candidate: lookup failed", existing.error.code);
    return { ok: false, message: "The review could not be saved. Please try again." };
  }
  if (!existing.data) {
    return { ok: false, message: "That pair is not in the candidate list." };
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
      return {
        ok: false,
        message: "Candidate reviews are not set up yet. Apply the report_candidate_reviews migration locally, then refresh.",
      };
    }
    return { ok: false, message: "The review could not be saved. Please try again." };
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
  const checked = candidateGate();
  if (!checked.ok) {
    return checked;
  }
  if (!isUuid(lostReportId) || !isUuid(foundReportId) || lostReportId === foundReportId) {
    return { ok: false, message: "Choose one lost report and one found report." };
  }
  const parsedNote = candidateNote(note);
  if (!parsedNote.ok) {
    return { ok: false, message: `Keep the note under ${CANDIDATE_NOTE_MAX} characters.` };
  }

  const loaded = await checked.admin
    .from("reports")
    .select("id, report_type, item_name, description, location")
    .in("id", [lostReportId, foundReportId]);
  if (loaded.error) {
    console.error("Candidate: reports failed", loaded.error.code);
    return { ok: false, message: "The candidate could not be saved. Please try again." };
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
    return { ok: false, message: "Choose one lost report and one found report." };
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
      return { ok: false, message: "This pair is already saved." };
    }
    return { ok: false, message: "The candidate could not be saved. Please try again." };
  }

  console.info("Candidate: manual pair saved");
  revalidatePath("/admin");
  return { ok: true };
}
