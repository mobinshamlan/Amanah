-- Every completed AI comparison of one lost and one found report, including no_match,
-- so matching runs do not send the same pair to Gemini again. Failed comparisons are not recorded.
-- Private table: no public grants. Only the server-only admin client (service_role) reads and inserts.

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

alter table public.report_pair_checks enable row level security;

revoke all on table public.report_pair_checks from public;
revoke all on table public.report_pair_checks from anon, authenticated, service_role;

grant select on table public.report_pair_checks to service_role;
grant insert (lost_report_id, found_report_id, ai_decision, model)
  on table public.report_pair_checks to service_role;
