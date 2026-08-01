-- Vehicle-type pricing, part three: give the vehicle a type.
--
-- 0039 and 0049 let an operator price a package (and an add-on) per vehicle
-- tier — sedan, SUV, 3-row/pickup — but nothing on the resident's side ever
-- said which of those their car was. Every surface therefore quoted the "from"
-- price and told the resident their operator would confirm the real rate
-- later, which is not a price so much as an IOU: the resident checked out at
-- the sedan rate whatever they drove, and the operator ate the difference or
-- had to chase it.
--
-- The tier belongs on the vehicle, not on the booking: it is a fact about the
-- car that never changes between washes, so asking once at vehicle setup
-- prices every future wash, package charge and add-on automatically.
--
-- Nullable rather than NOT NULL. Rows written before this migration have no
-- honest value to backfill — guessing 'sedan' for an existing pickup would
-- quietly undercharge its operator — so legacy vehicles stay null and the app
-- treats null as "not answered yet": the vehicle form requires a choice, and
-- the booking form asks for it before checkout. Once answered, it stays
-- answered.
alter table vehicles
  add column if not exists size text;

alter table vehicles
  drop constraint if exists vehicles_size_check;

-- Same three tiers as service_packages.size_prices / operator_addons.size_prices
-- (lib/vehicle-sizes.ts), plus the two names the four-tier window of 0049 could
-- have written, so a value from that era is stored rather than rejected. The
-- app folds `three_row` and `truck` into `xl` on read.
alter table vehicles
  add constraint vehicles_size_check
  check (size is null or size in ('sedan', 'suv', 'xl', 'three_row', 'truck'));
