import type { ReportComparisonInput } from "@/utils/gemini/compareReports";
import type { OwnershipAssessmentValue } from "@/utils/gemini/ownershipVerification";
import {
  OwnershipStoreError,
  type DecisionLogValue,
  type InsertOutcome,
  type MatchReports,
  type OwnershipStore,
  type VerificationRecord,
} from "@/utils/ownership/service";
import type { createAdminClient } from "@/utils/supabase/admin";

// Server-only: uses the admin client (service_role). Never import from client components.

type AdminClient = ReturnType<typeof createAdminClient>;

type ReportRow = { item_name: string; description: string; location: string };

const VERIFICATION_COLUMNS = `
  id, lost_report_id, report_match_id, questions, expected_details,
  answers:ownership_answers(question_number, answer),
  assessment:ownership_assessments(assessment, explanation),
  decisions:ownership_decisions(id, decision, previous_decision_id, created_at)
`;

const MATCH_REPORT_COLUMNS = `
  id,
  lost:reports!report_matches_lost_report_fkey(item_name, description, location),
  found:reports!report_matches_found_report_fkey(item_name, description, location)
`;

type VerificationRow = {
  id: string;
  lost_report_id: string;
  report_match_id: string;
  questions: string[];
  expected_details: string[];
  answers: { question_number: number; answer: string }[] | null;
  assessment:
    | { assessment: OwnershipAssessmentValue; explanation: string }
    | { assessment: OwnershipAssessmentValue; explanation: string }[]
    | null;
  decisions: DecisionRow[] | null;
};

export type DecisionRow = {
  id: string;
  decision: DecisionLogValue;
  previous_decision_id: string | null;
  created_at: string;
};

type MatchRow = { id: string; lost: ReportRow | null; found: ReportRow | null };

// One-to-one embeds may come back as an object or a one-item array.
function single<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

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

function toRecord(row: VerificationRow): VerificationRecord {
  const assessment = single(row.assessment);
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
  };
}

function toReportText(row: ReportRow): ReportComparisonInput {
  return { itemName: row.item_name, description: row.description, location: row.location };
}

function toMatchReports(row: MatchRow | null): MatchReports | null {
  if (!row?.lost || !row.found) {
    return null;
  }
  return { matchId: row.id, lost: toReportText(row.lost), found: toReportText(row.found) };
}

export function createSupabaseOwnershipStore(supabase: AdminClient): OwnershipStore {
  async function insert(
    table: string,
    row: Record<string, unknown>,
    action: string,
  ): Promise<InsertOutcome> {
    const { error } = await supabase.from(table).insert(row);
    if (!error) {
      return "saved";
    }
    if (error.code === "23505") {
      return "duplicate";
    }
    fail(action, error);
  }

  async function findVerification(column: "id" | "lost_report_id", value: string) {
    const { data, error } = await supabase
      .from("ownership_verifications")
      .select(VERIFICATION_COLUMNS)
      .eq(column, value)
      .maybeSingle();
    if (error) {
      fail("load verification", error);
    }
    return data ? toRecord(data as unknown as VerificationRow) : null;
  }

  return {
    async findSubmissionReport(tokenHash) {
      const { data, error } = await supabase
        .from("report_submissions")
        .select("report_id, report:reports(report_type)")
        .eq("token_hash", tokenHash)
        .maybeSingle();
      if (error) {
        fail("load submission", error);
      }
      const report = single(
        (data as { report: { report_type: string } | { report_type: string }[] | null } | null)
          ?.report,
      );
      if (!data || !report) {
        return null;
      }
      return { reportId: data.report_id as string, reportType: report.report_type };
    },

    findVerificationByLostReport: (lostReportId) =>
      findVerification("lost_report_id", lostReportId),

    findVerificationById: (id) => findVerification("id", id),

    async findTopMatch(lostReportId) {
      const { data, error } = await supabase
        .from("report_matches")
        .select(MATCH_REPORT_COLUMNS)
        .eq("lost_report_id", lostReportId)
        .eq("ai_decision", "match")
        .order("ai_similarity_score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        fail("load top match", error);
      }
      return toMatchReports(data as unknown as MatchRow | null);
    },

    async findMatchReports(matchId) {
      const { data, error } = await supabase
        .from("report_matches")
        .select(MATCH_REPORT_COLUMNS)
        .eq("id", matchId)
        .maybeSingle();
      if (error) {
        fail("load match", error);
      }
      return toMatchReports(data as unknown as MatchRow | null);
    },

    insertVerification: (row) =>
      insert(
        "ownership_verifications",
        {
          lost_report_id: row.lostReportId,
          report_match_id: row.reportMatchId,
          questions: row.questions,
          expected_details: row.expectedDetails,
          model: row.model,
        },
        "save verification",
      ),

    insertAnswer: (row) =>
      insert(
        "ownership_answers",
        {
          verification_id: row.verificationId,
          question_number: row.questionNumber,
          answer: row.answer,
        },
        "save answer",
      ),

    insertAssessment: (row) =>
      insert(
        "ownership_assessments",
        {
          verification_id: row.verificationId,
          assessment: row.assessment,
          explanation: row.explanation,
          model: row.model,
        },
        "save assessment",
      ),

    insertDecision: (row) =>
      insert(
        "ownership_decisions",
        {
          verification_id: row.verificationId,
          decision: row.decision,
          note: row.note,
          previous_decision_id: row.previousDecisionId,
          previous_decision: row.previousDecision,
        },
        "save decision",
      ),
  };
}
