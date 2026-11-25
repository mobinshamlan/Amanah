import { createDb } from "@/utils/db/client";
import {
  listAdminFollowups,
  listAdminReports,
  listAdminVerifications,
  listCandidateReviews,
  listMatchesWithReports,
} from "@/utils/db/queries";
import { isMissingTableCode } from "@/utils/db/sql";
import {
  buildDemoMonitoringSnapshot,
  isMonitoringDemoEnabled,
} from "@/utils/monitoring/demo";
import { loadMonitoringSnapshot, type MonitoringLoad } from "@/utils/monitoring/server";
import { claimWaitingSince } from "@/utils/monitoring/snapshot";
import type { CandidateReview } from "@/utils/matching/candidates";
import type { AdminSectionKey } from "@/app/admin/AdminShell";
import {
  answeredCount,
  currentDecision,
  single,
  type Filter,
  type Report,
  type ReportMatch,
  type Verification,
} from "@/app/admin/parts/model";

// Loads everything the staff workspace shows. The queries, their order and
// their error handling are unchanged from the earlier single-file page; this
// module only keeps them out of the way of the screens.

type TableState = "ok" | "not_set_up" | "error";

export type AdminData = {
  reports: Report[];
  matches: ReportMatch[];
  candidateReviews: CandidateReview[];
  candidateReviewsState: TableState;
  loadError: boolean;
  matchesError: boolean;
  missingConfig: boolean;
  verifications: Verification[];
  verificationsState: TableState;
  followupsAvailable: boolean;
  monitoring: MonitoringLoad;
  monitoringDemo: boolean;
  // When the data was read; recent decisions stay in view for a while.
  loadedAt: number;
};

export function parseFilter(value: string | string[] | undefined): Filter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "lost" || raw === "found") {
    return raw;
  }
  return "all";
}

export function parseSection(value: string | string[] | undefined): AdminSectionKey | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (
    raw === "matches" ||
    raw === "candidates" ||
    raw === "claims" ||
    raw === "reports" ||
    raw === "monitoring"
  ) {
    return raw;
  }
  return null;
}

function missingTable(code: string | undefined): TableState {
  return isMissingTableCode(code) ? "not_set_up" : "error";
}

export async function loadAdminData(params: {
  filter: Filter;
  section: AdminSectionKey | null;
  demo?: string;
}): Promise<AdminData> {
  const monitoringDemo = isMonitoringDemoEnabled(params.demo);

  const data: AdminData = {
    reports: [],
    matches: [],
    candidateReviews: [],
    candidateReviewsState: "ok",
    loadError: false,
    matchesError: false,
    missingConfig: false,
    verifications: [],
    verificationsState: "ok",
    followupsAvailable: false,
    monitoring: { ok: false },
    monitoringDemo,
    loadedAt: Date.now(),
  };
  // Demo snapshot is built in memory only: no database read/write, no Gemini.
  if (monitoringDemo) {
    data.monitoring = { ok: true, snapshot: buildDemoMonitoringSnapshot(), reviewNeeded: null };
  }

  try {
    const db = createDb();

    const matchesResult = await listMatchesWithReports(db);
    if (matchesResult.error) {
      data.matchesError = true;
    } else {
      data.matches = (matchesResult.data ?? []) as ReportMatch[];
    }

    const candidateReviewsResult = await listCandidateReviews(db);
    if (candidateReviewsResult.error) {
      data.candidateReviewsState = missingTable(candidateReviewsResult.error.code);
    } else {
      data.candidateReviews = (candidateReviewsResult.data ?? []) as CandidateReview[];
    }

    const verificationsResult = await listAdminVerifications(db);
    if (verificationsResult.error) {
      data.verificationsState = missingTable(verificationsResult.error.code);
    } else {
      data.verifications = (verificationsResult.data ?? []) as Verification[];

      // Follow-ups load on their own: a missing table (migration not applied)
      // only turns the feature off and never breaks the claims list.
      const followupsResult = await listAdminFollowups(db);
      if (!followupsResult.error) {
        data.followupsAvailable = true;
        const byVerification = new Map(
          (followupsResult.data ?? []).map((row) => [
            row.verification_id,
            {
              question: row.question,
              created_at: row.created_at,
              answer: single(row.answer)?.answer ?? null,
              answered_at: single(row.answer)?.created_at ?? null,
            },
          ]),
        );
        data.verifications = data.verifications.map((verification) => ({
          ...verification,
          followup: byVerification.get(verification.id) ?? null,
        }));
      }
    }

    // Aggregate counts only; it needs the full suggestion list to count pairs.
    // Skip when demo mode is on so live figures never mix with the fixture.
    if (!monitoringDemo && !data.matchesError) {
      const { matches, verifications } = data;
      data.monitoring = await loadMonitoringSnapshot(db, {
        suggestions: matches,
        // Possible matches without a current staff decision (same rule as the queue).
        needsReview: matches
          .filter((match) => match.ai_decision === "match")
          .filter((match) => {
            const verification = verifications.find((item) => item.report_match_id === match.id);
            return !verification || currentDecision(verification) === null;
          }),
        claims:
          data.verificationsState === "ok"
            ? verifications.map((verification) => ({
                questionCount: verification.questions.length,
                answerCount: answeredCount(verification),
                assessed: single(verification.assessment) !== null,
                decision:
                  (currentDecision(verification)?.decision as "approved" | "rejected" | undefined) ??
                  null,
                similarityScore:
                  matches.find((match) => match.id === verification.report_match_id)
                    ?.ai_similarity_score ?? null,
                waitingSince: claimWaitingSince({
                  decided: currentDecision(verification) !== null,
                  questionCount: verification.questions.length,
                  createdAt: verification.created_at,
                  answerTimes: (verification.answers ?? []).map((answer) => answer.created_at),
                  followupAsked: Boolean(verification.followup),
                  followupAnsweredAt: verification.followup?.answered_at ?? null,
                  resetAt:
                    (verification.decisions ?? [])
                      .filter((entry) => entry.decision === "pending_review")
                      .map((entry) => entry.created_at)
                      .sort()
                      .at(-1) ?? null,
                }),
                // Only used to recognise demo records; never shown.
                lostReportId: verification.lost_report_id,
                model: verification.model,
              }))
            : null,
      });
    }

    const { data: rows, error } = await listAdminReports(
      db,
      params.section === "reports" && params.filter !== "all" ? params.filter : null,
    );
    if (error) {
      data.loadError = true;
    } else {
      data.reports = (rows ?? []) as Report[];
    }
  } catch (error) {
    if (error instanceof Error && error.message === "missing-db-config") {
      data.missingConfig = true;
    } else {
      data.loadError = true;
    }
  }

  return data;
}
