-- List operators in the marketplace as soon as they sign up.
--
-- `operators_public_read` (0007) required `stripe_onboarding_complete = true`,
-- so an operator who finished the onboarding wizard but had not yet connected a
-- bank account was invisible to every building — the marketplace query runs on
-- the user-scoped client, so RLS filtered the row out before the page ever saw
-- it. Buildings browsing a new market therefore saw "No operators are available
-- in your area yet" while operators were sitting in the account waiting.
--
-- The setup state is now shown to managers instead of hiding the operator: the
-- marketplace badges an unfinished account and the request button is disabled
-- until Stripe onboarding completes. The server still enforces that gate in
-- /api/partnerships/request — this policy only governs who is *visible*.
--
-- Status is still enforced: pending_review, suspended, and rejected operators
-- stay hidden. Public marketing surfaces (/operators/[slug], city pages) apply
-- their own stripe_onboarding_complete filter in the query so relaxing the
-- policy does not put unfinished accounts on indexable pages.

drop policy if exists operators_public_read on operators;
create policy operators_public_read on operators
  for select using (
    status = 'approved'
    or owner_id = auth.uid()
  );
