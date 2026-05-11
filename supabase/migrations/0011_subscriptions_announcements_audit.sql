-- Subscription state, announcements, audit log

-- ============================================================
-- 1. Resident subscription state (pause/cancel)
-- ============================================================
do $$ begin
  create type subscription_state as enum ('active', 'paused', 'cancelled');
exception when duplicate_object then null; end $$;

alter table residents add column if not exists subscription_state subscription_state not null default 'active';
alter table residents add column if not exists subscription_paused_until date;
alter table residents add column if not exists subscription_cancelled_at timestamptz;

-- Backfill from is_subscribed
update residents set subscription_state = 'active' where is_subscribed = true and subscription_state is null;

-- ============================================================
-- 2. Announcements (manager → residents)
-- ============================================================
create table if not exists announcements (
  id            uuid primary key default gen_random_uuid(),
  building_id   uuid not null references buildings(id) on delete cascade,
  author_id     uuid not null references profiles(id) on delete set null,
  subject       text not null,
  body          text not null,
  sent_count    int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists announcements_building_idx on announcements (building_id, created_at desc);

alter table announcements enable row level security;
drop policy if exists announcements_manager on announcements;
create policy announcements_manager on announcements for all using (
  exists (select 1 from buildings b where b.id = building_id and b.manager_id = auth.uid())
);
drop policy if exists announcements_resident_read on announcements;
create policy announcements_resident_read on announcements for select using (
  exists (select 1 from residents r where r.building_id = announcements.building_id and r.profile_id = auth.uid())
);

-- ============================================================
-- 3. Audit log
-- ============================================================
create table if not exists audit_logs (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references profiles(id) on delete set null,
  actor_role    text,
  action        text not null,
  entity_type   text,
  entity_id     uuid,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists audit_logs_actor_idx     on audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_entity_idx    on audit_logs (entity_type, entity_id, created_at desc);
create index if not exists audit_logs_action_idx    on audit_logs (action, created_at desc);

alter table audit_logs enable row level security;
drop policy if exists audit_logs_admin on audit_logs;
create policy audit_logs_admin on audit_logs for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
