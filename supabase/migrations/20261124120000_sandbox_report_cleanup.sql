-- Test mode cleanup (AMANAH_SANDBOX=1): lets the server delete visitors'
-- reports. Related rows go with them through the existing ON DELETE CASCADE
-- foreign keys; cascades run as the table owner, so no other grant is needed.
-- Only the server-only route /api/sandbox/cleanup deletes, and only in test mode.
-- This file is not applied by the app. Apply it yourself before the first cleanup.
-- Local database: supabase migration up
-- Linked hosted database, when you mean to change it: supabase db push

grant delete on table public.reports to service_role;
