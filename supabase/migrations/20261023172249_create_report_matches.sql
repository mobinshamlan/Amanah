-- AI-detected links between one lost report and one found report.
-- Private table: no public grants. Only the server-only admin client (service_role) reads and inserts.
-- A link does not confirm ownership or authorize a return.

-- Lets report_matches reference (id, report_type) so each side is forced to the right report type.
alter table public.reports
  add constraint reports_id_report_type_key unique (id, report_type);

create table public.report_matches (
  id uuid primary key default gen_random_uuid(),
  lost_report_id uuid not null,
  lost_report_type text not null default 'lost',
  found_report_id uuid not null,
  found_report_type text not null default 'found',
  explanation text not null,
  model text not null,
  created_at timestamptz not null default now(),

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

  constraint report_matches_explanation_not_blank
    check (char_length(trim(explanation)) > 0),
  constraint report_matches_explanation_length
    check (char_length(explanation) <= 1000),
  constraint report_matches_model_not_blank
    check (char_length(trim(model)) > 0),
  constraint report_matches_model_length
    check (char_length(model) <= 100)
);

-- report_matches_pair_key already indexes lost_report_id first.
create index report_matches_found_report_id_idx
  on public.report_matches (found_report_id);

alter table public.report_matches enable row level security;

revoke all on table public.report_matches from public;
revoke all on table public.report_matches from anon, authenticated, service_role;

grant select, insert on table public.report_matches to service_role;
