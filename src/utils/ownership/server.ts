import { getGeminiModel } from "@/utils/gemini/compareReports";
import {
  assessOwnershipAnswers,
  generateOwnershipQuestions,
} from "@/utils/gemini/ownershipVerification";
import type { OwnershipDeps } from "@/utils/ownership/service";
import { createSqlOwnershipStore } from "@/utils/ownership/sqlStore";
import { withLocalQuestionFallback } from "@/utils/sandbox/localQuestions";
import { createDb } from "@/utils/db/client";

// Server-only. Real dependencies for the ownership service; null when the
// database is not configured.
export function createOwnershipDeps(): OwnershipDeps | null {
  let db;
  try {
    db = createDb();
  } catch {
    return null;
  }
  return {
    store: createSqlOwnershipStore(db),
    ai: {
      model: getGeminiModel(),
      // Test mode only: plain local questions when Gemini is busy.
      generateQuestions: withLocalQuestionFallback((lost, found) => generateOwnershipQuestions(lost, found)),
      assessAnswers: (lost, found, answers) => assessOwnershipAnswers(lost, found, answers),
    },
  };
}
