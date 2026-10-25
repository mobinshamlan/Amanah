-- Optional staff follow-up question on an ownership claim.
-- Staff may ask one plain-language question on a claim that has no current decision. The owner answers
-- once, on their private tracking page. Neither row approves, rejects, or scores anything; staff decide.
-- The primary keys allow one question per claim and one answer per question. Rows are insert-only,
-- like the other ownership tables: nothing here updates or deletes existing data, and no existing
-- table or column is changed.
-- Private tables: no public grants. Only the server-only admin client (service_role) reads and inserts.

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

alter table public.ownership_followups enable row level security;
alter table public.ownership_followup_answers enable row level security;

revoke all on table public.ownership_followups from public;
revoke all on table public.ownership_followups from anon, authenticated, service_role;
revoke all on table public.ownership_followup_answers from public;
revoke all on table public.ownership_followup_answers from anon, authenticated, service_role;

grant select on table public.ownership_followups to service_role;
grant insert (verification_id, question)
  on table public.ownership_followups to service_role;

grant select on table public.ownership_followup_answers to service_role;
grant insert (verification_id, answer)
  on table public.ownership_followup_answers to service_role;
