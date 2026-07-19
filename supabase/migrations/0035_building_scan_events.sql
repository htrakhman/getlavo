-- ============================================================
-- QR / landing attribution: page views + completed signups per building slug.
-- Written only via the service role (API routes / server components);
-- RLS is enabled with no policies so anon/authenticated clients cannot
-- read or write it directly.
-- ============================================================

create table if not exists building_scan_events (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null,
  building_id uuid references buildings(id) on delete set null,
  event_type  text not null check (event_type in ('page_view', 'signup')),
  profile_id  uuid references profiles(id) on delete set null,
  user_agent  text,
  referrer    text,
  created_at  timestamptz not null default now()
);

create index if not exists building_scan_events_slug_idx
  on building_scan_events (slug, event_type, created_at);

alter table building_scan_events enable row level security;
