import { isSandboxMode } from "@/utils/sandbox";
import { authorizeLostReport, ownerView, type OwnershipDeps } from "@/utils/ownership/service";

// Test mode only: the owner's answer to the question they are on, taken from
// the detail the question was written from, so a visitor can send a right
// answer in one tap. Every report in test mode is sample or visitor data;
// outside test mode this returns nothing, since it would give the answer away.

export async function sandboxQuickAnswerWith(
  { store, logger = console }: OwnershipDeps,
  credential: unknown,
  questionNumber: unknown,
  env: { AMANAH_SANDBOX?: string; NODE_ENV?: string } = process.env,
): Promise<string | null> {
  if (!isSandboxMode(env) || typeof questionNumber !== "number") {
    return null;
  }
  try {
    const lostReportId = await authorizeLostReport(store, credential);
    if (!lostReportId) return null;
    const record = await store.findVerificationByLostReport(lostReportId);
    if (!record) return null;
    const view = ownerView(record);
    // Only for the question the owner is on now.
    if (view.state !== "question" || view.number !== questionNumber) return null;
    return record.expectedDetails[questionNumber - 1]?.trim() || null;
  } catch (error) {
    logger.error("Test mode: quick answer failed:", error instanceof Error ? error.name : "unknown");
    return null;
  }
}
