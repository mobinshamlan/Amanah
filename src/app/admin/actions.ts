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
  DECISION_NOTE_MAX,
  recordDecision,
  resetDecision,
  retryAssessment,
  type DecisionResult,
  type OwnershipDeps,
} from "@/utils/ownership/service";
import { createOwnershipDeps } from "@/utils/ownership/server";
import {
  createAdminClient,
  isLocalAdminEnabled,
} from "@/utils/supabase/admin";
import { getGeminiModel } from "@/utils/gemini/compareReports";
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

    const summary = await runMatchingPairs({
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
    });

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
  busy: "Gemini is busy (rate limit). The answers are saved. Try again in a few minutes.",
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
  const result = await retryAssessment(deps, verificationId);
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
