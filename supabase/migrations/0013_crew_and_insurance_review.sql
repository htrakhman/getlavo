-- Operator crew members + insurance admin approval

-- ============================================================
-- 1. Crew members (operator's staff)
-- ============================================================
create table if not exists crew_members (
  id          uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id) on delete cascade,
  full_name   text not null,
  phone       text,
  email       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists crew_members_operator_idx on crew_members (operator_id, active);

alter table crew_members enable row level security;
drop policy if exists crew_members_owner on crew_members;
create policy crew_members_owner on crew_members for all using (
  exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid())
);

-- ============================================================
-- 2. Insurance review state
-- ============================================================
do $$ begin
  create type insurance_review_status as enum ('not_uploaded', 'pending_review', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

alter table operators add column if not exists insurance_review_status insurance_review_status not null default 'not_uploaded';
alter table operators add column if not exists insurance_reviewed_at   timestamptz;
alter table operators add column if not exists insurance_reviewed_by   uuid references profiles(id) on delete set null;
alter table operators add column if not exists insurance_review_note   text;
