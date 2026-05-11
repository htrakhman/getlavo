-- Run this FIRST to wipe any partial schema, then run 0001_init.sql
drop schema public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres;
