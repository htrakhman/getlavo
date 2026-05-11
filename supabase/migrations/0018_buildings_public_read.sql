-- Fix infinite recursion in buildings RLS and unblock resident onboarding.
--
-- Three policies caused circular recursion for any authenticated query on buildings:
--
--  1. buildings_resident_read → is_resident_of_building() → queries residents
--     → residents_manager_read → is_building_manager() → queries buildings → ∞
--
--  2. buildings_operator_read → queries partnerships
--     → partnerships_building_manager → queries buildings → ∞
--
-- Fix: drop both recursive policies and replace with a simple status-based
-- public read that works for anon + authenticated roles.
-- Building names/cities in prospect/pilot/active status are not sensitive —
-- they're shown on the public resident onboarding picker.

drop policy if exists buildings_resident_read on buildings;
drop policy if exists buildings_operator_read on buildings;
drop policy if exists buildings_authenticated_read on buildings;

create policy buildings_public_read on buildings
  for select
  using (status in ('prospect', 'pilot', 'active'));
