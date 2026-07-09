-- Create building-assets storage bucket for logo uploads and other building files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'building-assets',
  'building-assets',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do nothing;

-- Building managers can upload to their own building folder
create policy "Building managers can upload assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'building-assets'
    and exists (
      select 1 from buildings
      where manager_id = auth.uid()
        and id::text = (string_to_array(name, '/'))[1]
    )
  );

-- Building managers can update/replace their own assets
create policy "Building managers can update assets"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'building-assets'
    and exists (
      select 1 from buildings
      where manager_id = auth.uid()
        and id::text = (string_to_array(name, '/'))[1]
    )
  );

-- Public can read (logos displayed on public pages)
create policy "Public read building assets"
  on storage.objects for select
  to public
  using (bucket_id = 'building-assets');
