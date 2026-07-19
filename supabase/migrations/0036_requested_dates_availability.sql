-- Building-requested wash dates + operator availability dates.
--
-- buildings.requested_wash_dates: specific dates the property manager wants
-- service on (ISO YYYY-MM-DD strings). Once a partnership is active these are
-- materialized into confirmed wash_days rows, which override the operator's
-- own availability everywhere (see lib/availability.ts priority order).
--
-- operators.availability_dates: specific dates the operator has marked
-- themselves available, shown to property managers in the marketplace.

alter table buildings add column if not exists requested_wash_dates jsonb not null default '[]'::jsonb;
alter table operators add column if not exists availability_dates jsonb not null default '[]'::jsonb;
