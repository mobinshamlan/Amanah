"use server";

import {
  getOwnerVerification,
  submitOwnerAnswer,
  type OwnerVerificationResult,
  type SubmitAnswerResult,
} from "@/utils/ownership/service";
import { createOwnershipDeps } from "@/utils/ownership/server";

// Both actions are authorized only by the lost reporter's private submission
// credential, and return only the owner-safe view.

export async function getOwnershipVerification(
  credential: string,
): Promise<OwnerVerificationResult> {
  const deps = createOwnershipDeps();
  if (!deps) {
    return { ok: true, view: { state: "retry", reason: "unavailable" } };
  }
  return getOwnerVerification(deps, credential);
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
  return submitOwnerAnswer(deps, credential, questionNumber, answer);
}
