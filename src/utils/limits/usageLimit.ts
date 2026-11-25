import { createDb } from "@/utils/db/client";
import { consumeUsage } from "@/utils/db/queries";
import { isFixtureMode } from "@/utils/fixtures/mode";
import {
  geminiSlots,
  submitSlots,
  type UsageLabel,
  type UsageSlot,
} from "@/utils/limits/usageBuckets";
import { currentUsageScope } from "@/utils/limits/usageScope";

export class GeminiUsageLimitError extends Error {
  constructor() {
    super("Gemini usage limit reached.");
    this.name = "GeminiUsageLimitError";
  }
}

type ConsumeResult = { ok: true } | { ok: false; label: UsageLabel | "unavailable" | "missing_scope" };

function blockedLabel(value: unknown): UsageLabel | "unavailable" {
  if (
    value === "gemini_app" ||
    value === "gemini_ip" ||
    value === "gemini_report" ||
    value === "submit_hour" ||
    value === "submit_day"
  ) {
    return value;
  }
  return "unavailable";
}

/**
 * Takes one slot from each bucket in one database call, or takes none.
 * Fails closed when the counter function is missing or the database errors.
 */
async function consumeSlots(slots: UsageSlot[]): Promise<ConsumeResult> {
  // Development fixture mode: usage limits always allow and nothing is counted.
  if (isFixtureMode()) {
    return slots.length >= 1 && slots.length <= 6 ? { ok: true } : { ok: false, label: "unavailable" };
  }

  let db;
  try {
    db = createDb();
  } catch {
    console.error("Usage: unavailable database");
    return { ok: false, label: "unavailable" };
  }

  const { data, error } = await consumeUsage(
    db,
    slots.map((slot) => slot.bucket),
    slots.map((slot) => slot.limit),
    slots.map((slot) => slot.label),
  );

  if (error) {
    console.error("Usage: unavailable", error.code ?? "unknown");
    return { ok: false, label: "unavailable" };
  }
  if (data === "ok") {
    return { ok: true };
  }
  return { ok: false, label: blockedLabel(data) };
}

/** Call immediately before any Gemini request. Does not call Gemini. */
export async function assertGeminiUsageAllowed() {
  const scope = currentUsageScope();
  const reportId = scope?.reportId;
  if (!scope || !reportId) {
    console.info("Usage: blocked missing_scope");
    throw new GeminiUsageLimitError();
  }
  const slots = geminiSlots({ ipKey: scope.ipKey, reportId });
  if (!slots) {
    console.info("Usage: blocked missing_scope");
    throw new GeminiUsageLimitError();
  }
  const result = await consumeSlots(slots);
  if (!result.ok) {
    console.info(`Usage: blocked ${result.label}`);
    throw new GeminiUsageLimitError();
  }
  console.info("Usage: gemini allowed");
}

/** Call before inserting a report. Does not insert the report. */
export async function consumeReportSubmission(ipKey: string): Promise<"ok" | "blocked"> {
  const result = await consumeSlots(submitSlots(ipKey));
  if (!result.ok) {
    console.info(`Usage: blocked ${result.label}`);
    return "blocked";
  }
  console.info("Usage: submit allowed");
  return "ok";
}
