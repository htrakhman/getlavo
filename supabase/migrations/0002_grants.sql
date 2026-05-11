-- Restore default Supabase role grants after schema recreation
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant select on all tables in schema public to anon;

grant all on all sequences in schema public to authenticated;
grant all on all sequences in schema public to service_role;

alter default privileges in schema public
  grant all on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to authenticated;
