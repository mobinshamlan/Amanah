import { attempt, type DbResult, type Sql } from "@/utils/db/sql";

// Server-only. Every database query the app makes, one function each. They
// replace the Supabase client calls one for one: the same tables, columns,
// filters, ordering and limits. Values are always $n parameters; the only
// names put into SQL text come from fixed maps below, never from input.
//
// Each function returns { data, error } and never throws, so callers keep the
// error handling they had (error codes such as 23505 and 42P01 are Postgres
// SQLSTATEs, as before).

export type ReportType = "lost" | "found";

// The column that holds a report's id on its own side of a pair.
const SIDE_COLUMN = { lost: "lost_report_id", found: "found_report_id" } as const;

// ---------------------------------------------------------------------------
// Reports

export type MatchReportRow = {
  id: string;
  item_name: string;
  description: string;
  location: string;
  created_at: string;
};

export type ReportRow = MatchReportRow & { report_type: string };

export type PairedReport = { item_name: string; description: string; location: string };

export function insertReport(
  sql: Sql,
  row: { id: string; report_type: ReportType; item_name: string; description: string; location: string },
): Promise<DbResult<null>> {
  return attempt(async () => {
    await sql.query(
      `insert into public.reports (id, report_type, item_name, description, location)
       values ($1, $2, $3, $4, $5)`,
      [row.id, row.report_type, row.item_name, row.description, row.location],
    );
    return null;
  });
}

/** Reports of one type, for matching (no particular order, as before). */
export function listMatchReports(sql: Sql, reportType: ReportType) {
  return attempt(() =>
    sql.query<MatchReportRow>(
      `select id, item_name, description, location, created_at
       from public.reports where report_type = $1`,
      [reportType],
    ),
  );
}

export function listReportsByIds(sql: Sql, ids: string[]) {
  return attempt(() =>
    sql.query<ReportRow>(
      `select id, report_type, item_name, description, location
       from public.reports where id = any($1::uuid[])`,
      [ids],
    ),
  );
}

/** Staff report list, newest first, optionally one type only. */
export function listAdminReports(sql: Sql, reportType: ReportType | null) {
  return attempt(() =>
    reportType
      ? sql.query<ReportRow>(
          `select id, report_type, item_name, description, location, created_at
           from public.reports where report_type = $1 order by created_at desc`,
          [reportType],
        )
      : sql.query<ReportRow>(
          `select id, report_type, item_name, description, location, created_at
           from public.reports order by created_at desc`,
        ),
  );
}

export function listMonitoringReports(sql: Sql) {
  return attempt(() =>
    sql.query<{ id: string; report_type: ReportType; item_name: string; created_at: string }>(
      "select id, report_type, item_name, created_at from public.reports",
    ),
  );
}

/** Adds reports that do not exist yet (ON CONFLICT DO NOTHING). Returns the added ids. */
export function insertMissingReports(
  sql: Sql,
  rows: { id: string; report_type: ReportType; item_name: string; description: string; location: string }[],
) {
  return attempt(() =>
    sql.query<{ id: string }>(
      `insert into public.reports (id, report_type, item_name, description, location)
       select * from unnest($1::uuid[], $2::text[], $3::text[], $4::text[], $5::text[])
       on conflict (id) do nothing
       returning id`,
      [
        rows.map((row) => row.id),
        rows.map((row) => row.report_type),
        rows.map((row) => row.item_name),
        rows.map((row) => row.description),
        rows.map((row) => row.location),
      ],
    ),
  );
}

/**
 * Deletes every report not in keepIds, optionally only those created before
 * `before`. Related rows go with them through ON DELETE CASCADE. Returns the count.
 */
export function deleteReportsExcept(sql: Sql, keepIds: string[], before: string | null) {
  return attempt(async () => {
    const [row] = await sql.query<{ deleted: number }>(
      `with deleted as (
         delete from public.reports
         where id <> all($1::uuid[]) and ($2::timestamptz is null or created_at < $2::timestamptz)
         returning 1
       )
       select count(*)::int as deleted from deleted`,
      [keepIds, before],
    );
    return row?.deleted ?? 0;
  });
}

// ---------------------------------------------------------------------------
// Submissions and the matching lease

export function insertSubmission(sql: Sql, row: { report_id: string; token_hash: string }) {
  return attempt(async () => {
    await sql.query(
      "insert into public.report_submissions (report_id, token_hash) values ($1, $2)",
      [row.report_id, row.token_hash],
    );
    return null;
  });
}

/** The submission for a credential hash, with its full report, or null. */
export function findSubmissionWithReport(sql: Sql, tokenHash: string) {
  return attempt(async () => {
    const [row] = await sql.query<{ report_id: string } & Partial<ReportRow>>(
      `select s.report_id, r.id, r.report_type, r.item_name, r.description, r.location, r.created_at
       from public.report_submissions s
       left join public.reports r on r.id = s.report_id
       where s.token_hash = $1`,
      [tokenHash],
    );
    if (!row) {
      return null;
    }
    const { report_id, ...report } = row;
    return { report_id, report: report.id ? (report as ReportRow) : null };
  });
}

/** Takes the lease when it is free or expired. Returns the row only if this call took it. */
export function claimMatchingLease(sql: Sql, reportId: string, until: string, now: string) {
  return attempt(() =>
    sql.query<{ report_id: string }>(
      `update public.report_submissions set processing_until = $2
       where report_id = $1 and (processing_until is null or processing_until < $3)
       returning report_id`,
      [reportId, until, now],
    ),
  );
}

export function releaseMatchingLease(sql: Sql, reportId: string) {
  return attempt(async () => {
    await sql.query(
      "update public.report_submissions set processing_until = null where report_id = $1",
      [reportId],
    );
    return null;
  });
}

// ---------------------------------------------------------------------------
// Suggestions and pair checks

export type PairKeyRow = { lost_report_id: string; found_report_id: string };

type PairTable = "report_matches" | "report_pair_checks";

function listPairKeys(sql: Sql, table: PairTable, own?: { side: ReportType; reportId: string }) {
  const from = table === "report_matches" ? "public.report_matches" : "public.report_pair_checks";
  return attempt(() =>
    own
      ? sql.query<PairKeyRow>(
          `select lost_report_id, found_report_id from ${from} where ${SIDE_COLUMN[own.side]} = $1`,
          [own.reportId],
        )
      : sql.query<PairKeyRow>(`select lost_report_id, found_report_id from ${from}`),
  );
}

/** Pairs with a saved suggestion; all of them, or only those of one report. */
export function listSuggestionKeys(sql: Sql, own?: { side: ReportType; reportId: string }) {
  return listPairKeys(sql, "report_matches", own);
}

/** Pairs with a recorded comparison; all of them, or only those of one report. */
export function listPairCheckKeys(sql: Sql, own?: { side: ReportType; reportId: string }) {
  return listPairKeys(sql, "report_pair_checks", own);
}

export type MatchInsert = {
  lost_report_id: string;
  found_report_id: string;
  explanation: string;
  model: string;
  // The table allows only "match" and "insufficient_information".
  ai_decision: string;
  supporting_details: string[];
  contradictions: string[];
  missing_information: string[];
  ai_similarity_score?: number | null;
};

export function insertMatch(sql: Sql, row: MatchInsert) {
  return attempt(async () => {
    await sql.query(
      `insert into public.report_matches (
         lost_report_id, found_report_id, explanation, model, ai_decision,
         supporting_details, contradictions, missing_information, ai_similarity_score
       ) values ($1, $2, $3, $4, $5, $6::text[], $7::text[], $8::text[], $9)`,
      [
        row.lost_report_id,
        row.found_report_id,
        row.explanation,
        row.model,
        row.ai_decision,
        row.supporting_details,
        row.contradictions,
        row.missing_information,
        row.ai_similarity_score ?? null,
      ],
    );
    return null;
  });
}

export function insertPairCheck(
  sql: Sql,
  row: { lost_report_id: string; found_report_id: string; ai_decision: string; model: string },
) {
  return attempt(async () => {
    await sql.query(
      `insert into public.report_pair_checks (lost_report_id, found_report_id, ai_decision, model)
       values ($1, $2, $3, $4)`,
      [row.lost_report_id, row.found_report_id, row.ai_decision, row.model],
    );
    return null;
  });
}

/** Decisions and scores of one lost report's suggestions, for its public status. */
export function listSuggestionStatus(sql: Sql, lostReportId: string) {
  return attempt(() =>
    sql.query<{ ai_decision: string; ai_similarity_score: number | null }>(
      "select ai_decision, ai_similarity_score from public.report_matches where lost_report_id = $1",
      [lostReportId],
    ),
  );
}

export function findMatchId(sql: Sql, lostReportId: string, foundReportId: string) {
  return attempt(async () => {
    const [row] = await sql.query<{ id: string }>(
      "select id from public.report_matches where lost_report_id = $1 and found_report_id = $2",
      [lostReportId, foundReportId],
    );
    return row ?? null;
  });
}

export type MatchWithReports = {
  id: string;
  lost_report_id: string;
  found_report_id: string;
  explanation: string;
  model: string;
  created_at: string;
  ai_decision: "match" | "insufficient_information";
  supporting_details: string[];
  contradictions: string[];
  missing_information: string[];
  ai_similarity_score: number | null;
  status: "pending_review";
  lost: PairedReport | null;
  found: PairedReport | null;
};

const PAIRED_REPORTS = `
  (select jsonb_build_object('item_name', l.item_name, 'description', l.description, 'location', l.location)
   from public.reports l where l.id = m.lost_report_id) as lost,
  (select jsonb_build_object('item_name', f.item_name, 'description', f.description, 'location', f.location)
   from public.reports f where f.id = m.found_report_id) as found`;

/** Every suggestion with both reports' text, newest first (staff workspace). */
export function listMatchesWithReports(sql: Sql) {
  return attempt(() =>
    sql.query<MatchWithReports>(
      `select m.id, m.lost_report_id, m.found_report_id, m.explanation, m.model, m.created_at,
         m.ai_decision, m.supporting_details, m.contradictions, m.missing_information,
         m.ai_similarity_score, m.status, ${PAIRED_REPORTS}
       from public.report_matches m
       order by m.created_at desc`,
    ),
  );
}

export type MatchReportsRow = { id: string; lost: PairedReport | null; found: PairedReport | null };

/** A lost report's best "match": highest score first (unscored last), then newest. */
export function findTopMatch(sql: Sql, lostReportId: string) {
  return attempt(async () => {
    const [row] = await sql.query<MatchReportsRow>(
      `select m.id, ${PAIRED_REPORTS}
       from public.report_matches m
       where m.lost_report_id = $1 and m.ai_decision = 'match'
       order by m.ai_similarity_score desc nulls last, m.created_at desc
       limit 1`,
      [lostReportId],
    );
    return row ?? null;
  });
}

export function findMatchReports(sql: Sql, matchId: string) {
  return attempt(async () => {
    const [row] = await sql.query<MatchReportsRow>(
      `select m.id, ${PAIRED_REPORTS} from public.report_matches m where m.id = $1`,
      [matchId],
    );
    return row ?? null;
  });
}

// ---------------------------------------------------------------------------
// Candidate reviews

export type CandidateReviewRow = {
  lost_report_id: string;
  found_report_id: string;
  action: string;
  note: string | null;
  created_at: string;
};

export function listCandidateReviews(sql: Sql) {
  return attempt(() =>
    sql.query<CandidateReviewRow>(
      `select lost_report_id, found_report_id, action, note, created_at
       from public.report_candidate_reviews
       order by created_at desc
       limit 500`,
    ),
  );
}

export function insertCandidateReview(
  sql: Sql,
  row: { lost_report_id: string; found_report_id: string; action: string; note: string | null },
) {
  return attempt(async () => {
    await sql.query(
      `insert into public.report_candidate_reviews (lost_report_id, found_report_id, action, note)
       values ($1, $2, $3, $4)`,
      [row.lost_report_id, row.found_report_id, row.action, row.note],
    );
    return null;
  });
}

// ---------------------------------------------------------------------------
// Ownership verification

export type OwnershipVerificationRow = {
  id: string;
  lost_report_id: string;
  report_match_id: string;
  questions: string[];
  expected_details: string[];
  answers: { question_number: number; answer: string }[];
  assessment: { assessment: "supports" | "unclear" | "conflicts"; explanation: string } | null;
  decisions: {
    id: string;
    decision: "approved" | "rejected" | "pending_review";
    previous_decision_id: string | null;
    created_at: string;
  }[];
};

const VERIFICATION_KEY = { id: "v.id", lost_report_id: "v.lost_report_id" } as const;

/** One verification, by its id or its lost report, with answers, assessment and decisions. */
export function findVerification(sql: Sql, by: keyof typeof VERIFICATION_KEY, value: string) {
  return attempt(async () => {
    const [row] = await sql.query<OwnershipVerificationRow>(
      `select v.id, v.lost_report_id, v.report_match_id, v.questions, v.expected_details,
         coalesce((select jsonb_agg(jsonb_build_object(
             'question_number', a.question_number, 'answer', a.answer))
           from public.ownership_answers a where a.verification_id = v.id), '[]'::jsonb) as answers,
         (select jsonb_build_object('assessment', s.assessment, 'explanation', s.explanation)
           from public.ownership_assessments s where s.verification_id = v.id) as assessment,
         coalesce((select jsonb_agg(jsonb_build_object(
             'id', d.id, 'decision', d.decision,
             'previous_decision_id', d.previous_decision_id, 'created_at', d.created_at))
           from public.ownership_decisions d where d.verification_id = v.id), '[]'::jsonb) as decisions
       from public.ownership_verifications v
       where ${VERIFICATION_KEY[by]} = $1`,
      [value],
    );
    return row ?? null;
  });
}

export function findFollowup(sql: Sql, verificationId: string) {
  return attempt(async () => {
    const [row] = await sql.query<{ question: string; answer: string | null }>(
      `select f.question, fa.answer
       from public.ownership_followups f
       left join public.ownership_followup_answers fa on fa.verification_id = f.verification_id
       where f.verification_id = $1`,
      [verificationId],
    );
    return row ?? null;
  });
}

export type AdminVerificationRow = {
  id: string;
  lost_report_id: string;
  report_match_id: string;
  questions: string[];
  expected_details: string[];
  model: string;
  created_at: string;
  answers: { question_number: number; answer: string; created_at: string }[];
  assessment: {
    assessment: "supports" | "unclear" | "conflicts";
    explanation: string;
    model: string;
    created_at: string;
  } | null;
  decisions: {
    id: string;
    decision: "approved" | "rejected" | "pending_review";
    note: string | null;
    previous_decision_id: string | null;
    created_at: string;
  }[];
};

/** Every claim with its answers, assessment and decision log, newest first (staff workspace). */
export function listAdminVerifications(sql: Sql) {
  return attempt(() =>
    sql.query<AdminVerificationRow>(
      `select v.id, v.lost_report_id, v.report_match_id, v.questions, v.expected_details,
         v.model, v.created_at,
         coalesce((select jsonb_agg(jsonb_build_object(
             'question_number', a.question_number, 'answer', a.answer, 'created_at', a.created_at))
           from public.ownership_answers a where a.verification_id = v.id), '[]'::jsonb) as answers,
         (select jsonb_build_object(
             'assessment', s.assessment, 'explanation', s.explanation,
             'model', s.model, 'created_at', s.created_at)
           from public.ownership_assessments s where s.verification_id = v.id) as assessment,
         coalesce((select jsonb_agg(jsonb_build_object(
             'id', d.id, 'decision', d.decision, 'note', d.note,
             'previous_decision_id', d.previous_decision_id, 'created_at', d.created_at))
           from public.ownership_decisions d where d.verification_id = v.id), '[]'::jsonb) as decisions
       from public.ownership_verifications v
       order by v.created_at desc`,
    ),
  );
}

export type AdminFollowupRow = {
  verification_id: string;
  question: string;
  created_at: string;
  answer: { answer: string; created_at: string } | null;
};

export function listAdminFollowups(sql: Sql) {
  return attempt(() =>
    sql.query<AdminFollowupRow>(
      `select f.verification_id, f.question, f.created_at,
         (select jsonb_build_object('answer', fa.answer, 'created_at', fa.created_at)
           from public.ownership_followup_answers fa
           where fa.verification_id = f.verification_id) as answer
       from public.ownership_followups f`,
    ),
  );
}

function insertOne(sql: Sql, text: string, params: unknown[]): Promise<DbResult<null>> {
  return attempt(async () => {
    await sql.query(text, params);
    return null;
  });
}

export function insertVerification(
  sql: Sql,
  row: {
    lost_report_id: string;
    report_match_id: string;
    questions: string[];
    expected_details: string[];
    model: string;
  },
) {
  return insertOne(
    sql,
    `insert into public.ownership_verifications
       (lost_report_id, report_match_id, questions, expected_details, model)
     values ($1, $2, $3::text[], $4::text[], $5)`,
    [row.lost_report_id, row.report_match_id, row.questions, row.expected_details, row.model],
  );
}

export function insertAnswer(
  sql: Sql,
  row: { verification_id: string; question_number: number; answer: string },
) {
  return insertOne(
    sql,
    `insert into public.ownership_answers (verification_id, question_number, answer)
     values ($1, $2, $3)`,
    [row.verification_id, row.question_number, row.answer],
  );
}

export function insertAssessment(
  sql: Sql,
  row: { verification_id: string; assessment: string; explanation: string; model: string },
) {
  return insertOne(
    sql,
    `insert into public.ownership_assessments (verification_id, assessment, explanation, model)
     values ($1, $2, $3, $4)`,
    [row.verification_id, row.assessment, row.explanation, row.model],
  );
}

export function insertFollowup(sql: Sql, row: { verification_id: string; question: string }) {
  return insertOne(
    sql,
    "insert into public.ownership_followups (verification_id, question) values ($1, $2)",
    [row.verification_id, row.question],
  );
}

export function insertFollowupAnswer(sql: Sql, row: { verification_id: string; answer: string }) {
  return insertOne(
    sql,
    "insert into public.ownership_followup_answers (verification_id, answer) values ($1, $2)",
    [row.verification_id, row.answer],
  );
}

export function insertDecision(
  sql: Sql,
  row: {
    verification_id: string;
    decision: string;
    note: string | null;
    previous_decision_id: string | null;
    previous_decision: string | null;
  },
) {
  return insertOne(
    sql,
    `insert into public.ownership_decisions
       (verification_id, decision, note, previous_decision_id, previous_decision)
     values ($1, $2, $3, $4, $5)`,
    [row.verification_id, row.decision, row.note, row.previous_decision_id, row.previous_decision],
  );
}

// ---------------------------------------------------------------------------
// Monitoring

export function listMonitoringPairChecks(sql: Sql) {
  return attempt(() =>
    sql.query<{ lost_report_id: string; found_report_id: string; ai_decision: string; checked_at: string }>(
      "select lost_report_id, found_report_id, ai_decision, checked_at from public.report_pair_checks",
    ),
  );
}

export type MatchingRunInsert = {
  source: "admin" | "auto";
  duration_ms: number;
  requests: number;
  checked: number;
  matched: number;
  uncertain: number;
  no_match: number;
  failed: number;
  already_saved: number;
  remaining: number | null;
  failure: string | null;
  stopped_for_time: boolean;
  model: string;
};

export function insertMatchingRun(sql: Sql, row: MatchingRunInsert) {
  return insertOne(
    sql,
    `insert into public.matching_runs (
       source, duration_ms, requests, checked, matched, uncertain, no_match,
       failed, already_saved, remaining, failure, stopped_for_time, model
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      row.source,
      row.duration_ms,
      row.requests,
      row.checked,
      row.matched,
      row.uncertain,
      row.no_match,
      row.failed,
      row.already_saved,
      row.remaining,
      row.failure,
      row.stopped_for_time,
      row.model,
    ],
  );
}

export type MatchingRunRecord = {
  finished_at: string;
  source: "admin" | "auto";
  duration_ms: number;
  requests: number;
  checked: number;
  matched: number;
  uncertain: number;
  no_match: number;
  failed: number;
  already_saved: number;
  remaining: number | null;
  failure: string | null;
  stopped_for_time: boolean;
  model: string;
};

/** Newest real (non-demo) runs, up to `limit`, and how many real runs exist in all. */
export function listRecentRuns(sql: Sql, limit: number) {
  return attempt(async () => {
    const [rows, [total]] = await Promise.all([
      sql.query<MatchingRunRecord>(
        `select finished_at, source, duration_ms, requests, checked, matched, uncertain,
           no_match, failed, already_saved, remaining, failure, stopped_for_time, model
         from public.matching_runs
         where model not ilike '%demo%'
         order by finished_at desc
         limit $1`,
        [limit],
      ),
      sql.query<{ count: number }>(
        "select count(*)::int as count from public.matching_runs where model not ilike '%demo%'",
      ),
    ]);
    return { rows, total: total?.count ?? rows.length };
  });
}

/** When the first real (non-demo) run finished, or null. */
export function findFirstRunAt(sql: Sql) {
  return attempt(async () => {
    const [row] = await sql.query<{ finished_at: string }>(
      `select finished_at from public.matching_runs
       where model not ilike '%demo%'
       order by finished_at asc
       limit 1`,
    );
    return row?.finished_at ?? null;
  });
}

export function countDemoRuns(sql: Sql) {
  return attempt(async () => {
    const [row] = await sql.query<{ count: number }>(
      "select count(*)::int as count from public.matching_runs where model ilike '%demo%'",
    );
    return row?.count ?? 0;
  });
}

// ---------------------------------------------------------------------------
// Usage limits

/**
 * One call to consume_usage: takes a slot from every bucket, or none.
 * Returns 'ok', a blocked label, or 'unavailable'.
 */
export function consumeUsage(sql: Sql, buckets: string[], limits: number[], labels: string[]) {
  return attempt(async () => {
    const [row] = await sql.query<{ result: string | null }>(
      "select public.consume_usage($1::text[], $2::integer[], $3::text[]) as result",
      [buckets, limits, labels],
    );
    return row?.result ?? null;
  });
}
