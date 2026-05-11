-- Update handle_new_user trigger to skip profile creation for OAuth sign-ups.
-- OAuth users (Google, etc.) are redirected to /auth/pick-role to choose their
-- role explicitly on first sign-in. Email/password users still get auto-created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (new.raw_app_meta_data->>'provider') = 'email' then
    insert into public.profiles (id, role, full_name, email)
    values (
      new.id,
      coalesce((new.raw_user_meta_data->>'role')::user_role, 'resident'),
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      new.email
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;
