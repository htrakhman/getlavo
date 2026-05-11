-- Multi-portal accounts: one auth user can belong to multiple portals
-- (resident + building manager, operator + resident, etc.). Source of truth
-- becomes the profile_portals junction table; profiles.role is kept as a
-- nullable legacy hint (last-used / default landing) but no longer authoritative.

create type portal_kind as enum ('building', 'operator', 'resident');

create table profile_portals (
  profile_id uuid not null references profiles(id) on delete cascade,
  portal portal_kind not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, portal)
);

alter table profiles alter column role drop not null;

-- Backfill existing single-role users into the junction table
insert into profile_portals (profile_id, portal)
select id,
  case role
    when 'building_manager' then 'building'::portal_kind
    when 'operator'         then 'operator'::portal_kind
    when 'resident'         then 'resident'::portal_kind
  end
from profiles
where role in ('building_manager', 'operator', 'resident')
on conflict do nothing;

alter table profile_portals enable row level security;

create policy profile_portals_self on profile_portals
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Update the auth-user trigger to also write the initial portal
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta_role user_role := nullif(new.raw_user_meta_data->>'role', '')::user_role;
  initial_portal portal_kind := case meta_role
    when 'building_manager' then 'building'::portal_kind
    when 'operator'         then 'operator'::portal_kind
    when 'resident'         then 'resident'::portal_kind
    else null
  end;
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    meta_role,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;

  if initial_portal is not null then
    insert into public.profile_portals (profile_id, portal)
    values (new.id, initial_portal)
    on conflict do nothing;
  end if;

  return new;
end;
$$;
