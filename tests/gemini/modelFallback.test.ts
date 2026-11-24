import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { GoogleGenAIRequestOptions } from "@google/genai";
import {
  DEFAULT_GEMINI_FALLBACK_MODEL,
  FAST_RETRY,
  GEMINI_REQUEST_OPTIONS,
  GeminiApiError,
  GeminiInvalidResponseError,
  getGeminiFallbackModel,
  withModelFallback,
} from "@/utils/gemini/compareReports";
import { assessOwnershipAnswers, type JsonRequest } from "@/utils/gemini/ownershipVerification";
import { FOUND, LOST } from "../ownership/memoryStore";

// Controlled tests only: the request is a fake, Gemini is never called live.

type Call = { model: string; options: GoogleGenAIRequestOptions; fallback: boolean };

function fakeSend(fail: (model: string) => Error | null) {
  const calls: Call[] = [];
  const send = async (model: string, options: GoogleGenAIRequestOptions, fallback: boolean) => {
    calls.push({ model, options, fallback });
    const error = fail(model);
    if (error) {
      throw error;
    }
    return { answeredBy: model };
  };
  return { send, calls };
}

// No waiting in tests: retries start at once, hedging is off unless a test turns it on.
const quick = { ...FAST_RETRY, pauseMs: 0, hedgeAfterMs: 60_000 };
const options = {
  requestOptions: GEMINI_REQUEST_OPTIONS,
  model: "main",
  fallbackModel: "backup",
  retry: quick,
};

describe("withModelFallback (fast retries)", () => {
  it("retries a busy answer at once on the other model", async () => {
    const { send, calls } = fakeSend((model) =>
      model === "main" ? new GeminiApiError("busy", 503) : null,
    );
    const result = await withModelFallback(send, options);
    assert.deepEqual(result, { answeredBy: "backup" });
    assert.deepEqual(
      calls.map((call) => [call.model, call.fallback]),
      [
        ["main", false],
        ["backup", true],
      ],
    );
    // The SDK's own retries are off: this loop decides, within the timeout.
    for (const call of calls) {
      assert.deepEqual(call.options.retries, { strategy: "none" });
      assert.ok((call.options.timeout_ms ?? 0) <= (GEMINI_REQUEST_OPTIONS.timeout_ms ?? 0));
    }
  });

  it("keeps trying, alternating models, until one answers", async () => {
    let n = 0;
    const { send, calls } = fakeSend(() => (++n < 5 ? new GeminiApiError("busy", 503) : null));
    await withModelFallback(send, options);
    assert.deepEqual(
      calls.map((call) => call.model),
      ["main", "backup", "main", "backup", "main"],
    );
  });

  it("stops at once on a client error", async () => {
    const { send, calls } = fakeSend(() => new GeminiApiError("bad request", 400));
    await assert.rejects(withModelFallback(send, options), { status: 400 });
    assert.equal(calls.length, 1);
  });

  it("drops a model that ran out of quota and retries timeouts and unreadable answers", async () => {
    const backupErrors = [new GeminiApiError("timeout", undefined, true), new GeminiInvalidResponseError()];
    const { send, calls } = fakeSend((model) =>
      model === "main" ? new GeminiApiError("quota", 429) : backupErrors.shift() ?? null,
    );
    assert.deepEqual(await withModelFallback(send, options), { answeredBy: "backup" });
    // The main model hit its quota first, so only the fallback is tried after that.
    assert.deepEqual(
      calls.map((call) => call.model),
      ["main", "backup", "backup", "backup"],
    );
  });

  it("gives up after the attempt limit with the last error", async () => {
    const { send, calls } = fakeSend(() => new GeminiApiError("busy", 503));
    await assert.rejects(withModelFallback(send, options), { status: 503 });
    assert.equal(calls.length, FAST_RETRY.maxAttempts);
  });

  it("starts a second attempt beside one that hangs, and the first answer wins", async () => {
    const calls: string[] = [];
    const send = (model: string) => {
      calls.push(model);
      return model === "main"
        ? new Promise<{ answeredBy: string }>(() => {})
        : Promise.resolve({ answeredBy: model });
    };
    const result = await withModelFallback(send, { ...options, retry: { ...quick, hedgeAfterMs: 5 } });
    assert.deepEqual(result, { answeredBy: "backup" });
    assert.deepEqual(calls, ["main", "backup"]);
  });

  it("uses only the main model when the fallback is the same model", async () => {
    for (const fallbackModel of ["main", null]) {
      const { send, calls } = fakeSend(() => new GeminiApiError("busy", 503));
      await assert.rejects(withModelFallback(send, { ...options, fallbackModel }), { status: 503 });
      assert.ok(calls.every((call) => call.model === "main" && !call.fallback));
    }
  });
});

describe("getGeminiFallbackModel", () => {
  const saved = {
    main: process.env.GEMINI_MODEL,
    fallback: process.env.GEMINI_FALLBACK_MODEL,
  };
  const restore = (key: string, value: string | undefined) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  };
  afterEach(() => {
    restore("GEMINI_MODEL", saved.main);
    restore("GEMINI_FALLBACK_MODEL", saved.fallback);
  });

  it("uses the trimmed env value, or the default when unset", () => {
    process.env.GEMINI_MODEL = "main";
    process.env.GEMINI_FALLBACK_MODEL = "  backup  ";
    assert.equal(getGeminiFallbackModel(), "backup");
    process.env.GEMINI_FALLBACK_MODEL = " ";
    assert.equal(getGeminiFallbackModel(), DEFAULT_GEMINI_FALLBACK_MODEL);
  });

  it("is null when the fallback is the main model", () => {
    process.env.GEMINI_MODEL = "same-model";
    process.env.GEMINI_FALLBACK_MODEL = "same-model";
    assert.equal(getGeminiFallbackModel(), null);
  });
});

describe("ownership requests", () => {
  it("record the model that answered", async () => {
    const request: JsonRequest = async ({ onAttempt }) => {
      onAttempt?.({ ms: 10, status: 503, model: "main", fallback: false });
      onAttempt?.({ ms: 10, status: 200, model: "backup", fallback: true });
      return { assessment: "unclear", explanation: "Answer 1 is too general." };
    };
    const result = await assessOwnershipAnswers(LOST, FOUND, [], { request });
    assert.equal(result.model, "backup");
  });
});
