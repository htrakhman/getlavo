-- List operators to buildings from signup, including ones we haven't vetted yet.
--
-- Supersedes 0044. That migration relaxed operators_public_read to
-- `status = 'approved'`, which still hid every operator who signed up through
-- the application path — those rows land in `pending_review` and only the
-- onboarding wizard self-approves. A real operator with a complete profile,
-- nine packages, and a certificate of insurance in our review queue was still
-- invisible to every building.
--
-- Visibility now spans approved *and* pending_review. Managers see an explicit
-- "New — in review" badge on those cards and cannot request them: requestable
-- still means approved + stripe onboarded, enforced in /api/partnerships/request.
-- Suspended and rejected operators stay hidden — those are decisions, not
-- unfinished setup.
--
-- Public marketing surfaces are unaffected: /operators/[slug] and the city pages
-- filter on approved + stripe_onboarding_complete in their own queries, so an
-- unvetted signup never gets an indexable page.

drop policy if exists operators_public_read on operators;
create policy operators_public_read on operators
  for select using (
    status in ('approved', 'pending_review')
    or owner_id = auth.uid()
  );

-- Add-ons mirrored the old operator gate, so a manager viewing an operator who
-- is mid-setup got an empty list and the page claimed "No add-ons listed."
drop policy if exists operator_addons_read on operator_addons;
create policy operator_addons_read on operator_addons
  for select using (
    exists (
      select 1 from operators o
      where o.id = operator_addons.operator_id
        and (o.status in ('approved', 'pending_review') or o.owner_id = auth.uid())
    )
  );
