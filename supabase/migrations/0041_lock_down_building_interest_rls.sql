-- Lock down public.building_interest.
--
-- This table captures inbound lead data (building_name / building_id / email)
-- from the marketing "request my building" form and the /b/[slug] notify-me
-- form. It contains PII (email) and is meant to be read only by internal
-- admins, out of band.
--
-- It shipped with RLS DISABLED *and* a SELECT grant to `anon`, so anyone
-- holding the public anon key (which is every browser) could read every lead,
-- and `authenticated` users could read/insert/update/delete at will.
--
-- Every legitimate write goes through app/api/building-interest using the
-- service role (supabaseAdmin), which bypasses RLS and is unaffected by this
-- change. There is no client-side (anon/authenticated) read or write path in
-- the app. So the correct posture is: no access for anon/authenticated at all.

-- Enable RLS and add no permissive policies: with RLS on and no policy,
-- anon/authenticated are denied, while service_role continues to bypass RLS.
alter table public.building_interest enable row level security;

-- Defense in depth: drop the public table grants so the table stays closed
-- even if a policy is ever added by mistake. Least privilege for lead PII.
revoke all on public.building_interest from anon;
revoke all on public.building_interest from authenticated;
