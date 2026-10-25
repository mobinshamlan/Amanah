-- Aggregate history of automatic and staff matching runs, for the local admin monitoring view.
-- One row per bounded matching batch: when it finished, how long it took, counts, and the failure kind.
-- It never holds report IDs, report text, credentials, keys, questions, or answers.
-- A failed or unfinished run is recorded with its failure kind; its unchecked pairs are never "no match".
-- Private table: no public grants. Only the server-only admin client (service_role) reads and inserts.
-- Nothing here updates or deletes existing rows.

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
    check (failure is null
      or failure in ('quota', 'timeout', 'api', 'invalid_response', 'config', 'save', 'load')),
  constraint matching_runs_model_not_blank
    check (char_length(trim(model)) > 0),
  constraint matching_runs_model_length
    check (char_length(model) <= 100)
);

create index matching_runs_finished_at_idx
  on public.matching_runs (finished_at desc);

alter table public.matching_runs enable row level security;

revoke all on table public.matching_runs from public;
revoke all on table public.matching_runs from anon, authenticated, service_role;

grant select on table public.matching_runs to service_role;
grant insert (
  source, duration_ms, requests, checked, matched, uncertain, no_match,
  failed, already_saved, remaining, failure, stopped_for_time, model
) on table public.matching_runs to service_role;
