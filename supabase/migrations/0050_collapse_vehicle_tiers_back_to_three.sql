-- Back to three vehicle pricing tiers.
--
-- 0049 split the top tier in two (`three_row` and `truck`). Operators price
-- 3-row SUVs, pickups and minivans as one bracket, so the split just made them
-- fill in the same number twice. Fold both names back into `xl`, which is what
-- the tier was called before 0049 and what every row written before it uses.
--
-- Where a package somehow carries both names with different prices, the higher
-- one wins: the surviving tier has to cover the largest vehicle in it, and
-- quoting a pickup at the 3-row rate would have the operator eat the gap.
--
-- Forward-only and idempotent: rows already on `xl` match nothing here, and
-- 0049's operator_addons.size_prices column stays — add-ons keep their
-- vehicle-type pricing, just across three tiers instead of four.

-- 0049 introduced this column and runs first, so this is belt-and-braces: it
-- keeps 0050 runnable on its own against a database that only ever saw the
-- three-tier world, rather than failing on a missing column.
alter table operator_addons
  add column if not exists size_prices jsonb not null default '[]'::jsonb;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['service_packages', 'operator_addons'] loop
    execute format($fmt$
      update %I t
      set size_prices = coalesce(
        (
          select jsonb_agg(
                   jsonb_build_object('size', s.size, 'price_cents', s.price_cents)
                   order by array_position(array['sedan', 'suv', 'xl'], s.size)
                 )
          from (
            select
              case when e ->> 'size' in ('three_row', 'truck') then 'xl' else e ->> 'size' end as size,
              max((e ->> 'price_cents')::int) as price_cents
            from jsonb_array_elements(t.size_prices) as e
            where (e ->> 'price_cents') ~ '^[0-9]+$'
            group by 1
          ) s
          where s.size = any (array['sedan', 'suv', 'xl'])
        ),
        '[]'::jsonb
      )
      where size_prices @> '[{"size": "three_row"}]'::jsonb
         or size_prices @> '[{"size": "truck"}]'::jsonb
    $fmt$, tbl);
  end loop;
end $$;
