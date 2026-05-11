-- Building manager invite-residents flow + notifications inbox support

-- ============================================================
-- 1. Building invites
-- ============================================================
create table if not exists building_invites (
  id           uuid primary key default gen_random_uuid(),
  building_id  uuid not null references buildings(id) on delete cascade,
  invited_by   uuid not null references profiles(id) on delete set null,
  email        text not null,
  unit_number  text,
  full_name    text,
  token        text unique,
  status       text not null default 'sent' check (status in ('sent', 'opened', 'accepted', 'bounced')),
  sent_at      timestamptz not null default now(),
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists building_invites_building_idx on building_invites (building_id);
create index if not exists building_invites_email_idx    on building_invites (email);
create index if not exists building_invites_token_idx    on building_invites (token);

alter table building_invites enable row level security;

drop policy if exists building_invites_manager on building_invites;
create policy building_invites_manager on building_invites for all using (
  exists (select 1 from buildings b where b.id = building_id and b.manager_id = auth.uid())
);

drop policy if exists building_invites_admin on building_invites;
create policy building_invites_admin on building_invites for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Anyone with the token can read their own invite (used by /signup?invite=)
drop policy if exists building_invites_token_read on building_invites;
create policy building_invites_token_read on building_invites for select using (true);

-- ============================================================
-- 2. Notifications: ensure the table accepts updates from recipient
--    (table created in 0001_init.sql)
-- ============================================================
do $$ begin
  drop policy if exists notifications_recipient_read on notifications;
  drop policy if exists notifications_recipient_update on notifications;
exception when others then null; end $$;

create policy notifications_recipient_read on notifications for select using (recipient_id = auth.uid());
create policy notifications_recipient_update on notifications for update using (recipient_id = auth.uid());
