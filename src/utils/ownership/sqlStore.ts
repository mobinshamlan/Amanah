import type { ReportComparisonInput } from "@/utils/gemini/compareReports";
import {
  OwnershipStoreError,
  type DecisionLogValue,
  type InsertOutcome,
  type MatchReports,
  type OwnershipStore,
  type VerificationRecord,
} from "@/utils/ownership/service";
import {
  findFollowup as queryFollowup,
  findMatchReports,
  findTopMatch,
  findSubmissionWithReport,
  findVerification as queryVerification,
  insertAnswer,
  insertAssessment,
  insertDecision,
  insertFollowup,
  insertFollowupAnswer,
  insertVerification,
  type MatchReportsRow,
  type OwnershipVerificationRow,
  type PairedReport,
} from "@/utils/db/queries";
import { isMissingTableCode, UNIQUE_VIOLATION, type DbResult, type Sql } from "@/utils/db/sql";

// Server-only: uses the database. Never import from client components.

export type DecisionRow = {
  id: string;
  decision: DecisionLogValue;
  previous_decision_id: string | null;
  created_at: string;
};

function fail(action: string, error: { code?: string } | null): never {
  throw new OwnershipStoreError(`Failed to ${action}.`, error?.code);
}

/**
 * The newest log entry is the one no other entry points back to. The database
 * keeps the log a single chain; created_at only breaks an unexpected tie.
 */
export function latestDecision(rows: DecisionRow[]) {
  const replaced = new Set(rows.map((row) => row.previous_decision_id));
  const heads = rows
    .filter((row) => !replaced.has(row.id))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return heads[0] ? { id: heads[0].id, decision: heads[0].decision } : null;
}

function toRecord(
  row: OwnershipVerificationRow,
  followup: VerificationRecord["followup"] = null,
): VerificationRecord {
  const assessment = row.assessment;
  return {
    id: row.id,
    lostReportId: row.lost_report_id,
    reportMatchId: row.report_match_id,
    questions: row.questions ?? [],
    expectedDetails: row.expected_details ?? [],
    answers: (row.answers ?? [])
      .map((item) => ({ questionNumber: item.question_number, answer: item.answer }))
      .sort((a, b) => a.questionNumber - b.questionNumber),
    assessment: assessment
      ? { assessment: assessment.assessment, explanation: assessment.explanation }
      : null,
    latestDecision: latestDecision(row.decisions ?? []),
    followup,
  };
}

function toReportText(row: PairedReport): ReportComparisonInput {
  return { itemName: row.item_name, description: row.description, location: row.location };
}

function toMatchReports(row: MatchReportsRow | null): MatchReports | null {
  if (!row?.lost || !row.found) {
    return null;
  }
  return { matchId: row.id, lost: toReportText(row.lost), found: toReportText(row.found) };
}

export function createSqlOwnershipStore(db: Sql): OwnershipStore {
  async function insert(result: Promise<DbResult<null>>, action: string): Promise<InsertOutcome> {
    const { error } = await result;
    if (!error) {
      return "saved";
    }
    if (error.code === UNIQUE_VIOLATION) {
      return "duplicate";
    }
    fail(action, error);
  }

  // Loaded on its own so everything else keeps working before the follow-up
  // migration is applied: a missing table just means "no follow-up".
  async function findFollowup(verificationId: string): Promise<VerificationRecord["followup"]> {
    const { data, error } = await queryFollowup(db, verificationId);
    if (error) {
      if (isMissingTableCode(error.code)) {
        return null;
      }
      fail("load follow-up", error);
    }
    return data ? { question: data.question, answer: data.answer ?? null } : null;
  }

  async function findVerification(column: "id" | "lost_report_id", value: string) {
    const { data, error } = await queryVerification(db, column, value);
    if (error) {
      fail("load verification", error);
    }
    if (!data) {
      return null;
    }
    return toRecord(data, await findFollowup(data.id));
  }

  return {
    async findSubmissionReport(tokenHash) {
      const { data, error } = await findSubmissionWithReport(db, tokenHash);
      if (error) {
        fail("load submission", error);
      }
      if (!data || !data.report) {
        return null;
      }
      return { reportId: data.report_id, reportType: data.report.report_type };
    },

    findVerificationByLostReport: (lostReportId) =>
      findVerification("lost_report_id", lostReportId),

    findVerificationById: (id) => findVerification("id", id),

    async findTopMatch(lostReportId) {
      const { data, error } = await findTopMatch(db, lostReportId);
      if (error) {
        fail("load top match", error);
      }
      return toMatchReports(data);
    },

    async findMatchReports(matchId) {
      const { data, error } = await findMatchReports(db, matchId);
      if (error) {
        fail("load match", error);
      }
      return toMatchReports(data);
    },

    insertVerification: (row) =>
      insert(
        insertVerification(db, {
          lost_report_id: row.lostReportId,
          report_match_id: row.reportMatchId,
          questions: row.questions,
          expected_details: row.expectedDetails,
          model: row.model,
        }),
        "save verification",
      ),

    insertAnswer: (row) =>
      insert(
        insertAnswer(db, {
          verification_id: row.verificationId,
          question_number: row.questionNumber,
          answer: row.answer,
        }),
        "save answer",
      ),

    insertAssessment: (row) =>
      insert(
        insertAssessment(db, {
          verification_id: row.verificationId,
          assessment: row.assessment,
          explanation: row.explanation,
          model: row.model,
        }),
        "save assessment",
      ),

    insertFollowup: (row) =>
      insert(
        insertFollowup(db, { verification_id: row.verificationId, question: row.question }),
        "save follow-up",
      ),

    insertFollowupAnswer: (row) =>
      insert(
        insertFollowupAnswer(db, { verification_id: row.verificationId, answer: row.answer }),
        "save follow-up answer",
      ),

    insertDecision: (row) =>
      insert(
        insertDecision(db, {
          verification_id: row.verificationId,
          decision: row.decision,
          note: row.note,
          previous_decision_id: row.previousDecisionId,
          previous_decision: row.previousDecision,
        }),
        "save decision",
      ),
  };
}
