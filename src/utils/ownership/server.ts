import { getGeminiModel } from "@/utils/gemini/compareReports";
import {
  assessOwnershipAnswers,
  generateOwnershipQuestions,
} from "@/utils/gemini/ownershipVerification";
import type { OwnershipDeps } from "@/utils/ownership/service";
import { createSupabaseOwnershipStore } from "@/utils/ownership/supabaseStore";
import { createAdminClient } from "@/utils/supabase/admin";

// Server-only. Real dependencies for the ownership service; null when the
// server key is not configured.
export function createOwnershipDeps(): OwnershipDeps | null {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return null;
  }
  return {
    store: createSupabaseOwnershipStore(supabase),
    ai: {
      model: getGeminiModel(),
      generateQuestions: (lost, found) => generateOwnershipQuestions(lost, found),
      assessAnswers: (lost, found, answers) => assessOwnershipAnswers(lost, found, answers),
    },
  };
}
