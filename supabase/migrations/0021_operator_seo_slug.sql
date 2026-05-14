alter table operators add column if not exists seo_slug text;
create unique index if not exists operators_seo_slug_uidx on operators (seo_slug) where seo_slug is not null;
