"use server";

import { revalidatePath } from "next/cache";
import {
  compareLostAndFoundReports,
  GeminiApiError,
  GeminiConfigError,
  GeminiInvalidResponseError,
  getGeminiModel,
  type GeminiAttempt,
} from "@/utils/gemini/compareReports";
import {
  buildPairs,
  MATCHING_BATCH_SIZE,
  pairKey,
  runMatchingBatch,
  type CompareOutcome,
  type ComparisonDetails,
  type MatchReport,
  type MatchingFailure,
  type MatchingRunSummary,
  type ReportPair,
  type SaveOutcome,
} from "@/utils/matching/runMatchingBatch";
import {
  createAdminClient,
  isLocalAdminEnabled,
} from "@/utils/supabase/admin";

export type RunMatchingResult =
  | { ok: true; summary: MatchingRunSummary }
  | { ok: false; message: string };

const REPORT_COLUMNS = "id, item_name, description, location, created_at";

let runInProgress = false;

function tryCreateAdminClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

function failureKind(error: unknown): MatchingFailure {
  if (error instanceof GeminiConfigError) {
    return "config";
  }
  if (error instanceof GeminiApiError) {
    if (error.isQuota) {
      return "quota";
    }
    return error.isTimeout ? "timeout" : "api";
  }
  if (error instanceof GeminiInvalidResponseError) {
    return "invalid_response";
  }
  return "api";
}

function elapsedSince(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}

function formatAttempts(attempts: GeminiAttempt[]) {
  return attempts.map((attempt) => `${attempt.ms}ms/${attempt.status}`).join(",") || "none";
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

    const runStartedAt = performance.now();
    const [lostResult, foundResult, savedResult, checksResult] = await Promise.all([
      supabase.from("reports").select(REPORT_COLUMNS).eq("report_type", "lost"),
      supabase.from("reports").select(REPORT_COLUMNS).eq("report_type", "found"),
      supabase.from("report_matches").select("lost_report_id, found_report_id"),
      supabase.from("report_pair_checks").select("lost_report_id, found_report_id"),
    ]);
    const loadMs = elapsedSince(runStartedAt);

    const loadError =
      lostResult.error ?? foundResult.error ?? savedResult.error ?? checksResult.error;
    if (loadError) {
      console.error("Failed to load matching data:", loadError.code, `${loadMs}ms`);
      return { ok: false, message: "Could not load reports. Nothing was checked." };
    }

    const pairs = buildPairs(
      (lostResult.data ?? []) as MatchReport[],
      (foundResult.data ?? []) as MatchReport[],
    );
    const checkedKeys = new Set(
      [...(savedResult.data ?? []), ...(checksResult.data ?? [])].map((row) =>
        pairKey(row.lost_report_id, row.found_report_id),
      ),
    );
    const model = getGeminiModel();

    let pairNumber = 0;
    let saveMs = 0;
    let geminiMs = 0;

    const compareWithGemini = async (pair: ReportPair): Promise<CompareOutcome> => {
      pairNumber += 1;
      const attempts: GeminiAttempt[] = [];
      const startedAt = performance.now();
      try {
        const result = await compareLostAndFoundReports(
          {
            itemName: pair.lost.item_name,
            description: pair.lost.description,
            location: pair.lost.location,
          },
          {
            itemName: pair.found.item_name,
            description: pair.found.description,
            location: pair.found.location,
          },
          { onAttempt: (attempt) => attempts.push(attempt) },
        );
        const ms = elapsedSince(startedAt);
        geminiMs += ms;
        console.info(
          `Matching pair ${pairNumber}: gemini=${ms}ms attempts=${formatAttempts(attempts)} decision=${result.decision}`,
        );
        return { ok: true, result };
      } catch (error) {
        const ms = elapsedSince(startedAt);
        geminiMs += ms;
        const failure = failureKind(error);
        console.error(
          `Matching pair ${pairNumber} failed: gemini=${ms}ms attempts=${formatAttempts(attempts)} failure=${failure}`,
        );
        return { ok: false, failure };
      }
    };

    const timedInsert = async (
      table: "report_matches" | "report_pair_checks",
      row: Record<string, unknown>,
    ): Promise<SaveOutcome> => {
      const startedAt = performance.now();
      const { error } = await supabase.from(table).insert(row);
      const ms = elapsedSince(startedAt);
      saveMs += ms;
      if (!error) {
        return "saved";
      }
      if (error.code === "23505") {
        return "duplicate";
      }
      console.error(`Failed to save to ${table}:`, error.code, `${ms}ms`);
      return "error";
    };

    const saveMatch = (pair: ReportPair, result: ComparisonDetails) =>
      timedInsert("report_matches", {
        lost_report_id: pair.lost.id,
        found_report_id: pair.found.id,
        explanation: result.reason,
        model,
        ai_decision: result.decision,
        supporting_details: result.supportingDetails,
        contradictions: result.contradictions,
        missing_information: result.missingInformation,
        ai_similarity_score: result.similarityScore,
      });

    const recordCheck = (pair: ReportPair, result: ComparisonDetails) =>
      timedInsert("report_pair_checks", {
        lost_report_id: pair.lost.id,
        found_report_id: pair.found.id,
        ai_decision: result.decision,
        model,
      });

    const summary = await runMatchingBatch({
      pairs,
      checkedKeys,
      batchSize: MATCHING_BATCH_SIZE,
      compare: compareWithGemini,
      saveMatch,
      recordCheck,
    });

    console.info(
      `Matching run finished in ${elapsedSince(runStartedAt)}ms:`,
      `load=${loadMs}ms gemini=${geminiMs}ms saves=${saveMs}ms`,
      `checked=${summary.checked} matched=${summary.matched} uncertain=${summary.uncertain}`,
      `no_match=${summary.noMatch} failed=${summary.failed} already_saved=${summary.alreadySaved}`,
      `remaining=${summary.remaining} failure=${summary.failure ?? "none"}`,
      `stopped_for_time=${summary.stoppedForTime}`,
    );

    revalidatePath("/admin");
    return { ok: true, summary };
  } finally {
    runInProgress = false;
  }
}
