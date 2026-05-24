-- Operator-customizable Wash days hub (empty state + crew notes)

alter table operators
  add column if not exists wash_days_hub jsonb not null default '{}'::jsonb;
