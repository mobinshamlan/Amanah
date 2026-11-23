// Table shapes for the in-memory fixture database, mirroring
// supabase/migrations/*.sql: columns, defaults, not-null columns, the checks the
// app depends on, unique keys, and the relationships used by embedded selects.

export type Row = Record<string, unknown>;

type UniqueKey = {
  name: string;
  columns: string[];
  // Postgres "unique nulls not distinct": two NULLs count as equal.
  nullsNotDistinct?: boolean;
};

type ForeignKey = {
  name: string;
  columns: string[];
  table: string;
  refColumns: string[];
};

export type TableDef = {
  columns: string[];
  defaults: Record<string, () => unknown>;
  // NOT NULL columns without a default.
  required: string[];
  // Allowed values for checked text columns (NULL passes unless required).
  allowed?: Record<string, readonly unknown[]>;
  unique: UniqueKey[];
  foreignKeys?: ForeignKey[];
};

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const value = (constant: unknown) => () =>
  Array.isArray(constant) ? [...constant] : constant;

const DECISIONS = ["match", "no_match", "insufficient_information"] as const;

export const TABLES: Record<string, TableDef> = {
  reports: {
    columns: ["id", "report_type", "item_name", "description", "location", "created_at"],
    defaults: { id: uuid, created_at: now },
    required: ["report_type", "item_name", "description", "location"],
    allowed: { report_type: ["lost", "found"] },
    unique: [{ name: "reports_pkey", columns: ["id"] }],
  },
  report_matches: {
    columns: [
      "id",
      "lost_report_id",
      "lost_report_type",
      "found_report_id",
      "found_report_type",
      "explanation",
      "model",
      "created_at",
      "ai_decision",
      "supporting_details",
      "contradictions",
      "missing_information",
      "status",
      "ai_similarity_score",
    ],
    defaults: {
      id: uuid,
      lost_report_type: value("lost"),
      found_report_type: value("found"),
      created_at: now,
      ai_decision: value("match"),
      supporting_details: value([]),
      contradictions: value([]),
      missing_information: value([]),
      status: value("pending_review"),
      ai_similarity_score: value(null),
    },
    required: ["lost_report_id", "found_report_id", "explanation", "model"],
    allowed: {
      ai_decision: ["match", "insufficient_information"],
      status: ["pending_review"],
      lost_report_type: ["lost"],
      found_report_type: ["found"],
    },
    unique: [
      { name: "report_matches_pkey", columns: ["id"] },
      { name: "report_matches_pair_key", columns: ["lost_report_id", "found_report_id"] },
    ],
    foreignKeys: [
      {
        name: "report_matches_lost_report_fkey",
        columns: ["lost_report_id", "lost_report_type"],
        table: "reports",
        refColumns: ["id", "report_type"],
      },
      {
        name: "report_matches_found_report_fkey",
        columns: ["found_report_id", "found_report_type"],
        table: "reports",
        refColumns: ["id", "report_type"],
      },
    ],
  },
  report_pair_checks: {
    columns: [
      "lost_report_id",
      "lost_report_type",
      "found_report_id",
      "found_report_type",
      "ai_decision",
      "model",
      "checked_at",
    ],
    defaults: {
      lost_report_type: value("lost"),
      found_report_type: value("found"),
      checked_at: now,
    },
    required: ["lost_report_id", "found_report_id", "ai_decision", "model"],
    allowed: { ai_decision: DECISIONS },
    unique: [
      { name: "report_pair_checks_pkey", columns: ["lost_report_id", "found_report_id"] },
    ],
    foreignKeys: [
      {
        name: "report_pair_checks_lost_report_fkey",
        columns: ["lost_report_id", "lost_report_type"],
        table: "reports",
        refColumns: ["id", "report_type"],
      },
      {
        name: "report_pair_checks_found_report_fkey",
        columns: ["found_report_id", "found_report_type"],
        table: "reports",
        refColumns: ["id", "report_type"],
      },
    ],
  },
  report_submissions: {
    columns: ["report_id", "token_hash", "processing_until", "created_at"],
    defaults: { processing_until: value(null), created_at: now },
    required: ["report_id", "token_hash"],
    unique: [
      { name: "report_submissions_pkey", columns: ["report_id"] },
      { name: "report_submissions_token_hash_key", columns: ["token_hash"] },
    ],
    foreignKeys: [
      {
        name: "report_submissions_report_id_fkey",
        columns: ["report_id"],
        table: "reports",
        refColumns: ["id"],
      },
    ],
  },
  ownership_verifications: {
    columns: [
      "id",
      "lost_report_id",
      "report_match_id",
      "match_ai_decision",
      "questions",
      "expected_details",
      "model",
      "created_at",
    ],
    defaults: {
      id: uuid,
      match_ai_decision: value("match"),
      questions: value([]),
      expected_details: value([]),
      created_at: now,
    },
    required: ["lost_report_id", "report_match_id", "model"],
    unique: [
      { name: "ownership_verifications_pkey", columns: ["id"] },
      { name: "ownership_verifications_lost_report_key", columns: ["lost_report_id"] },
    ],
    foreignKeys: [
      {
        name: "ownership_verifications_report_match_fkey",
        columns: ["report_match_id", "lost_report_id", "match_ai_decision"],
        table: "report_matches",
        refColumns: ["id", "lost_report_id", "ai_decision"],
      },
    ],
  },
  ownership_answers: {
    columns: ["verification_id", "question_number", "answer", "created_at"],
    defaults: { created_at: now },
    required: ["verification_id", "question_number", "answer"],
    allowed: { question_number: [1, 2] },
    unique: [
      { name: "ownership_answers_pkey", columns: ["verification_id", "question_number"] },
    ],
    foreignKeys: [
      {
        name: "ownership_answers_verification_id_fkey",
        columns: ["verification_id"],
        table: "ownership_verifications",
        refColumns: ["id"],
      },
    ],
  },
  ownership_assessments: {
    columns: ["verification_id", "assessment", "explanation", "model", "created_at"],
    defaults: { created_at: now },
    required: ["verification_id", "assessment", "explanation", "model"],
    allowed: { assessment: ["supports", "unclear", "conflicts"] },
    unique: [{ name: "ownership_assessments_pkey", columns: ["verification_id"] }],
    foreignKeys: [
      {
        name: "ownership_assessments_verification_id_fkey",
        columns: ["verification_id"],
        table: "ownership_verifications",
        refColumns: ["id"],
      },
    ],
  },
  ownership_decisions: {
    columns: [
      "id",
      "verification_id",
      "decision",
      "note",
      "previous_decision_id",
      "previous_decision",
      "created_at",
    ],
    defaults: {
      id: uuid,
      note: value(null),
      previous_decision_id: value(null),
      previous_decision: value(null),
      created_at: now,
    },
    required: ["verification_id", "decision"],
    allowed: { decision: ["approved", "rejected", "pending_review"] },
    unique: [
      { name: "ownership_decisions_pkey", columns: ["id"] },
      {
        name: "ownership_decisions_previous_key",
        columns: ["verification_id", "previous_decision_id"],
        nullsNotDistinct: true,
      },
    ],
    foreignKeys: [
      {
        name: "ownership_decisions_verification_id_fkey",
        columns: ["verification_id"],
        table: "ownership_verifications",
        refColumns: ["id"],
      },
      {
        name: "ownership_decisions_previous_fkey",
        columns: ["previous_decision_id", "verification_id", "previous_decision"],
        table: "ownership_decisions",
        refColumns: ["id", "verification_id", "decision"],
      },
    ],
  },
  ownership_followups: {
    columns: ["verification_id", "question", "created_at"],
    defaults: { created_at: now },
    required: ["verification_id", "question"],
    unique: [{ name: "ownership_followups_pkey", columns: ["verification_id"] }],
    foreignKeys: [
      {
        name: "ownership_followups_verification_id_fkey",
        columns: ["verification_id"],
        table: "ownership_verifications",
        refColumns: ["id"],
      },
    ],
  },
  ownership_followup_answers: {
    columns: ["verification_id", "answer", "created_at"],
    defaults: { created_at: now },
    required: ["verification_id", "answer"],
    unique: [{ name: "ownership_followup_answers_pkey", columns: ["verification_id"] }],
    foreignKeys: [
      {
        name: "ownership_followup_answers_verification_id_fkey",
        columns: ["verification_id"],
        table: "ownership_followups",
        refColumns: ["verification_id"],
      },
    ],
  },
  matching_runs: {
    columns: [
      "id",
      "source",
      "finished_at",
      "duration_ms",
      "requests",
      "checked",
      "matched",
      "uncertain",
      "no_match",
      "failed",
      "already_saved",
      "remaining",
      "failure",
      "stopped_for_time",
      "model",
    ],
    defaults: {
      id: uuid,
      finished_at: now,
      remaining: value(null),
      failure: value(null),
      stopped_for_time: value(false),
    },
    required: [
      "source",
      "duration_ms",
      "requests",
      "checked",
      "matched",
      "uncertain",
      "no_match",
      "failed",
      "already_saved",
      "model",
    ],
    allowed: {
      source: ["admin", "auto"],
      failure: [
        "quota",
        "timeout",
        "api",
        "invalid_response",
        "config",
        "save",
        "load",
        "usage_limit",
      ],
    },
    unique: [{ name: "matching_runs_pkey", columns: ["id"] }],
  },
  report_candidate_reviews: {
    columns: [
      "id",
      "lost_report_id",
      "lost_report_type",
      "found_report_id",
      "found_report_type",
      "action",
      "note",
      "created_at",
    ],
    defaults: {
      id: uuid,
      lost_report_type: value("lost"),
      found_report_type: value("found"),
      note: value(null),
      created_at: now,
    },
    required: ["lost_report_id", "found_report_id", "action"],
    allowed: { action: ["ownership_review", "dismissed"] },
    unique: [{ name: "report_candidate_reviews_pkey", columns: ["id"] }],
    foreignKeys: [
      {
        name: "report_candidate_reviews_lost_report_fkey",
        columns: ["lost_report_id", "lost_report_type"],
        table: "reports",
        refColumns: ["id", "report_type"],
      },
      {
        name: "report_candidate_reviews_found_report_fkey",
        columns: ["found_report_id", "found_report_type"],
        table: "reports",
        refColumns: ["id", "report_type"],
      },
    ],
  },
};

export type Relation = {
  from: string;
  to: string;
  // Foreign key name, for `table!hint(...)` when there is more than one path.
  hint?: string;
  kind: "one" | "many";
  // Column on `from` and the column on `to` it equals.
  local: string;
  foreign: string;
};

// The embeds the app uses. A one-to-one embed (FK that is also the primary key)
// comes back as an object, like PostgREST does.
export const RELATIONS: Relation[] = [
  { from: "report_submissions", to: "reports", kind: "one", local: "report_id", foreign: "id" },
  {
    from: "report_matches",
    to: "reports",
    hint: "report_matches_lost_report_fkey",
    kind: "one",
    local: "lost_report_id",
    foreign: "id",
  },
  {
    from: "report_matches",
    to: "reports",
    hint: "report_matches_found_report_fkey",
    kind: "one",
    local: "found_report_id",
    foreign: "id",
  },
  {
    from: "ownership_verifications",
    to: "report_matches",
    kind: "one",
    local: "report_match_id",
    foreign: "id",
  },
  {
    from: "ownership_verifications",
    to: "ownership_answers",
    kind: "many",
    local: "id",
    foreign: "verification_id",
  },
  {
    from: "ownership_verifications",
    to: "ownership_assessments",
    kind: "one",
    local: "id",
    foreign: "verification_id",
  },
  {
    from: "ownership_verifications",
    to: "ownership_decisions",
    kind: "many",
    local: "id",
    foreign: "verification_id",
  },
  {
    from: "ownership_verifications",
    to: "ownership_followups",
    kind: "one",
    local: "id",
    foreign: "verification_id",
  },
  {
    from: "ownership_followups",
    to: "ownership_followup_answers",
    kind: "one",
    local: "verification_id",
    foreign: "verification_id",
  },
];
