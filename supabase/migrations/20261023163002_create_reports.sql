-- Lost/found reports submitted by visitors.
-- Public (anon) may INSERT only. No SELECT, UPDATE, or DELETE for public roles.

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
    check (char_length(location) <= 500)
);

alter table public.reports enable row level security;

revoke all on table public.reports from public;
revoke all on table public.reports from anon, authenticated;

grant insert on table public.reports to anon, authenticated;

create policy "Anyone can submit reports"
  on public.reports
  for insert
  to anon, authenticated
  with check (
    report_type in ('lost', 'found')
    and char_length(trim(item_name)) > 0
    and char_length(trim(description)) > 0
    and char_length(trim(location)) > 0
    and char_length(item_name) <= 200
    and char_length(description) <= 2000
    and char_length(location) <= 500
  );
