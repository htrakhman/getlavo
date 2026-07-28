-- Let a building's people read the operator they are partnered with.
--
-- `operators_public_read` only exposes an operator once it is both approved
-- *and* stripe-onboarded — the right gate for marketplace browsing, but it also
-- governs every embedded read of the row. A building partnered with an operator
-- that has not finished Stripe onboarding therefore gets a null embed, so
-- `/building/wash-days` rendered confirmed wash days as "Operator TBD" while the
-- Overview and Contract pages (which fetch the operator with the service-role
-- client) showed the name correctly. Residents hit the same gap on their own
-- wash day views.
--
-- Fix: a second select policy scoped to an existing partnership. The lookup runs
-- in a SECURITY DEFINER helper — the same pattern as is_building_manager and
-- 0040's recursion fix — so reading operators does not re-enter the partnerships
-- policies (which join back to operators) and trigger 42P17.

create or replace function public.viewer_partnered_with_operator(op uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path to 'public'
as $$
  select exists (
    select 1
    from partnerships p
    join buildings b on b.id = p.building_id
    where p.operator_id = op
      and (
        b.manager_id = auth.uid()
        or exists (
          select 1 from residents r
          where r.building_id = p.building_id and r.profile_id = auth.uid()
        )
      )
  )
$$;

-- Not restricted to status = 'active': a manager reviewing a pending proposal,
-- or looking back at past wash days after a partnership ends, still needs the
-- operator's name.
drop policy if exists operators_partner_read on operators;
create policy operators_partner_read on operators
  for select using (public.viewer_partnered_with_operator(id));
