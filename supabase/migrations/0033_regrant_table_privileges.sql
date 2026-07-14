-- ============================================================
-- 0033: Re-apply role grants to ALL tables.
--
-- 0002_grants.sql granted privileges on tables that existed at the time,
-- and set default privileges — but "alter default privileges" only covers
-- objects created by the same role that ran it. Tables created in later
-- migrations (bookings in 0007, and everything after) can end up with no
-- grants for the authenticated role, making every RLS-scoped read fail
-- with permission denied (pages render as empty lists) while
-- service-role access keeps working. Re-run the blanket grants; RLS
-- policies still control row visibility.
-- ============================================================

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant select on all tables in schema public to anon;

grant all on all sequences in schema public to authenticated;
grant all on all sequences in schema public to service_role;

alter default privileges in schema public
  grant all on tables to authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to authenticated, service_role;
