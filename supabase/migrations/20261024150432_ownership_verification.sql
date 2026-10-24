-- Ownership verification for a lost report's highest-ranked AI "match" suggestion.
-- Questions ask the owner about specific found-report details that are absent from the lost report.
-- expected_details hold those private found-report details. They are never sent to the owner.
-- AI assessments are recommendations only. Staff decisions can be reset to pending review, and never
-- return an item automatically.
-- Private tables: no public grants. Only the server-only admin client (service_role) reads and inserts.
-- Nothing here updates or deletes existing rows.

-- Lets a verification reference (id, lost_report_id, ai_decision), so it can only point at a
-- "match" suggestion for the same lost report. id is already unique, so existing rows cannot conflict.
alter table public.report_matches
  add constraint report_matches_id_lost_report_ai_decision_key
    unique (id, lost_report_id, ai_decision);

create table public.ownership_verifications (
  id uuid primary key default gen_random_uuid(),
  lost_report_id uuid not null,
  report_match_id uuid not null,
  match_ai_decision text not null default 'match',
  questions text[] not null default '{}',
  expected_details text[] not null default '{}',
  model text not null,
  created_at timestamptz not null default now(),

  constraint ownership_verifications_lost_report_key unique (lost_report_id),

  constraint ownership_verifications_match_ai_decision_check
    check (match_ai_decision = 'match'),
  constraint ownership_verifications_report_match_fkey
    foreign key (report_match_id, lost_report_id, match_ai_decision)
    references public.report_matches (id, lost_report_id, ai_decision)
    on delete cascade,

  -- Zero questions means no useful private detail was found; staff review instead.
  constraint ownership_verifications_questions_size
    check (cardinality(questions) <= 2
      and array_position(questions, null) is null
      and char_length(array_to_string(questions, '')) <= 600),
  constraint ownership_verifications_expected_details_size
    check (cardinality(expected_details) = cardinality(questions)
      and array_position(expected_details, null) is null
      and char_length(array_to_string(expected_details, '')) <= 600),
  constraint ownership_verifications_model_not_blank
    check (char_length(trim(model)) > 0),
  constraint ownership_verifications_model_length
    check (char_length(model) <= 100)
);

create index ownership_verifications_report_match_id_idx
  on public.ownership_verifications (report_match_id);

-- One answer per question. Answers cannot be changed after they are saved.
create table public.ownership_answers (
  verification_id uuid not null
    references public.ownership_verifications (id) on delete cascade,
  question_number smallint not null,
  answer text not null,
  created_at timestamptz not null default now(),

  constraint ownership_answers_pkey primary key (verification_id, question_number),
  constraint ownership_answers_question_number_check
    check (question_number between 1 and 2),
  constraint ownership_answers_answer_not_blank
    check (char_length(trim(answer)) > 0),
  constraint ownership_answers_answer_length
    check (char_length(answer) <= 1000)
);

-- AI recommendation for staff. It never approves or rejects anything.
create table public.ownership_assessments (
  verification_id uuid primary key
    references public.ownership_verifications (id) on delete cascade,
  assessment text not null,
  explanation text not null,
  model text not null,
  created_at timestamptz not null default now(),

  constraint ownership_assessments_assessment_check
    check (assessment in ('supports', 'unclear', 'conflicts')),
  constraint ownership_assessments_explanation_not_blank
    check (char_length(trim(explanation)) > 0),
  constraint ownership_assessments_explanation_length
    check (char_length(explanation) <= 1000),
  constraint ownership_assessments_model_not_blank
    check (char_length(trim(model)) > 0),
  constraint ownership_assessments_model_length
    check (char_length(model) <= 100)
);

-- Staff decisions as an append-only log, so every decision and reset stays on record.
-- 'approved' means staff may proceed with ownership follow-up; 'rejected' means staff could not confirm it;
-- 'pending_review' resets an approved or rejected decision back to pending review.
-- The current decision is the newest entry. No entry, or a 'pending_review' entry, means pending review.
-- Each entry names the entry before it. The unique (verification_id, previous_decision_id) key stops two
-- staff actions from branching the log, and the checks allow only pending -> approved/rejected -> pending.
create table public.ownership_decisions (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null
    references public.ownership_verifications (id) on delete cascade,
  decision text not null,
  note text,
  previous_decision_id uuid,
  previous_decision text,
  created_at timestamptz not null default now(),

  constraint ownership_decisions_id_verification_decision_key
    unique (id, verification_id, decision),
  constraint ownership_decisions_previous_key
    unique nulls not distinct (verification_id, previous_decision_id),
  constraint ownership_decisions_previous_fkey
    foreign key (previous_decision_id, verification_id, previous_decision)
    references public.ownership_decisions (id, verification_id, decision),

  constraint ownership_decisions_decision_check
    check (decision in ('approved', 'rejected', 'pending_review')),
  constraint ownership_decisions_previous_pair_check
    check ((previous_decision_id is null) = (previous_decision is null)),
  constraint ownership_decisions_transition_check
    check (
      (decision in ('approved', 'rejected')
        and (previous_decision is null or previous_decision = 'pending_review'))
      or (decision = 'pending_review'
        and previous_decision in ('approved', 'rejected'))
    ),
  constraint ownership_decisions_note_length
    check (note is null or char_length(note) <= 1000)
);

create index ownership_decisions_verification_id_idx
  on public.ownership_decisions (verification_id, created_at);

alter table public.ownership_verifications enable row level security;
alter table public.ownership_answers enable row level security;
alter table public.ownership_assessments enable row level security;
alter table public.ownership_decisions enable row level security;

revoke all on table public.ownership_verifications from public;
revoke all on table public.ownership_verifications from anon, authenticated, service_role;
revoke all on table public.ownership_answers from public;
revoke all on table public.ownership_answers from anon, authenticated, service_role;
revoke all on table public.ownership_assessments from public;
revoke all on table public.ownership_assessments from anon, authenticated, service_role;
revoke all on table public.ownership_decisions from public;
revoke all on table public.ownership_decisions from anon, authenticated, service_role;

grant select on table public.ownership_verifications to service_role;
grant insert (lost_report_id, report_match_id, questions, expected_details, model)
  on table public.ownership_verifications to service_role;

grant select on table public.ownership_answers to service_role;
grant insert (verification_id, question_number, answer)
  on table public.ownership_answers to service_role;

grant select on table public.ownership_assessments to service_role;
grant insert (verification_id, assessment, explanation, model)
  on table public.ownership_assessments to service_role;

grant select on table public.ownership_decisions to service_role;
grant insert (verification_id, decision, note, previous_decision_id, previous_decision)
  on table public.ownership_decisions to service_role;
