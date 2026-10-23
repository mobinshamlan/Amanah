-- One row per public report submission, for automatic matching.
-- token_hash is the SHA-256 hex digest of the submission credential returned once to the
-- submitter's browser. The credential itself is never stored. A report ID alone authorizes nothing.
-- processing_until is a short lease so only one request processes a report's matching at a time.
-- Private table: no public grants. Only the server-only admin client (service_role) uses it.

create table public.report_submissions (
  report_id uuid primary key references public.reports (id) on delete cascade,
  token_hash text not null,
  processing_until timestamptz,
  created_at timestamptz not null default now(),

  constraint report_submissions_token_hash_key unique (token_hash),
  constraint report_submissions_token_hash_format
    check (token_hash ~ '^[0-9a-f]{64}$')
);

alter table public.report_submissions enable row level security;

revoke all on table public.report_submissions from public;
revoke all on table public.report_submissions from anon, authenticated, service_role;

grant select on table public.report_submissions to service_role;
grant insert (report_id, token_hash) on table public.report_submissions to service_role;
grant update (processing_until) on table public.report_submissions to service_role;
