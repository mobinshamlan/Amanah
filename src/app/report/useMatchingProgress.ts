"use client";

import { useCallback, useRef, useState } from "react";
import { continueMatching, type ReportType } from "@/app/report/actions";
import type { MatchingView } from "@/app/report/SubmissionConfirmation";

// Each continuation request is bounded on the server; this caps requests per page visit.
const MAX_CONTINUATION_STEPS = 40;
// After this many waits for the Gemini rate limit, the submitter must choose Try again.
const MAX_RATE_LIMIT_WAITS = 2;

/**
 * Follows automatic matching for one submission credential and exposes only the
 * public status. When storageKey is given, the credential is forgotten from
 * sessionStorage once there is nothing left to resume.
 *
 * confirmStatusBeforeDisplay: for the private tracking page. Do not show an
 * optimistic "checking" status; clear any previous status until the current
 * fetch returns, so a reload never flashes "no match", "checking", or an
 * unverified ownership outcome.
 */
export function useMatchingProgress({
  reportType,
  storageKey,
  confirmStatusBeforeDisplay = false,
}: {
  reportType: ReportType;
  storageKey?: string;
  confirmStatusBeforeDisplay?: boolean;
}) {
  const [credential, setCredential] = useState<string | null>(null);
  const [matching, setMatching] = useState<MatchingView | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const activeRun = useRef(0);

  const continueChecks = useCallback(
    async (submissionCredential: string) => {
      const run = ++activeRun.current;
      const forget = () => {
        if (storageKey) {
          sessionStorage.removeItem(storageKey);
        }
      };
      setCredential(submissionCredential);
      if (confirmStatusBeforeDisplay) {
        setMatching(null);
      } else {
        setMatching({ phase: "checking" });
      }
      setIsContinuing(true);
      let rateLimitWaits = 0;
      try {
        for (let step = 0; step < MAX_CONTINUATION_STEPS; step += 1) {
          if (run !== activeRun.current) {
            return;
          }
          const result = await continueMatching(submissionCredential, reportType);
          if (run !== activeRun.current) {
            return;
          }
          if (!result.ok) {
            forget();
            setMatching({ phase: "lost_access" });
            return;
          }
          setMatching(result.status);
          if (result.status.phase === "complete") {
            forget();
          }
          if (result.status.phase === "rate_limited") {
            if (rateLimitWaits >= MAX_RATE_LIMIT_WAITS) {
              return;
            }
            rateLimitWaits += 1;
          } else if (result.status.phase !== "checking") {
            return;
          }
          if (result.waitMs) {
            await new Promise((resolve) => setTimeout(resolve, result.waitMs));
          }
        }
        setMatching({ phase: "stalled" });
      } catch {
        if (run === activeRun.current) {
          setMatching({ phase: "failed" });
        }
      } finally {
        if (run === activeRun.current) {
          setIsContinuing(false);
        }
      }
    },
    [reportType, storageKey, confirmStatusBeforeDisplay],
  );

  // Stops following the current run without changing what is shown.
  const cancel = useCallback(() => {
    activeRun.current += 1;
  }, []);

  // Stops following and clears the status, e.g. before a new report.
  const clear = useCallback(() => {
    activeRun.current += 1;
    setMatching(null);
    setCredential(null);
    setIsContinuing(false);
  }, []);

  const canRetry =
    Boolean(credential) &&
    !isContinuing &&
    (matching?.phase === "failed" ||
      matching?.phase === "rate_limited" ||
      matching?.phase === "unavailable");

  return {
    credential,
    matching,
    setMatching,
    isContinuing,
    canRetry,
    continueChecks,
    cancel,
    clear,
  };
}
