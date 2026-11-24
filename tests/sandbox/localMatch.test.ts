import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GeminiApiError, GeminiConfigError } from "@/utils/gemini/compareReports";
import { report } from "@/i18n/messages/report";
import {
  compareLocally,
  isBusyGeminiError,
  LOCAL_FALLBACK_MODEL,
  normalizeForMatch,
} from "@/utils/sandbox/localMatch";
import { localOwnershipQuestions, withLocalQuestionFallback } from "@/utils/sandbox/localQuestions";
import { SAMPLE_REPORTS } from "@/utils/sandbox/samples";

// Test mode's local comparison, used when Gemini is busy. Each lost-form
// example must match its sample (in both languages) and nothing else.

const silent = { info() {} };

// Lost examples i (0..2) are written for samples 1..3 (Arabic) and their
// English twins 9..11.
const TWINS = [
  ["5a4d0000-0000-4000-8000-000000000001", "5a4d0000-0000-4000-8000-000000000009"],
  ["5a4d0000-0000-4000-8000-000000000002", "5a4d0000-0000-4000-8000-00000000000a"],
  ["5a4d0000-0000-4000-8000-000000000003", "5a4d0000-0000-4000-8000-00000000000b"],
];

function lostExample(locale: "en" | "ar", index: number) {
  const example = report[locale].kinds.lost.examples[index];
  return { item_name: example.itemName, description: example.description };
}

describe("normalizeForMatch", () => {
  it("unifies Arabic spellings and drops punctuation", () => {
    assert.equal(normalizeForMatch("مِظلّة زرقاء، أصفر!"), "مظله زرقا اصفر");
    assert.equal(normalizeForMatch("إيصال آخر ـمطويـ"), "ايصال اخر مطوي");
    assert.equal(normalizeForMatch("Blue-Folding UMBRELLA."), "blue folding umbrella");
  });
});

describe("compareLocally with the lost-form examples", () => {
  for (const locale of ["ar", "en"] as const) {
    for (const [index, twins] of TWINS.entries()) {
      const lost = lostExample(locale, index);

      it(`${locale} example ${index + 1} matches its sample in both languages`, () => {
        for (const id of twins) {
          const sample = SAMPLE_REPORTS.find((item) => item.id === id)!;
          const result = compareLocally(lost, sample);
          assert.equal(result.decision, "match", `${lost.item_name} vs ${sample.item_name} (${result.similarityScore})`);
          assert.ok(result.similarityScore >= 70);
          assert.equal(result.model, LOCAL_FALLBACK_MODEL);
        }
      });

      it(`${locale} example ${index + 1} does not match unrelated samples`, () => {
        for (const sample of SAMPLE_REPORTS.filter((item) => !twins.includes(item.id))) {
          const result = compareLocally(lost, sample);
          assert.equal(result.decision, "no_match", `${lost.item_name} vs ${sample.item_name} (${result.similarityScore})`);
        }
      });
    }
  }
});

describe("compareLocally scoring", () => {
  it("calls the same kind with few details insufficient", () => {
    const result = compareLocally({ item_name: "Umbrella", description: "A blue umbrella." }, SAMPLE_REPORTS[8]);
    assert.equal(result.decision, "insufficient_information");
    assert.ok(result.similarityScore >= 40 && result.similarityScore < 70);
  });

  it("treats a colour conflict as no match", () => {
    const result = compareLocally({ item_name: "محفظة بنية", description: "محفظة بنية فيها بطاقة." }, SAMPLE_REPORTS[1]);
    assert.equal(result.decision, "no_match");
    assert.ok(result.contradictions.length > 0);
  });

  it("compares unknown items word for word", () => {
    const result = compareLocally(
      { item_name: "Calculator", description: "Casio calculator" },
      { item_name: "Calculator", description: "Casio calculator with a cracked screen" },
    );
    assert.notEqual(result.decision, "no_match");
  });

  it("explains that no AI was used", () => {
    assert.match(compareLocally(lostExample("en", 0), SAMPLE_REPORTS[8]).reason, /without AI/);
  });
});

describe("isBusyGeminiError", () => {
  it("is true for Gemini's busy, timeout, quota and unreadable answers, not setup errors", () => {
    assert.equal(isBusyGeminiError(new GeminiApiError("busy", 503)), true);
    assert.equal(isBusyGeminiError(new GeminiApiError("timeout", undefined, true)), true);
    assert.equal(isBusyGeminiError(new GeminiApiError("quota", 429)), true);
    assert.equal(isBusyGeminiError(new GeminiConfigError()), false);
    assert.equal(isBusyGeminiError(new Error("other")), false);
  });
});

describe("local ownership questions", () => {
  const toInput = (item: { item_name: string; description: string; location?: string }) => ({
    itemName: item.item_name,
    description: item.description,
    location: item.location ?? "",
  });

  it("asks fixed questions in the owner's language, without found-report text", () => {
    const found = toInput(SAMPLE_REPORTS[0]);
    for (const locale of ["ar", "en"] as const) {
      const parsed = localOwnershipQuestions(toInput(lostExample(locale, 0)), found);
      assert.equal(parsed.questions.length, 2);
      assert.equal(parsed.model, LOCAL_FALLBACK_MODEL);
      for (const { question } of parsed.questions) {
        assert.equal(question.includes(found.description), false);
        assert.equal(/[؀-ۿ]/.test(question), locale === "ar");
      }
      assert.match(parsed.questions[0].expectedDetail, /زرق/);
      assert.equal(parsed.questions[1].expectedDetail, found.description);
    }
  });

  it("falls back only in test mode and only on a Gemini error", async () => {
    const lost = toInput(lostExample("en", 0));
    const found = toInput(SAMPLE_REPORTS[8]);
    const failing = (error: Error) => async () => {
      throw error;
    };
    const sandbox = { AMANAH_SANDBOX: "1" };

    const parsed = await withLocalQuestionFallback(failing(new GeminiApiError("busy", 503)), sandbox, silent)(lost, found);
    assert.equal(parsed.model, LOCAL_FALLBACK_MODEL);

    await assert.rejects(
      withLocalQuestionFallback(failing(new GeminiApiError("busy", 503)), {}, silent)(lost, found),
      GeminiApiError,
    );
    // Amanah's own setup errors are not covered.
    await assert.rejects(
      withLocalQuestionFallback(failing(new GeminiConfigError()), sandbox, silent)(lost, found),
      GeminiConfigError,
    );
  });
});
