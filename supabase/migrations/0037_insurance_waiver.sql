-- ============================================================
-- Insurance verification hardening + resident waiver acceptance.
--
-- 1. 'expired' state for the insurance review lifecycle
-- 2. Policy number + coverage amount metadata on operators
-- 3. Expiry reminder bookkeeping (one reminder per policy)
-- 4. waiver_acceptances: provable one time resident acknowledgment
--    recorded at first booking (profile, resident, version, timestamp)
-- 5. Storage policies for the private insurance-docs bucket. The bucket
--    is declared private in scripts/setup-storage.ts but had no object
--    policies, so browser uploads failed and stored public URLs 404'd.
--    Uploads now allowed into the operator's own folder (path prefix =
--    operator id); viewing goes through short lived signed URLs.
-- ============================================================

alter type insurance_review_status add value if not exists 'expired';

alter table operators
  add column if not exists insurance_policy_number         text,
  add column if not exists insurance_coverage_amount_cents bigint,
  add column if not exists insurance_expiry_notified_at    timestamptz;

-- ------------------------------------------------------------
-- Resident waiver acceptances
-- ------------------------------------------------------------
create table if not exists waiver_acceptances (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references profiles(id) on delete cascade,
  resident_id    uuid references residents(id) on delete set null,
  waiver_version text not null,
  accepted_at    timestamptz not null default now(),
  unique (profile_id, waiver_version)
);
create index if not exists waiver_acceptances_profile_idx on waiver_acceptances (profile_id);

alter table waiver_acceptances enable row level security;
-- Rows are written by the booking API via the service role; residents can
-- read their own acceptance.
drop policy if exists waiver_acceptances_own_read on waiver_acceptances;
create policy waiver_acceptances_own_read on waiver_acceptances for select
  using (profile_id = auth.uid());

grant select on waiver_acceptances to authenticated;
grant all on waiver_acceptances to service_role;

-- ------------------------------------------------------------
-- insurance-docs bucket policies (bucket stays private)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('insurance-docs', 'insurance-docs', false)
  on conflict (id) do nothing;

drop policy if exists insurance_docs_upload on storage.objects;
create policy insurance_docs_upload
  on storage.objects for insert
  with check (
    bucket_id = 'insurance-docs'
    and exists (
      select 1 from operators o
      where o.owner_id = auth.uid()
        and (storage.foldername(name))[1] = o.id::text
    )
  );

drop policy if exists insurance_docs_update on storage.objects;
create policy insurance_docs_update
  on storage.objects for update
  using (
    bucket_id = 'insurance-docs'
    and exists (
      select 1 from operators o
      where o.owner_id = auth.uid()
        and (storage.foldername(name))[1] = o.id::text
    )
  );

drop policy if exists insurance_docs_owner_read on storage.objects;
create policy insurance_docs_owner_read
  on storage.objects for select
  using (
    bucket_id = 'insurance-docs'
    and exists (
      select 1 from operators o
      where o.owner_id = auth.uid()
        and (storage.foldername(name))[1] = o.id::text
    )
  );
