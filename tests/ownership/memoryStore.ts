import type { ReportComparisonInput } from "@/utils/gemini/compareReports";
import type { OwnershipAssessmentValue } from "@/utils/gemini/ownershipVerification";
import {
  createSubmissionCredential,
  hashSubmissionCredential,
} from "@/utils/matching/submissionCredential";
import {
  OwnershipStoreError,
  type DecisionLogValue,
  type MatchReports,
  type OwnershipStore,
  type VerificationRecord,
} from "@/utils/ownership/service";
import { latestDecision } from "@/utils/ownership/supabaseStore";

// In-memory stand-in for the Supabase store. Fictional data only.

export const LOST: ReportComparisonInput = {
  itemName: "Black water bottle",
  description: "Metal bottle with a dent near the bottom.",
  location: "Library, second floor",
};

export const FOUND: ReportComparisonInput = {
  itemName: "Black metal bottle",
  description: "Dent near the base, blue NASA sticker, initials R.K. engraved on the lid.",
  location: "Library study room",
};

type Row = {
  id: string;
  lostReportId: string;
  reportMatchId: string;
  questions: string[];
  expectedDetails: string[];
};

export function createMemoryStore() {
  const submissions = new Map<string, { reportId: string; reportType: string }>();
  const matches = new Map<string, MatchReports & { lostReportId: string }>();
  const verifications: Row[] = [];
  const answers: { verificationId: string; questionNumber: number; answer: string }[] = [];
  const assessments: {
    verificationId: string;
    assessment: OwnershipAssessmentValue;
    explanation: string;
  }[] = [];
  // Append-only decision log, like ownership_decisions.
  const decisions: {
    id: string;
    verificationId: string;
    decision: DecisionLogValue;
    note: string | null;
    previousDecisionId: string | null;
    previousDecision: DecisionLogValue | null;
    createdAt: string;
  }[] = [];
  const failures = new Set<string>();
  const calls: string[] = [];

  function maybeFail(method: string) {
    calls.push(method);
    if (failures.has(method)) {
      throw new OwnershipStoreError(`Failed: ${method}`, failures.has("missing_table") ? "PGRST205" : "XX000");
    }
  }

  function record(row: Row): VerificationRecord {
    const assessment = assessments.find((item) => item.verificationId === row.id);
    const log = decisions
      .filter((item) => item.verificationId === row.id)
      .map((item) => ({
        id: item.id,
        decision: item.decision,
        previous_decision_id: item.previousDecisionId,
        created_at: item.createdAt,
      }));
    return {
      ...row,
      answers: answers
        .filter((item) => item.verificationId === row.id)
        .map(({ questionNumber, answer }) => ({ questionNumber, answer }))
        .sort((a, b) => a.questionNumber - b.questionNumber),
      assessment: assessment
        ? { assessment: assessment.assessment, explanation: assessment.explanation }
        : null,
      latestDecision: latestDecision(log),
    };
  }

  const store: OwnershipStore = {
    async findSubmissionReport(tokenHash) {
      maybeFail("findSubmissionReport");
      return submissions.get(tokenHash) ?? null;
    },
    async findVerificationByLostReport(lostReportId) {
      maybeFail("findVerificationByLostReport");
      const row = verifications.find((item) => item.lostReportId === lostReportId);
      return row ? record(row) : null;
    },
    async findVerificationById(id) {
      maybeFail("findVerificationById");
      const row = verifications.find((item) => item.id === id);
      return row ? record(row) : null;
    },
    async findTopMatch(lostReportId) {
      maybeFail("findTopMatch");
      const match = [...matches.values()].find((item) => item.lostReportId === lostReportId);
      return match ? { matchId: match.matchId, lost: match.lost, found: match.found } : null;
    },
    async findMatchReports(matchId) {
      maybeFail("findMatchReports");
      const match = matches.get(matchId);
      return match ? { matchId, lost: match.lost, found: match.found } : null;
    },
    async insertVerification(row) {
      maybeFail("insertVerification");
      if (verifications.some((item) => item.lostReportId === row.lostReportId)) {
        return "duplicate";
      }
      verifications.push({ id: `verification-${verifications.length + 1}`, ...row });
      return "saved";
    },
    async insertAnswer(row) {
      maybeFail("insertAnswer");
      if (
        answers.some(
          (item) =>
            item.verificationId === row.verificationId &&
            item.questionNumber === row.questionNumber,
        )
      ) {
        return "duplicate";
      }
      answers.push(row);
      return "saved";
    },
    async insertAssessment(row) {
      maybeFail("insertAssessment");
      if (assessments.some((item) => item.verificationId === row.verificationId)) {
        return "duplicate";
      }
      assessments.push(row);
      return "saved";
    },
    async insertDecision(row) {
      maybeFail("insertDecision");
      // Same as unique nulls not distinct (verification_id, previous_decision_id).
      if (
        decisions.some(
          (item) =>
            item.verificationId === row.verificationId &&
            item.previousDecisionId === row.previousDecisionId,
        )
      ) {
        return "duplicate";
      }
      decisions.push({
        id: `decision-${decisions.length + 1}`,
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, decisions.length)).toISOString(),
        ...row,
      });
      return "saved";
    },
  };

  function addSubmission(reportId: string, reportType: "lost" | "found") {
    const credential = createSubmissionCredential();
    submissions.set(hashSubmissionCredential(credential), { reportId, reportType });
    return credential;
  }

  function addMatch(matchId: string, lostReportId: string, lost = LOST, found = FOUND) {
    matches.set(matchId, { matchId, lostReportId, lost, found });
  }

  // Seeds a verification as if the questions were already prepared.
  function addVerification(row: Row) {
    verifications.push(row);
  }

  return {
    store,
    addSubmission,
    addMatch,
    addVerification,
    verifications,
    answers,
    assessments,
    decisions,
    failures,
    calls,
  };
}
