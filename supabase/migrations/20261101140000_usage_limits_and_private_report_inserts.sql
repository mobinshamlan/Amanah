-- Durable usage counters and closing anonymous report inserts.
-- This file is not applied by the app. Apply it yourself before relying on the limits.
-- Local database: supabase migration up
-- Linked hosted database, when you mean to change it: supabase db push
-- Do not treat this migration as already applied.

-- Anonymous and logged-in clients could insert reports directly and skip the
-- app's submission limit. Inserts now belong to the server (service_role) only.
drop policy if exists "Anyone can submit reports" on public.reports;

revoke insert on table public.reports from anon, authenticated;

grant insert (id, report_type, item_name, description, location)
  on table public.reports to service_role;

-- One row per limit bucket, for example a UTC day and a hashed IP.
-- The bucket text is a key, never report text, answers, or an API key.
create table public.usage_counters (
  bucket text primary key,
  count integer not null,

  constraint usage_counters_bucket_length
    check (char_length(bucket) between 1 and 200),
  constraint usage_counters_count_nonnegative
    check (count >= 0)
);

alter table public.usage_counters enable row level security;

revoke all on table public.usage_counters from public;
revoke all on table public.usage_counters from anon, authenticated, service_role;

-- Atomically takes one slot from every bucket, or takes none.
-- Returns 'ok', a blocked label (gemini_app, gemini_ip, gemini_report,
-- submit_hour, submit_day), or 'unavailable'.
create function public.consume_usage(
  p_buckets text[],
  p_limits integer[],
  p_labels text[]
)
returns text
language plpgsql
security definer
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

revoke all on function public.consume_usage(text[], integer[], text[]) from public;
revoke all on function public.consume_usage(text[], integer[], text[]) from anon, authenticated;
grant execute on function public.consume_usage(text[], integer[], text[]) to service_role;

-- Record an app usage block separately from a Gemini 429.
alter table public.matching_runs drop constraint matching_runs_failure_check;

alter table public.matching_runs add constraint matching_runs_failure_check
  check (
    failure is null
    or failure in (
      'quota',
      'timeout',
      'api',
      'invalid_response',
      'config',
      'save',
      'load',
      'usage_limit'
    )
  );
