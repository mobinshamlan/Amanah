import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { GoogleGenAIRequestOptions } from "@google/genai";
import {
  DEFAULT_GEMINI_FALLBACK_MODEL,
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

const options = { requestOptions: GEMINI_REQUEST_OPTIONS, model: "main", fallbackModel: "backup" };

describe("withModelFallback", () => {
  it("sends the request to the fallback model when the main one is overloaded", async () => {
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
    // Fewer retries per model keep primary plus fallback near the old worst case.
    for (const call of calls) {
      assert.deepEqual(call.options.retries, {
        ...GEMINI_REQUEST_OPTIONS.retries,
        maxRetries: 1,
      });
      assert.equal(call.options.timeout_ms, GEMINI_REQUEST_OPTIONS.timeout_ms);
    }
  });

  it("does not fall back on a client error", async () => {
    const { send, calls } = fakeSend(() => new GeminiApiError("bad request", 400));
    await assert.rejects(withModelFallback(send, options), { status: 400 });
    assert.equal(calls.length, 1);
  });

  it("does not fall back on quota errors or timeouts", async () => {
    for (const error of [
      new GeminiApiError("quota", 429),
      new GeminiApiError("timeout", undefined, true),
    ]) {
      const { send, calls } = fakeSend(() => error);
      await assert.rejects(withModelFallback(send, options), GeminiApiError);
      assert.equal(calls.length, 1);
    }
  });

  it("does not fall back on an invalid answer", async () => {
    const { send, calls } = fakeSend(() => new GeminiInvalidResponseError());
    await assert.rejects(withModelFallback(send, options), GeminiInvalidResponseError);
    assert.equal(calls.length, 1);
  });

  it("reports the fallback model's error when both models fail", async () => {
    const { send, calls } = fakeSend((model) =>
      new GeminiApiError("busy", model === "main" ? 503 : 500),
    );
    await assert.rejects(withModelFallback(send, options), { status: 500 });
    assert.equal(calls.length, 2);
  });

  it("does not fall back, and keeps the full retries, when the fallback is the same model", async () => {
    for (const fallbackModel of ["main", null]) {
      const { send, calls } = fakeSend(() => new GeminiApiError("busy", 503));
      await assert.rejects(
        withModelFallback(send, { ...options, fallbackModel }),
        { status: 503 },
      );
      assert.equal(calls.length, 1);
      assert.equal(calls[0].options, GEMINI_REQUEST_OPTIONS);
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
