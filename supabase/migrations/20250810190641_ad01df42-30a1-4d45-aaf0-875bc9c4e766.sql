-- Enable required extensions
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Create generated-reports bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('generated-reports', 'generated-reports', true)
on conflict (id) do nothing;

-- scheduled_reports table
create table if not exists public.scheduled_reports (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  team_id uuid,
  title text,
  email_subject text not null,
  email_body_html text,
  recipients text[] not null,
  cc text[],
  bcc text[],
  format text not null default 'png',
  cadence text not null default 'daily',
  timezone text not null default 'UTC',
  hour_utc int not null default 8,
  minute_utc int not null default 0,
  next_run_at timestamptz not null default now(),
  last_run_at timestamptz,
  is_active boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS for scheduled_reports
alter table public.scheduled_reports enable row level security;

create policy if not exists "Users can insert their own schedules"
  on public.scheduled_reports for insert
  with check (created_by = auth.uid());

create policy if not exists "Users can view their own schedules"
  on public.scheduled_reports for select
  using (created_by = auth.uid());

create policy if not exists "Users can update their own schedules"
  on public.scheduled_reports for update
  using (created_by = auth.uid());

-- updated_at trigger
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_update_scheduled_reports_updated_at on public.scheduled_reports;
create trigger trg_update_scheduled_reports_updated_at
before update on public.scheduled_reports
for each row execute function public.update_updated_at_column();

-- report_shares table
create table if not exists public.report_shares (
  id uuid primary key default gen_random_uuid(),
  token text unique not null default encode(gen_random_bytes(16), 'hex'),
  created_by uuid not null,
  chart_title text,
  payload jsonb not null default '{}'::jsonb,
  generated_report_id uuid,
  expires_at timestamptz,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_report_shares_token on public.report_shares (token);

alter table public.report_shares enable row level security;

create policy if not exists "Users can create their own shares"
  on public.report_shares for insert
  with check (created_by = auth.uid());

create policy if not exists "Users can view their own shares"
  on public.report_shares for select
  using (created_by = auth.uid());

create policy if not exists "Users can update their own shares"
  on public.report_shares for update
  using (created_by = auth.uid());

-- updated_at trigger
drop trigger if exists trg_update_report_shares_updated_at on public.report_shares;
create trigger trg_update_report_shares_updated_at
before update on public.report_shares
for each row execute function public.update_updated_at_column();

-- Optional: small helper to compute next_run_at for simple cadences
create or replace function public.compute_next_run_at(current timestamptz, cadence text, hour int, minute int, tz text)
returns timestamptz as $$
declare
  base timestamptz := (date_trunc('day', current at time zone tz) at time zone tz) + make_interval(hours => hour, mins => minute);
  next timestamptz;
begin
  if cadence = 'daily' then
    next := base;
    if next <= current then
      next := next + interval '1 day';
    end if;
  elsif cadence = 'weekly' then
    next := base;
    if next <= current then
      next := next + interval '7 days';
    end if;
  elsif cadence = 'monthly' then
    next := base;
    if next <= current then
      next := (base + interval '1 month');
    end if;
  else
    -- default daily
    next := base + interval '1 day';
  end if;
  return next;
end;
$$ language plpgsql security definer set search_path = public;

-- Schedule cron job to invoke process-scheduled-reports every 5 minutes
-- Note: requires pg_cron and pg_net
select
  cron.schedule(
    'process-scheduled-reports-every-5',
    '*/5 * * * *',
    $$
    select
      net.http_post(
        url := 'https://ijvhqqdfthchtittyvnt.supabase.co/functions/v1/process-scheduled-reports',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true)
        ),
        body := jsonb_build_object('invoked_by', 'pg_cron')
      );
    $$
  )
where not exists (
  select 1 from cron.job where jobname = 'process-scheduled-reports-every-5'
);

-- Store anon key in database setting if not set (used by cron job)
do $$
begin
  if current_setting('app.settings.anon_key', true) is null then
    perform set_config('app.settings.anon_key', '${SUPABASE_ANON_KEY}', true);
  end if;
exception when others then null;
end $$;