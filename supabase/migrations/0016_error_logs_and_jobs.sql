-- Error logs + cron job heartbeat for the admin health page

create table if not exists error_logs (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,
  message     text not null,
  stack       text,
  context     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists error_logs_created_idx on error_logs (created_at desc);

alter table error_logs enable row level security;
drop policy if exists error_logs_admin on error_logs;
create policy error_logs_admin on error_logs for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Cron / job heartbeats
create table if not exists job_runs (
  id          uuid primary key default gen_random_uuid(),
  job_name    text not null,
  status      text not null check (status in ('ok', 'error')),
  duration_ms int,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists job_runs_created_idx on job_runs (job_name, created_at desc);

alter table job_runs enable row level security;
drop policy if exists job_runs_admin on job_runs;
create policy job_runs_admin on job_runs for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
