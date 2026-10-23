import { createHash, randomBytes } from "node:crypto";

// Server-only. The credential is returned once to the submitter's browser; only its hash is stored.

const CREDENTIAL_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createSubmissionCredential() {
  return randomBytes(32).toString("base64url");
}

export function hashSubmissionCredential(credential: string) {
  return createHash("sha256").update(credential).digest("hex");
}

export function isSubmissionCredential(value: unknown): value is string {
  return typeof value === "string" && CREDENTIAL_PATTERN.test(value);
}
