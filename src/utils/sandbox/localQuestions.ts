import type { ReportComparisonInput } from "@/utils/gemini/compareReports";
import {
  EXPECTED_DETAIL_MAX,
  type ParsedOwnershipQuestions,
} from "@/utils/gemini/ownershipVerification";
import type { OwnershipAi } from "@/utils/ownership/service";
import { isSandboxMode } from "@/utils/sandbox";
import { colourWords, isBusyGeminiError, LOCAL_FALLBACK_MODEL } from "@/utils/sandbox/localMatch";

// Test mode only: simple ownership questions when Gemini is busy, so a visitor
// with a possible match can still answer and try the staff role. The questions
// are fixed text in the owner's language and never contain found-report text;
// the found report only supplies the private expected details for staff (and
// for the test-mode quick answer).

const COPY = {
  en: {
    colour: "What colour is it? Name every colour you remember.",
    mark: "Describe a mark only the owner would know, such as a sticker, a scratch or something attached to it.",
  },
  ar: {
    colour: "وش لونه؟ اذكر كل الألوان اللي تتذكرها.",
    mark: "اوصف علامة ما يعرفها إلا صاحبه، مثل ملصق أو خدش أو شي معلّق فيه.",
  },
};

const ARABIC = /[؀-ۿ]/;

/** Up to two plain questions; expected details come from the found report. */
export function localOwnershipQuestions(
  lost: ReportComparisonInput,
  found: ReportComparisonInput,
): ParsedOwnershipQuestions {
  const copy = ARABIC.test(`${lost.itemName} ${lost.description}`) ? COPY.ar : COPY.en;
  const description = found.description.trim().slice(0, EXPECTED_DETAIL_MAX);
  const colours = colourWords(`${found.itemName} ${found.description}`);
  const questions = [];
  if (colours.length > 0) {
    const separator = ARABIC.test(found.description) ? "، " : ", ";
    questions.push({
      question: copy.colour,
      expectedDetail: colours.join(separator).slice(0, EXPECTED_DETAIL_MAX),
    });
  }
  if (description) {
    questions.push({ question: copy.mark, expectedDetail: description });
  }
  return { questions, dropped: [], model: LOCAL_FALLBACK_MODEL };
}

/**
 * Wraps question generation: in test mode, a busy or timed-out Gemini gives
 * the local questions instead of an error. Outside test mode it is unchanged.
 */
export function withLocalQuestionFallback(
  generate: OwnershipAi["generateQuestions"],
  env: { AMANAH_SANDBOX?: string; NODE_ENV?: string } = process.env,
  logger: Pick<Console, "info"> = console,
): OwnershipAi["generateQuestions"] {
  return async (lost, found) => {
    try {
      return await generate(lost, found);
    } catch (error) {
      if (!isSandboxMode(env) || !isBusyGeminiError(error)) {
        throw error;
      }
      logger.info("Ownership: local fallback questions used");
      return localOwnershipQuestions(lost, found);
    }
  };
}
