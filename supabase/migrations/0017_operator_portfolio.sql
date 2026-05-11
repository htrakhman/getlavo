-- 0017: Operator portfolio & enriched profile fields

-- New profile columns on operators
alter table operators
  add column if not exists tagline          text,
  add column if not exists years_experience int,
  add column if not exists specialties      text[] not null default '{}',
  add column if not exists cover_photo_url  text;

-- Portfolio items table
create table if not exists operator_portfolio_items (
  id            uuid primary key default gen_random_uuid(),
  operator_id   uuid not null references operators(id) on delete cascade,
  url           text not null,
  media_type    text not null default 'photo',  -- 'photo' | 'video'
  title         text,
  description   text,
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists portfolio_items_operator_idx
  on operator_portfolio_items (operator_id, display_order);

alter table operator_portfolio_items enable row level security;

-- Owner can manage their portfolio
create policy "portfolio_owner_all"
  on operator_portfolio_items for all
  using   (exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid()))
  with check (exists (select 1 from operators o where o.id = operator_id and o.owner_id = auth.uid()));

-- Everyone can read portfolio items (for building/resident views)
create policy "portfolio_public_read"
  on operator_portfolio_items for select
  using (true);

-- Storage bucket for operator portfolio media (public)
insert into storage.buckets (id, name, public)
  values ('operator-portfolio', 'operator-portfolio', true)
  on conflict (id) do nothing;

create policy "portfolio_upload"
  on storage.objects for insert
  with check (bucket_id = 'operator-portfolio' and auth.uid() is not null);

create policy "portfolio_update"
  on storage.objects for update
  using (bucket_id = 'operator-portfolio' and auth.uid() is not null);

create policy "portfolio_delete"
  on storage.objects for delete
  using (bucket_id = 'operator-portfolio' and auth.uid() is not null);

create policy "portfolio_public_read_storage"
  on storage.objects for select
  using (bucket_id = 'operator-portfolio');
