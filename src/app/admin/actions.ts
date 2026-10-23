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
  createAdminClient,
  isLocalAdminEnabled,
} from "@/utils/supabase/admin";

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
