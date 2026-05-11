-- Building branding fields used on /b/[slug] and email headers.

alter table buildings add column if not exists welcome_message text;
alter table buildings add column if not exists logo_url        text;
alter table buildings add column if not exists brand_color     text;
