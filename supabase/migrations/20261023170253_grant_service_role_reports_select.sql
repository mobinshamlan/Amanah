-- Local admin reads reports with the server-only secret key (service_role).
-- Public roles stay insert-only. This does not grant SELECT to anon or authenticated.

grant select on table public.reports to service_role;
