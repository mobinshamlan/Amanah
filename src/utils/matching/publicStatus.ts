import type { MatchingFailure } from "@/utils/matching/runMatchingBatch";

// What a public submitter may learn about automatic matching. No report details,
// scores, explanations, identifiers, or counts. Found reporters never get an outcome.

export type MatchingPhase =
  | "checking"
  | "complete"
  | "failed"
  | "rate_limited"
  | "unavailable";
export type LostOutcome = "possible_match" | "uncertain" | "no_match";

export type PublicMatchingStatus = {
  phase: MatchingPhase;
  outcome?: LostOutcome;
};

function phaseFor(failure: MatchingFailure | null, remaining: number): MatchingPhase {
  if (failure === "config") {
    return "unavailable";
  }
  if (failure === "quota") {
    return "rate_limited";
  }
  if (failure) {
    return "failed";
  }
  return remaining > 0 ? "checking" : "complete";
}

export function toPublicStatus({
  reportType,
  remaining,
  failure,
  hasMatch,
  hasUncertain,
}: {
  reportType: "lost" | "found";
  remaining: number;
  failure: MatchingFailure | null;
  hasMatch: boolean;
  hasUncertain: boolean;
}): PublicMatchingStatus {
  const phase = phaseFor(failure, remaining);

  if (reportType === "found") {
    return { phase };
  }
  if (hasMatch) {
    return { phase, outcome: "possible_match" };
  }
  // "No match" or "uncertain" only once every relevant pair has been checked.
  if (phase === "complete") {
    return { phase, outcome: hasUncertain ? "uncertain" : "no_match" };
  }
  return { phase };
}
