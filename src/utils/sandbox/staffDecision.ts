import { isSandboxMode } from "@/utils/sandbox";
import {
  authorizeLostReport,
  currentDecision,
  ownerView,
  recordDecision,
  resetDecision,
  type OwnerVerificationView,
  type OwnershipDecisionValue,
  type OwnershipDeps,
} from "@/utils/ownership/service";

// Test mode only: the lost reporter plays the staff role on their own claim.
// Authorized by their private credential, exactly like the owner's other
// actions, and it returns only the owner-safe view. It goes through the same
// decision log as staff, so /admin shows these decisions with the note below.

export type TryStaffDecisionResult =
  | { ok: true; view: OwnerVerificationView }
  | { ok: false; reason: "not_sandbox" | "invalid_link" | "not_ready" | "save_failed" };

export const SANDBOX_DECISION_NOTE = "Visitor tried the staff role in test mode";
const SANDBOX_RESET_NOTE = "Visitor tried the other decision in test mode";

export async function tryStaffDecisionWith(
  deps: OwnershipDeps,
  credential: unknown,
  decision: unknown,
  env: { AMANAH_SANDBOX?: string; NODE_ENV?: string } = process.env,
): Promise<TryStaffDecisionResult> {
  if (!isSandboxMode(env)) {
    return { ok: false, reason: "not_sandbox" };
  }
  if (decision !== "approved" && decision !== "rejected") {
    return { ok: false, reason: "save_failed" };
  }
  const { store, logger = console } = deps;

  try {
    const lostReportId = await authorizeLostReport(store, credential);
    if (!lostReportId) {
      return { ok: false, reason: "invalid_link" };
    }
    const record = await store.findVerificationByLostReport(lostReportId);
    if (!record) {
      return { ok: false, reason: "not_ready" };
    }

    const current: OwnershipDecisionValue | null = currentDecision(record);
    if (current === decision) {
      return { ok: true, view: ownerView(record) };
    }
    const state = ownerView(record).state;
    if (!current && state !== "staff_review" && state !== "answers_received") {
      // Questions or a follow-up are still waiting for the owner.
      return { ok: false, reason: "not_ready" };
    }

    if (current) {
      const reset = await resetDecision(deps, record.id, SANDBOX_RESET_NOTE);
      if (reset !== "saved") {
        return { ok: false, reason: "save_failed" };
      }
    }
    const saved = await recordDecision(deps, record.id, decision, SANDBOX_DECISION_NOTE);
    if (saved !== "saved") {
      return { ok: false, reason: "save_failed" };
    }
    const updated = await store.findVerificationByLostReport(lostReportId);
    return updated ? { ok: true, view: ownerView(updated) } : { ok: false, reason: "save_failed" };
  } catch (error) {
    logger.error("Test mode: staff decision failed:", error instanceof Error ? error.name : "unknown");
    return { ok: false, reason: "save_failed" };
  }
}
