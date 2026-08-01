-- Vehicle-type pricing, part two.
--
-- 1. Add-ons get the same optional per-vehicle-size price list that service
--    packages already have (0039). Shape is identical:
--      [{"size":"sedan","price_cents":4900},{"size":"suv","price_cents":5900}, ...]
--    price_cents stays the "from" (starting) price and remains the source of
--    truth for ordering and any single-price display.
--
-- 2. The tier list splits from three to four. The old `xl` tier crammed 3-row
--    SUVs, minivans and large pickups together; operators asked to price 3-row
--    cars separately from pickups and minivans. `xl` becomes `three_row`, and
--    every row that had an `xl` price also gets a `truck` price at that same
--    amount — the old tier covered both, so carrying the price across keeps
--    every operator's menu whole instead of leaving a tier blank.

alter table operator_addons
  add column if not exists size_prices jsonb not null default '[]'::jsonb;

update service_packages p
set size_prices = coalesce(
  (
    select jsonb_agg(x.elem order by x.ord)
    from (
      select
        case
          when e ->> 'size' = 'xl'
            then jsonb_build_object('size', 'three_row', 'price_cents', e -> 'price_cents')
          else e
        end as elem,
        ord
      from jsonb_array_elements(p.size_prices) with ordinality as t(e, ord)

      union all

      -- the pickup/minivan half of the old `xl` tier, appended last
      select jsonb_build_object('size', 'truck', 'price_cents', e -> 'price_cents'), 1000000
      from jsonb_array_elements(p.size_prices) as e
      where e ->> 'size' = 'xl'
    ) x
  ),
  '[]'::jsonb
)
where size_prices @> '[{"size": "xl"}]'::jsonb;
