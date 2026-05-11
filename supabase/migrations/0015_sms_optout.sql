-- SMS opt-out for TCPA compliance
create table if not exists sms_optouts (
  phone       text primary key,
  reason      text,
  created_at  timestamptz not null default now()
);
alter table sms_optouts enable row level security;
drop policy if exists sms_optouts_admin on sms_optouts;
create policy sms_optouts_admin on sms_optouts for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
