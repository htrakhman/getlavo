-- Detailers price the same package differently by vehicle size (Sedan / Coupe,
-- SUV / Small Pickup, 3-Row / Minivan). service_packages only had a single
-- price_cents, so operators were cramming size pricing into the description.
-- Add an optional per-size price list. Shape:
--   [{"size":"sedan","price_cents":49900},{"size":"suv","price_cents":52900}, ...]
-- price_cents stays as the "from" (starting) price and remains the source of
-- truth for ordering and any single-price display, so existing rows keep
-- working unchanged.
alter table service_packages
  add column if not exists size_prices jsonb not null default '[]'::jsonb;
