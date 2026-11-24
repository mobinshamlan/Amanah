"use server";

import {
  getOwnerVerification,
  submitFollowupAnswer,
  submitOwnerAnswer,
  type OwnerVerificationResult,
  type SubmitAnswerResult,
} from "@/utils/ownership/service";
import { createOwnershipDeps } from "@/utils/ownership/server";
import { currentIpKey } from "@/utils/limits/clientIp";
import { runWithUsageScope } from "@/utils/limits/usageScope";
import { isSandboxMode } from "@/utils/sandbox";
import { sandboxQuickAnswerWith } from "@/utils/sandbox/quickAnswer";
import {
  tryStaffDecisionWith,
  type TryStaffDecisionResult,
} from "@/utils/sandbox/staffDecision";

// Both actions are authorized only by the lost reporter's private submission
// credential, and return only the owner-safe view.

export async function getOwnershipVerification(
  credential: string,
): Promise<OwnerVerificationResult> {
  const deps = createOwnershipDeps();
  if (!deps) {
    return { ok: true, view: { state: "retry", reason: "unavailable" } };
  }
  return runWithUsageScope({ ipKey: await currentIpKey(), reportId: null }, () =>
    getOwnerVerification(deps, credential),
  );
}

export async function submitOwnershipAnswer(
  credential: string,
  questionNumber: number,
  answer: string,
): Promise<SubmitAnswerResult> {
  const deps = createOwnershipDeps();
  if (!deps) {
    return { ok: false, reason: "save_failed" };
  }
  return runWithUsageScope({ ipKey: await currentIpKey(), reportId: null }, () =>
    submitOwnerAnswer(deps, credential, questionNumber, answer),
  );
}

export async function submitOwnershipFollowupAnswer(
  credential: string,
  answer: string,
): Promise<SubmitAnswerResult> {
  const deps = createOwnershipDeps();
  if (!deps) {
    return { ok: false, reason: "save_failed" };
  }
  return submitFollowupAnswer(deps, credential, answer);
}

// Test mode only: the lost reporter plays the staff role on their own claim,
// so they can see what an approval or a rejection looks like. Authorized by
// the same private credential, and refused unless test mode is on.
export type { TryStaffDecisionResult };

export async function tryStaffDecision(
  credential: string,
  decision: "approved" | "rejected",
): Promise<TryStaffDecisionResult> {
  if (!isSandboxMode()) {
    return { ok: false, reason: "not_sandbox" };
  }
  const deps = createOwnershipDeps();
  if (!deps) {
    return { ok: false, reason: "save_failed" };
  }
  return tryStaffDecisionWith(deps, credential, decision);
}

// Test mode only: a right answer to the current question, for the one-tap
// "owner's answer" option. Refused (null) unless test mode is on.
export async function getSandboxQuickAnswer(
  credential: string,
  questionNumber: number,
): Promise<string | null> {
  if (!isSandboxMode()) {
    return null;
  }
  const deps = createOwnershipDeps();
  return deps ? sandboxQuickAnswerWith(deps, credential, questionNumber) : null;
}
