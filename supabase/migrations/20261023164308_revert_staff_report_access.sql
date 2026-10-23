-- Undo staff-read access added for the unused sign-in plan.
-- Public and signed-in visitors stay insert-only on reports.

drop policy if exists "Staff can read reports" on public.reports;
revoke select on table public.reports from authenticated;

drop policy if exists "Staff can read their own membership" on public.staff_members;
revoke all on table public.staff_members from public;
revoke all on table public.staff_members from anon, authenticated;

drop table if exists public.staff_members;
