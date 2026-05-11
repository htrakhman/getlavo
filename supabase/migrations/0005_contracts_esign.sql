-- Contract management & e-signature layer
-- Adds garage_operators, multi-party signing, document storage links, expanded status.

-- ============================================================
-- garage_operators (third-party garage managers like Metropolis)
-- ============================================================
create table garage_operators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now()
);

alter table garage_operators enable row level security;
create policy garage_operators_read on garage_operators for select using (true);

-- A building optionally has a third-party garage operator
alter table buildings add column garage_operator_id uuid references garage_operators(id) on delete set null;

-- ============================================================
-- Expanded contract status
-- ============================================================
alter type contract_status add value if not exists 'draft';
alter type contract_status add value if not exists 'pending_signatures';
alter type contract_status add value if not exists 'expiring_soon';

-- ============================================================
-- Contract metadata extensions
-- ============================================================
alter table contracts add column governing_law text not null default 'New Jersey';
alter table contracts add column service_day text; -- 'Monday', 'Tuesday', etc.
alter table contracts add column garage_operator_id uuid references garage_operators(id) on delete set null;
alter table contracts add column fully_executed_at timestamptz;
alter table contracts add column renewal_reminder_sent_at timestamptz;
alter table contracts add column cancelled_at timestamptz;
alter table contracts add column cancellation_reason text;

-- Allow draft contracts to skip starts_on/ends_on initial requirement (loosened)
alter table contracts alter column starts_on drop not null;
alter table contracts alter column ends_on drop not null;
alter table contracts alter column price_per_wash_cents drop not null;

-- ============================================================
-- contract_parties: who must sign
-- ============================================================
create type contract_party_role as enum ('building_manager', 'car_wash_company', 'garage_operator');

create table contract_parties (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  role contract_party_role not null,
  profile_id uuid references profiles(id) on delete set null,
  full_name text not null,
  email text not null,
  signing_token text not null unique,
  signed_at timestamptz,
  signature_text text,
  signed_ip text,
  signed_user_agent text,
  invited_at timestamptz not null default now(),
  reminder_sent_at timestamptz,
  unique (contract_id, role)
);

create index contract_parties_contract_idx on contract_parties(contract_id);
create index contract_parties_token_idx on contract_parties(signing_token);

alter table contract_parties enable row level security;

-- A party can read their own row by signing_token (anon access via API);
-- contract participants (manager/operator owner) can read their parties.
create policy contract_parties_read on contract_parties for select using (
  exists (
    select 1 from contracts c
    join buildings b on b.id = c.building_id
    where c.id = contract_id and b.manager_id = auth.uid()
  )
  or exists (
    select 1 from contracts c
    join operators o on o.id = c.operator_id
    where c.id = contract_id and o.owner_id = auth.uid()
  )
  or profile_id = auth.uid()
);

-- ============================================================
-- contract_signatures: append-only audit trail of every sign event
-- ============================================================
create table contract_signatures (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  party_id uuid not null references contract_parties(id) on delete cascade,
  signature_text text not null,
  signed_at timestamptz not null default now(),
  ip_address text,
  user_agent text
);

create index contract_signatures_contract_idx on contract_signatures(contract_id);

alter table contract_signatures enable row level security;
create policy contract_signatures_read on contract_signatures for select using (
  exists (
    select 1 from contracts c
    join buildings b on b.id = c.building_id
    where c.id = contract_id and b.manager_id = auth.uid()
  )
  or exists (
    select 1 from contracts c
    join operators o on o.id = c.operator_id
    where c.id = contract_id and o.owner_id = auth.uid()
  )
);

-- ============================================================
-- contract_documents: PDFs in Supabase storage
-- ============================================================
create type contract_document_kind as enum ('draft', 'executed');

create table contract_documents (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  kind contract_document_kind not null,
  storage_path text not null, -- e.g. contracts/<contract_id>/draft.pdf
  size_bytes int,
  sha256 text,
  generated_at timestamptz not null default now()
);

create index contract_documents_contract_idx on contract_documents(contract_id);

alter table contract_documents enable row level security;
create policy contract_documents_read on contract_documents for select using (
  exists (
    select 1 from contracts c
    join buildings b on b.id = c.building_id
    where c.id = contract_id and b.manager_id = auth.uid()
  )
  or exists (
    select 1 from contracts c
    join operators o on o.id = c.operator_id
    where c.id = contract_id and o.owner_id = auth.uid()
  )
);

-- ============================================================
-- Storage bucket for contract PDFs
-- ============================================================
insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

-- Storage policies: only contract participants can read.
create policy "contracts storage read" on storage.objects for select
using (
  bucket_id = 'contracts'
  and exists (
    select 1
    from contract_documents cd
    join contracts c on c.id = cd.contract_id
    left join buildings b on b.id = c.building_id
    left join operators o on o.id = c.operator_id
    where cd.storage_path = storage.objects.name
      and (b.manager_id = auth.uid() or o.owner_id = auth.uid())
  )
);
