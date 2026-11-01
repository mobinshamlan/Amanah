import { createHash } from "node:crypto";

// Starting caps for a small institution prototype. One Gemini HTTP call counts
// as one use, including a batch of up to 10 comparisons. Raise these in this
// file if a shared network (one public IP for many people) hits them during
// normal use. They are not a Google Cloud billing budget.

export const GEMINI_APP_PER_DAY = 300;
export const GEMINI_IP_PER_DAY = 120;
export const GEMINI_REPORT_PER_DAY = 40;
export const REPORTS_PER_IP_PER_HOUR = 8;
export const REPORTS_PER_IP_PER_DAY = 30;

export const USAGE_LABELS = [
  "gemini_app",
  "gemini_ip",
  "gemini_report",
  "submit_hour",
  "submit_day",
] as const;

export type UsageLabel = (typeof USAGE_LABELS)[number];

export type UsageSlot = {
  label: UsageLabel;
  bucket: string;
  limit: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function utcDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function utcHour(now = new Date()) {
  return now.toISOString().slice(0, 13);
}

/** Stable bucket key. The raw address is not stored. */
export function hashClientIp(raw: string | null | undefined) {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || trimmed.length > 200) {
    return "unknown";
  }
  return createHash("sha256").update(trimmed).digest("hex").slice(0, 32);
}

export function isUsageReportId(value: string) {
  return UUID_PATTERN.test(value);
}

export function geminiSlots(scope: { ipKey: string; reportId: string }, now = new Date()): UsageSlot[] | null {
  if (!isUsageReportId(scope.reportId)) {
    return null;
  }
  const day = utcDay(now);
  const ipKey = scope.ipKey === "unknown" || /^[a-f0-9]{32}$/.test(scope.ipKey) ? scope.ipKey : "unknown";
  return [
    { label: "gemini_app", bucket: `gemini:app:${day}`, limit: GEMINI_APP_PER_DAY },
    { label: "gemini_ip", bucket: `gemini:ip:${ipKey}:${day}`, limit: GEMINI_IP_PER_DAY },
    {
      label: "gemini_report",
      bucket: `gemini:report:${scope.reportId}:${day}`,
      limit: GEMINI_REPORT_PER_DAY,
    },
  ];
}

export function submitSlots(ipKey: string, now = new Date()): UsageSlot[] {
  const key = ipKey === "unknown" || /^[a-f0-9]{32}$/.test(ipKey) ? ipKey : "unknown";
  return [
    {
      label: "submit_hour",
      bucket: `submit:ip:${key}:${utcHour(now)}`,
      limit: REPORTS_PER_IP_PER_HOUR,
    },
    {
      label: "submit_day",
      bucket: `submit:ip:${key}:${utcDay(now)}`,
      limit: REPORTS_PER_IP_PER_DAY,
    },
  ];
}
