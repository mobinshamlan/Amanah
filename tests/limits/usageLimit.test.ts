import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toPublicStatus } from "@/utils/matching/publicStatus";
import { GeminiUsageLimitError, assertGeminiUsageAllowed } from "@/utils/limits/usageLimit";
import { runWithUsageScope } from "@/utils/limits/usageScope";
import {
  geminiSlots,
  hashClientIp,
  submitSlots,
  utcDay,
} from "@/utils/limits/usageBuckets";

const NOW = new Date("2026-11-01T13:05:00.000Z");
const REPORT_ID = "11111111-1111-4111-8111-111111111111";

describe("usage buckets", () => {
  it("hashes an address and does not keep the raw value", () => {
    const raw = "203.0.113.10";
    const key = hashClientIp(raw);
    assert.equal(key.length, 32);
    assert.equal(key.includes(raw), false);
    assert.equal(hashClientIp("   "), "unknown");
    assert.equal(hashClientIp(raw), key);
  });

  it("counts one Gemini call against the app, the IP, and the report", () => {
    const slots = geminiSlots({ ipKey: "ab".repeat(16), reportId: REPORT_ID }, NOW);
    assert.ok(slots);
    assert.deepEqual(
      slots.map((slot) => slot.label),
      ["gemini_app", "gemini_ip", "gemini_report"],
    );
    assert.equal(slots[0].bucket, `gemini:app:${utcDay(NOW)}`);
    assert.equal(slots[2].bucket.includes(REPORT_ID), true);
    assert.equal(slots.some((slot) => slot.bucket.includes("203.0.113.10")), false);
  });

  it("rejects a report id that is not a UUID before any database call", () => {
    assert.equal(geminiSlots({ ipKey: "unknown", reportId: "demo-lost-01" }, NOW), null);
  });

  it("limits report submits by hour and by day for the same hashed IP", () => {
    const slots = submitSlots("unknown", NOW);
    assert.deepEqual(
      slots.map((slot) => slot.label),
      ["submit_hour", "submit_day"],
    );
    assert.equal(slots[0].bucket, "submit:ip:unknown:2026-11-01T13");
    assert.equal(slots[1].bucket, "submit:ip:unknown:2026-11-01");
  });
});

describe("gemini usage guard", () => {
  it("blocks before Gemini when the request has no report scope", async () => {
    await assert.rejects(assertGeminiUsageAllowed(), GeminiUsageLimitError);
  });

  it("blocks a non-UUID report without calling the database", async () => {
    await assert.rejects(
      runWithUsageScope({ ipKey: "unknown", reportId: "not-a-report" }, () =>
        assertGeminiUsageAllowed(),
      ),
      GeminiUsageLimitError,
    );
  });
});

describe("public matching status", () => {
  it("shows an app usage limit as busy, not as no match", () => {
    assert.deepEqual(
      toPublicStatus({
        reportType: "lost",
        remaining: 4,
        failure: "usage_limit",
        hasMatch: false,
        hasUncertain: false,
      }),
      { phase: "rate_limited" },
    );
  });
});
