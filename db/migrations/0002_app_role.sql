-- The app connects as amanah_app, a login role with only the privileges the
-- queries in src/utils/db/queries.ts need. The owner role (DATABASE_URL_UNPOOLED)
-- is kept for migrations and imports.
--
-- amanah_app's password is never in this file. Set it out of band after
-- applying this migration (see "Database roles" in README.md):
--   alter role amanah_app password '<generated>';
--
-- Safe to run again: roles are created only when missing and grants repeat.

do $$
begin
  if not exists (select from pg_catalog.pg_roles where rolname = 'amanah_app') then
    create role amanah_app login;
  end if;
  -- Owns consume_usage and nothing else. It cannot log in.
  if not exists (select from pg_catalog.pg_roles where rolname = 'amanah_usage_owner') then
    create role amanah_usage_owner nologin;
  end if;
end
$$;

-- Nobody but the schema owner creates objects in public.
revoke create on schema public from public;
grant usage on schema public to amanah_app, amanah_usage_owner;

-- Start from nothing, then grant exactly what the queries use.
revoke all on all tables in schema public from amanah_app;
revoke all on all functions in schema public from amanah_app;

-- Reports: read, add, and delete (test-mode cleanup only; related rows go
-- through ON DELETE CASCADE, which runs with the table owner's rights).
grant select, insert, delete on public.reports to amanah_app;

-- Submissions: read, add, and move only the matching lease.
grant select, insert on public.report_submissions to amanah_app;
grant update (processing_until) on public.report_submissions to amanah_app;

-- Append-only tables: read and add, never change or remove.
grant select, insert on
  public.report_matches,
  public.report_pair_checks,
  public.report_candidate_reviews,
  public.ownership_verifications,
  public.ownership_answers,
  public.ownership_assessments,
  public.ownership_followups,
  public.ownership_followup_answers,
  public.ownership_decisions,
  public.matching_runs
  to amanah_app;

-- usage_counters is reachable only through consume_usage.
revoke all on public.usage_counters from public, amanah_app;
grant select, insert, update on public.usage_counters to amanah_usage_owner;

-- Hand consume_usage to amanah_usage_owner and run it with that role's rights.
-- The new owner needs CREATE on the schema at the moment of the change only.
grant amanah_usage_owner to current_user;
grant create on schema public to amanah_usage_owner;
alter function public.consume_usage(text[], integer[], text[]) owner to amanah_usage_owner;
revoke create on schema public from amanah_usage_owner;

-- Every name in the body is schema-qualified; pg_temp last so no temporary
-- object can stand in for one.
alter function public.consume_usage(text[], integer[], text[])
  security definer
  set search_path = pg_catalog, pg_temp;

revoke all on function public.consume_usage(text[], integer[], text[]) from public;
grant execute on function public.consume_usage(text[], integer[], text[]) to amanah_app;
