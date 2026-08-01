-- Approve operators automatically once their profile is complete.
--
-- Onboarding had a manual step in the middle: an operator who filled in
-- everything still sat at `pending_review` until an admin flipped their status,
-- so no building could request them and no resident could book them. Nothing
-- about that review was mechanical — it was a human gate on a checklist a
-- machine can evaluate.
--
-- `operator_profile_complete` is the SQL mirror of operatorRequirements() in
-- lib/operator-readiness.ts: business name, an open wash day, a base price, at
-- least one active service package, a connected Stripe account, and an uploaded
-- certificate of insurance. When all six hold, status flips to 'approved'.
--
-- Only ever promotes, and only from 'pending_review'. 'suspended' and
-- 'rejected' are deliberate admin decisions and must never be undone by a data
-- change; an operator who later deletes their last package keeps 'approved' but
-- stops being requestable, because the app recomputes readiness from the
-- profile on every read rather than trusting status alone.

create or replace function public.operator_profile_complete(op public.operators)
  returns boolean
  language sql
  stable
as $$
  select coalesce(op.name, '') <> ''
     and coalesce(op.base_price_cents, 0) > 0
     and coalesce(op.stripe_onboarding_complete, false)
     and op.insurance_doc_url is not null
     -- At least one day the crew is open. Mirrors openWashDays(): a day counts
     -- unless it is explicitly closed.
     and exists (
       select 1
       from jsonb_each(coalesce(op.hours_json, '{}'::jsonb)) as h(day, val)
       where h.day in ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')
         and jsonb_typeof(h.val) = 'object'
         and coalesce(h.val ->> 'closed', 'false') <> 'true'
     )
     and exists (
       select 1 from public.service_packages sp
       where sp.operator_id = op.id and sp.active
     )
$$;

-- Fires on the operators row itself: stripe onboarding completing, a price
-- being set, a certificate being uploaded.
create or replace function public.operators_autoapprove()
  returns trigger
  language plpgsql
as $$
begin
  if new.status = 'pending_review' and public.operator_profile_complete(new) then
    new.status := 'approved';
  end if;
  return new;
end;
$$;

drop trigger if exists operators_autoapprove_trg on public.operators;
create trigger operators_autoapprove_trg
  before insert or update on public.operators
  for each row execute function public.operators_autoapprove();

-- Packages live in their own table, so adding the first one has to re-evaluate
-- the operator — otherwise the last box gets ticked and nothing happens.
create or replace function public.operators_autoapprove_from_packages()
  returns trigger
  language plpgsql
as $$
declare
  target uuid := coalesce(new.operator_id, old.operator_id);
begin
  update public.operators o
     set status = 'approved'
   where o.id = target
     and o.status = 'pending_review'
     and public.operator_profile_complete(o);
  return coalesce(new, old);
end;
$$;

drop trigger if exists service_packages_autoapprove_trg on public.service_packages;
create trigger service_packages_autoapprove_trg
  after insert or update or delete on public.service_packages
  for each row execute function public.operators_autoapprove_from_packages();

-- Backfill anyone already complete but stuck behind the old manual gate.
update public.operators o
   set status = 'approved'
 where o.status = 'pending_review'
   and public.operator_profile_complete(o);
