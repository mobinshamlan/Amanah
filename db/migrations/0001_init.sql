-- Amanah schema for plain Postgres (Neon). It is the final state of the old
-- supabase/migrations files, in one step, without the Supabase-only parts:
-- no anon/authenticated/service_role grants, no row-level security policies,
-- no auth.users references. Only the server connects, with DATABASE_URL.
--
-- Table, column, constraint and index names are unchanged, so error codes and
-- constraint names the app relies on (23505 unique violations, for example)
-- behave exactly as before. Apply with `npm run db:migrate`.

-- Lost and found reports.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  item_name text not null,
  description text not null,
  location text not null,
  created_at timestamptz not null default now(),

  constraint reports_report_type_check
    check (report_type in ('lost', 'found')),
  constraint reports_item_name_not_blank
    check (char_length(trim(item_name)) > 0),
  constraint reports_description_not_blank
    check (char_length(trim(description)) > 0),
  constraint reports_location_not_blank
    check (char_length(trim(location)) > 0),
  constraint reports_item_name_length
    check (char_length(item_name) <= 200),
  constraint reports_description_length
    check (char_length(description) <= 2000),
  constraint reports_location_length
    check (char_length(location) <= 500),

  -- Lets other tables reference (id, report_type), so each side of a pair is
  -- forced to the right report type.
  constraint reports_id_report_type_key unique (id, report_type)
);

-- AI suggestions (and staff-added pairs) linking one lost and one found report.
-- A link does not confirm ownership or authorize a return.
create table public.report_matches (
  id uuid primary key default gen_random_uuid(),
  lost_report_id uuid not null,
  lost_report_type text not null default 'lost',
  found_report_id uuid not null,
  found_report_type text not null default 'found',
  explanation text not null,
  model text not null,
  created_at timestamptz not null default now(),
  ai_decision text not null default 'match',
  supporting_details text[] not null default '{}',
  contradictions text[] not null default '{}',
  missing_information text[] not null default '{}',
  status text not null default 'pending_review',
  -- Experimental 0-100 ranking aid. Not a probability. Null means "Not scored".
  ai_similarity_score smallint,

  constraint report_matches_lost_report_type_check
    check (lost_report_type = 'lost'),
  constraint report_matches_found_report_type_check
    check (found_report_type = 'found'),
  constraint report_matches_lost_report_fkey
    foreign key (lost_report_id, lost_report_type)
    references public.reports (id, report_type)
    on delete cascade,
  constraint report_matches_found_report_fkey
    foreign key (found_report_id, found_report_type)
    references public.reports (id, report_type)
    on delete cascade,
  constraint report_matches_pair_key
    unique (lost_report_id, found_report_id),
  -- Lets a verification point only at a "match" suggestion for the same lost report.
  constraint report_matches_id_lost_report_ai_decision_key
    unique (id, lost_report_id, ai_decision),
  constraint report_matches_explanation_not_blank
    check (char_length(trim(explanation)) > 0),
  constraint report_matches_explanation_length
    check (char_length(explanation) <= 1000),
  constraint report_matches_model_not_blank
    check (char_length(trim(model)) > 0),
  constraint report_matches_model_length
    check (char_length(model) <= 100),
  constraint report_matches_ai_decision_check
    check (ai_decision in ('match', 'insufficient_information')),
  constraint report_matches_status_check
    check (status = 'pending_review'),
  constraint report_matches_supporting_details_size
    check (cardinality(supporting_details) <= 5
      and char_length(array_to_string(supporting_details, '')) <= 1500),
  constraint report_matches_contradictions_size
    check (cardinality(contradictions) <= 5
      and char_length(array_to_string(contradictions, '')) <= 1500),
  constraint report_matches_missing_information_size
    check (cardinality(missing_information) <= 5
      and char_length(array_to_string(missing_information, '')) <= 1500),
  constraint report_matches_ai_similarity_score_range
    check (ai_similarity_score between 0 and 100)
);

-- report_matches_pair_key already indexes lost_report_id first.
create index report_matches_found_report_id_idx
  on public.report_matches (found_report_id);

-- Every completed AI comparison, including no_match, so a pair is never sent
-- to Gemini twice. Failed comparisons are not recorded.
create table public.report_pair_checks (
  lost_report_id uuid not null,
  lost_report_type text not null default 'lost',
  found_report_id uuid not null,
  found_report_type text not null default 'found',
  ai_decision text not null,
  model text not null,
  checked_at timestamptz not null default now(),

  constraint report_pair_checks_pkey
    primary key (lost_report_id, found_report_id),
  constraint report_pair_checks_lost_report_type_check
    check (lost_report_type = 'lost'),
  constraint report_pair_checks_found_report_type_check
    check (found_report_type = 'found'),
  constraint report_pair_checks_lost_report_fkey
    foreign key (lost_report_id, lost_report_type)
    references public.reports (id, report_type)
    on delete cascade,
  constraint report_pair_checks_found_report_fkey
    foreign key (found_report_id, found_report_type)
    references public.reports (id, report_type)
    on delete cascade,
  constraint report_pair_checks_ai_decision_check
    check (ai_decision in ('match', 'no_match', 'insufficient_information')),
  constraint report_pair_checks_model_not_blank
    check (char_length(trim(model)) > 0),
  constraint report_pair_checks_model_length
    check (char_length(model) <= 100)
);

-- The primary key already indexes lost_report_id first.
create index report_pair_checks_found_report_id_idx
  on public.report_pair_checks (found_report_id);

-- One row per public submission. token_hash is the SHA-256 hex digest of the
-- private tracking credential; the credential itself is never stored.
-- processing_until is a short lease so one request at a time runs matching.
create table public.report_submissions (
  report_id uuid primary key references public.reports (id) on delete cascade,
  token_hash text not null,
  processing_until timestamptz,
  created_at timestamptz not null default now(),

  constraint report_submissions_token_hash_key unique (token_hash),
  constraint report_submissions_token_hash_format
    check (token_hash ~ '^[0-9a-f]{64}$')
);

-- Ownership questions for a lost report's top "match" suggestion. One per lost report.
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

-- One answer per question. Answers are never changed after they are saved.
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

-- Staff decisions as an append-only log. Each entry names the one before it;
-- the unique (verification_id, previous_decision_id) key stops two staff
-- actions from branching the log, and the checks allow only
-- pending -> approved/rejected -> pending.
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

-- One optional staff follow-up question per claim, and one owner answer.
create table public.ownership_followups (
  verification_id uuid primary key
    references public.ownership_verifications (id) on delete cascade,
  question text not null,
  created_at timestamptz not null default now(),

  constraint ownership_followups_question_not_blank
    check (char_length(trim(question)) > 0),
  constraint ownership_followups_question_length
    check (char_length(question) <= 500)
);

create table public.ownership_followup_answers (
  verification_id uuid primary key
    references public.ownership_followups (verification_id) on delete cascade,
  answer text not null,
  created_at timestamptz not null default now(),

  constraint ownership_followup_answers_answer_not_blank
    check (char_length(trim(answer)) > 0),
  constraint ownership_followup_answers_answer_length
    check (char_length(answer) <= 1000)
);

-- Aggregate history of matching runs for monitoring: counts, timings and
-- failure kinds only. Never report IDs, text, credentials or keys.
create table public.matching_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  finished_at timestamptz not null default now(),
  duration_ms integer not null,
  requests smallint not null,
  checked integer not null,
  matched integer not null,
  uncertain integer not null,
  no_match integer not null,
  failed integer not null,
  already_saved integer not null,
  -- Unchecked pairs left after the run; null when the run could not load its data.
  remaining integer,
  failure text,
  stopped_for_time boolean not null default false,
  model text not null,

  constraint matching_runs_source_check
    check (source in ('admin', 'auto')),
  constraint matching_runs_counts_check
    check (duration_ms >= 0 and requests >= 0 and checked >= 0 and matched >= 0
      and uncertain >= 0 and no_match >= 0 and failed >= 0 and already_saved >= 0
      and (remaining is null or remaining >= 0)),
  constraint matching_runs_failure_check
    check (failure is null or failure in (
      'quota', 'timeout', 'api', 'invalid_response', 'config', 'save', 'load', 'usage_limit'
    )),
  constraint matching_runs_model_not_blank
    check (char_length(trim(model)) > 0),
  constraint matching_runs_model_length
    check (char_length(model) <= 100)
);

create index matching_runs_finished_at_idx
  on public.matching_runs (finished_at desc);

-- Append-only staff notes on a lost/found pair.
create table public.report_candidate_reviews (
  id uuid primary key default gen_random_uuid(),
  lost_report_id uuid not null,
  lost_report_type text not null default 'lost',
  found_report_id uuid not null,
  found_report_type text not null default 'found',
  action text not null,
  note text,
  created_at timestamptz not null default now(),

  constraint report_candidate_reviews_lost_report_type_check
    check (lost_report_type = 'lost'),
  constraint report_candidate_reviews_found_report_type_check
    check (found_report_type = 'found'),
  constraint report_candidate_reviews_action_check
    check (action in ('ownership_review', 'dismissed')),
  constraint report_candidate_reviews_note_length
    check (note is null or (char_length(trim(note)) > 0 and char_length(note) <= 500)),
  constraint report_candidate_reviews_lost_report_fkey
    foreign key (lost_report_id, lost_report_type)
    references public.reports (id, report_type)
    on delete cascade,
  constraint report_candidate_reviews_found_report_fkey
    foreign key (found_report_id, found_report_type)
    references public.reports (id, report_type)
    on delete cascade
);

create index report_candidate_reviews_pair_idx
  on public.report_candidate_reviews (lost_report_id, found_report_id, created_at desc);

-- One row per usage-limit bucket, for example a UTC day and a hashed IP.
-- The bucket text is a key, never report text, answers or an API key.
create table public.usage_counters (
  bucket text primary key,
  count integer not null,

  constraint usage_counters_bucket_length
    check (char_length(bucket) between 1 and 200),
  constraint usage_counters_count_nonnegative
    check (count >= 0)
);

-- Atomically takes one slot from every bucket, or takes none: the exception
-- rolls back every increment made before the blocked bucket.
-- Returns 'ok', a blocked label (gemini_app, gemini_ip, gemini_report,
-- submit_hour, submit_day), or 'unavailable'.
create function public.consume_usage(
  p_buckets text[],
  p_limits integer[],
  p_labels text[]
)
returns text
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  n integer;
  i integer;
  taken integer;
begin
  n := coalesce(array_length(p_buckets, 1), 0);
  if n < 1 or n > 6
     or array_length(p_limits, 1) is distinct from n
     or array_length(p_labels, 1) is distinct from n then
    return 'unavailable';
  end if;

  for i in 1..n loop
    if p_labels[i] not in (
      'gemini_app', 'gemini_ip', 'gemini_report', 'submit_hour', 'submit_day'
    )
    or p_limits[i] is null or p_limits[i] < 1 or p_limits[i] > 100000
    or p_buckets[i] is null
    or char_length(p_buckets[i]) < 1
    or char_length(p_buckets[i]) > 200
    or p_buckets[i] !~ '^(gemini:(app|ip|report)|submit:ip):[A-Za-z0-9_.:-]+$' then
      return 'unavailable';
    end if;
  end loop;

  for i in 1..n loop
    insert into public.usage_counters as counters (bucket, count)
    values (p_buckets[i], 1)
    on conflict (bucket) do update
      set count = counters.count + 1
      where counters.count < p_limits[i];

    get diagnostics taken = row_count;
    if taken = 0 then
      raise exception 'usage_blocked:%', p_labels[i];
    end if;
  end loop;

  return 'ok';
exception
  when others then
    if sqlerrm like 'usage_blocked:%' then
      return substr(sqlerrm, 15);
    end if;
    return 'unavailable';
end;
$$;

-- Functions are executable by every role by default; only the owner needs it.
revoke all on function public.consume_usage(text[], integer[], text[]) from public;
