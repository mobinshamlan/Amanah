-- Append-only staff notes on a lost/found pair.
-- "ownership_review" means staff want the pair checked later. It does not verify
-- ownership or approve a handover. "dismissed" means staff decided it is not the same item.
-- Rows are insert-only, like the ownership decision log. Nothing here updates a saved AI result.
-- Private table: no public grants. Only the server-only admin client (service_role) reads and inserts.
-- This file is not applied by the app. Apply it locally when you want the buttons to save.
-- Do not apply it to a hosted database unless you mean to change that database.

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

alter table public.report_candidate_reviews enable row level security;

revoke all on table public.report_candidate_reviews from public;
revoke all on table public.report_candidate_reviews from anon, authenticated, service_role;

grant select on table public.report_candidate_reviews to service_role;
grant insert (lost_report_id, found_report_id, action, note)
  on table public.report_candidate_reviews to service_role;
