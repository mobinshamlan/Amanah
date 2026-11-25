import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MatchingRunSummary } from "@/utils/matching/runMatchingBatch";
import {
  loadFailureRow,
  recordMatchingRun,
  toRunRow,
} from "@/utils/monitoring/runLog";
import type { Sql } from "@/utils/db/sql";

// Controlled tests only: a fake database, no real one.

const SUMMARY: MatchingRunSummary = {
  checked: 3,
  matched: 1,
  uncertain: 0,
  noMatch: 2,
  failed: 1,
  alreadySaved: 0,
  remaining: 5,
  failure: "timeout",
  stoppedForTime: false,
};

const ALLOWED_COLUMNS = [
  "already_saved",
  "checked",
  "duration_ms",
  "failed",
  "failure",
  "matched",
  "model",
  "no_match",
  "remaining",
  "requests",
  "source",
  "stopped_for_time",
  "uncertain",
];

// A stand-in for the database: records each statement, then succeeds or fails.
function fakeClient(result: { error: { code?: string } | null } | Error) {
  const inserted: { text: string; params: unknown[] }[] = [];
  const client: Sql = {
    async query<T>(text: string, params: unknown[] = []) {
      inserted.push({ text, params });
      if (result instanceof Error) {
        throw result;
      }
      if (result.error) {
        throw Object.assign(new Error("database error with secret details"), result.error);
      }
      return [] as T[];
    },
  };
  return { client, inserted };
}

const silent = { error() {} };

describe("toRunRow", () => {
  it("stores only aggregate fields", () => {
    const row = toRunRow("admin", SUMMARY, { durationMs: 4321.6, requests: 4, model: "gemini-test" });
    assert.deepEqual(Object.keys(row).sort(), ALLOWED_COLUMNS);
    assert.deepEqual(row, {
      source: "admin",
      duration_ms: 4322,
      requests: 4,
      checked: 3,
      matched: 1,
      uncertain: 0,
      no_match: 2,
      failed: 1,
      already_saved: 0,
      remaining: 5,
      failure: "timeout",
      stopped_for_time: false,
      model: "gemini-test",
    });
  });

  it("keeps a failed run's unchecked pairs separate from no match", () => {
    const row = toRunRow(
      "auto",
      { ...SUMMARY, checked: 0, noMatch: 0, matched: 0, failure: "invalid_response", remaining: 10 },
      { durationMs: 30_000, requests: 1, model: "gemini-test" },
    );
    assert.equal(row.no_match, 0);
    assert.equal(row.remaining, 10);
    assert.equal(row.failure, "invalid_response");
  });

  it("clamps bad numbers and long model names", () => {
    const row = toRunRow(
      "admin",
      { ...SUMMARY, checked: -1, remaining: Number.NaN },
      { durationMs: -5, requests: Number.POSITIVE_INFINITY, model: "m".repeat(150) },
    );
    assert.equal(row.checked, 0);
    assert.equal(row.remaining, 0);
    assert.equal(row.duration_ms, 0);
    assert.equal(row.requests, 0);
    assert.equal(row.model.length, 100);
  });

  it("records a load failure with unknown remaining pairs", () => {
    assert.deepEqual(loadFailureRow("auto", { durationMs: 812, model: "gemini-test" }), {
      source: "auto",
      duration_ms: 812,
      requests: 0,
      checked: 0,
      matched: 0,
      uncertain: 0,
      no_match: 0,
      failed: 0,
      already_saved: 0,
      remaining: null,
      failure: "load",
      stopped_for_time: false,
      model: "gemini-test",
    });
  });
});

describe("recordMatchingRun", () => {
  const row = toRunRow("admin", SUMMARY, { durationMs: 100, requests: 1, model: "gemini-test" });

  it("inserts into matching_runs", async () => {
    const { client, inserted } = fakeClient({ error: null });
    assert.equal(await recordMatchingRun(client, row, silent), true);
    assert.equal(inserted.length, 1);
    assert.match(inserted[0].text, /insert into public\.matching_runs/);
    assert.deepEqual(inserted[0].params, [
      row.source,
      row.duration_ms,
      row.requests,
      row.checked,
      row.matched,
      row.uncertain,
      row.no_match,
      row.failed,
      row.already_saved,
      row.remaining,
      row.failure,
      row.stopped_for_time,
      row.model,
    ]);
  });

  it("never throws when saving fails, and logs only the error code", async () => {
    const messages: unknown[][] = [];
    const logger = { error: (...args: unknown[]) => messages.push(args) };

    const denied = fakeClient({ error: { code: "42501" } });
    assert.equal(await recordMatchingRun(denied.client, row, logger), false);

    const broken = fakeClient(new Error("network down with secret details"));
    assert.equal(await recordMatchingRun(broken.client, row, logger), false);

    assert.deepEqual(messages, [
      ["Monitoring: failed to record matching run:", "42501"],
      // An error without a Postgres code (a network failure) is logged as "unknown".
      ["Monitoring: failed to record matching run:", "unknown"],
    ]);
  });

  it("stays quiet before the migration is applied", async () => {
    const messages: unknown[][] = [];
    const logger = { error: (...args: unknown[]) => messages.push(args) };
    for (const code of ["42P01"]) {
      const missing = fakeClient({ error: { code } });
      assert.equal(await recordMatchingRun(missing.client, row, logger), false);
    }
    assert.deepEqual(messages, []);
  });
});
