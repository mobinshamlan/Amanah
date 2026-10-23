-- Staff membership is stored in a table that visitors cannot write to.
-- Authorization does not use user_metadata (that field is user-editable).

create table public.staff_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.staff_members enable row level security;

revoke all on table public.staff_members from public;
revoke all on table public.staff_members from anon, authenticated;

grant select on table public.staff_members to authenticated;

create policy "Staff can read their own membership"
  on public.staff_members
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on table public.reports to authenticated;

create policy "Staff can read reports"
  on public.reports
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.staff_members
      where staff_members.user_id = (select auth.uid())
    )
  );
