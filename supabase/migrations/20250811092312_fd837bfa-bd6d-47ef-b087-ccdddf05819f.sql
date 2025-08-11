-- 1) Ensure required extensions
create extension if not exists pgcrypto;
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 2) Generic updated_at trigger function
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3) scheduled_reports table
create table if not exists public.scheduled_reports (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  recipients text[] not null,
  email_subject text not null,
  email_body_html text,
  format text not null default 'png',
  cadence text not null default 'daily',
  timezone text not null default 'UTC',
  hour_utc int not null default 0,
  minute_utc int not null default 0,
  last_run_at timestamptz,
  next_run_at timestamptz not null default now(),
  is_active boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scheduled_reports enable row level security;

-- Policies for scheduled_reports
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'scheduled_reports' and policyname = 'Users can insert their scheduled reports'
  ) then
    create policy "Users can insert their scheduled reports"
      on public.scheduled_reports
      for insert
      with check (created_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'scheduled_reports' and policyname = 'Users can view their scheduled reports'
  ) then
    create policy "Users can view their scheduled reports"
      on public.scheduled_reports
      for select
      using (created_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'scheduled_reports' and policyname = 'Users can update their scheduled reports'
  ) then
    create policy "Users can update their scheduled reports"
      on public.scheduled_reports
      for update
      using (created_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'scheduled_reports' and policyname = 'Users can delete their scheduled reports'
  ) then
    create policy "Users can delete their scheduled reports"
      on public.scheduled_reports
      for delete
      using (created_by = auth.uid());
  end if;
end
$$;

create index if not exists idx_scheduled_reports_created_by on public.scheduled_reports(created_by);
create index if not exists idx_scheduled_reports_next_run_at on public.scheduled_reports(next_run_at) where is_active = true;
create index if not exists idx_scheduled_reports_active on public.scheduled_reports(is_active);

-- Trigger for updated_at
drop trigger if exists trg_scheduled_reports_updated_at on public.scheduled_reports;
create trigger trg_scheduled_reports_updated_at
before update on public.scheduled_reports
for each row execute function public.update_updated_at_column();

-- 4) report_shares table
create table if not exists public.report_shares (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_by uuid not null,
  chart_title text,
  payload jsonb not null,
  generated_report_id uuid references public.generated_reports(id) on delete set null,
  expires_at timestamptz,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.report_shares enable row level security;

-- Policies for report_shares
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'report_shares' and policyname = 'Users can insert their report shares'
  ) then
    create policy "Users can insert their report shares"
      on public.report_shares
      for insert
      with check (created_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'report_shares' and policyname = 'Users can view their report shares'
  ) then
    create policy "Users can view their report shares"
      on public.report_shares
      for select
      using (created_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'report_shares' and policyname = 'Users can update their report shares'
  ) then
    create policy "Users can update their report shares"
      on public.report_shares
      for update
      using (created_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'report_shares' and policyname = 'Users can delete their report shares'
  ) then
    create policy "Users can delete their report shares"
      on public.report_shares
      for delete
      using (created_by = auth.uid());
  end if;
end
$$;

create index if not exists idx_report_shares_token on public.report_shares(token);
create index if not exists idx_report_shares_created_by on public.report_shares(created_by);
create index if not exists idx_report_shares_expires_at on public.report_shares(expires_at);

-- Trigger for updated_at
drop trigger if exists trg_report_shares_updated_at on public.report_shares;
create trigger trg_report_shares_updated_at
before update on public.report_shares
for each row execute function public.update_updated_at_column();

-- 5) RPCs
-- increment download count
create or replace function public.increment_generated_report_download(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.generated_reports
  set download_count = coalesce(download_count, 0) + 1
  where id = p_id;
end;
$$;

-- compute next run time based on parameters
create or replace function public.compute_next_run_at(
  p_last_run_at timestamptz,
  p_cadence text,
  p_hour_utc int,
  p_minute_utc int,
  p_timezone text default 'UTC'
)
returns timestamptz
language plpgsql
stable
as $$
declare
  base_date timestamptz;
  candidate timestamptz;
begin
  base_date := now() at time zone 'UTC';
  candidate := date_trunc('day', base_date) + make_interval(hours => p_hour_utc, mins => p_minute_utc);

  if p_cadence = 'weekly' then
    if candidate <= base_date then
      candidate := candidate + interval '1 week';
    end if;
  elsif p_cadence = 'monthly' then
    if candidate <= base_date then
      candidate := (candidate + interval '1 month')::timestamptz;
    end if;
  else
    -- default daily
    if candidate <= base_date then
      candidate := candidate + interval '1 day';
    end if;
  end if;

  return candidate;
end;
$$;

-- overload using schedule id
create or replace function public.compute_next_run_at(p_schedule_id uuid)
returns timestamptz
language plpgsql
stable
as $$
declare
  r record;
begin
  select cadence, hour_utc, minute_utc, timezone into r
  from public.scheduled_reports
  where id = p_schedule_id;

  if not found then
    return null;
  end if;

  return public.compute_next_run_at(now(), r.cadence, r.hour_utc, r.minute_utc, r.timezone);
end;
$$;

-- 6) Storage bucket for generated reports (optional and idempotent)
insert into storage.buckets (id, name, public)
values ('generated-reports', 'generated-reports', false)
on conflict (id) do nothing;

-- Storage policies scoped to user folder (userId/...)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can upload generated reports into own folder'
  ) then
    create policy "Users can upload generated reports into own folder"
    on storage.objects
    for insert
    with check (
      bucket_id = 'generated-reports'
      and (auth.uid()::text = (storage.foldername(name))[1])
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can read own generated reports'
  ) then
    create policy "Users can read own generated reports"
    on storage.objects
    for select
    using (
      bucket_id = 'generated-reports'
      and (auth.uid()::text = (storage.foldername(name))[1])
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can update own generated reports'
  ) then
    create policy "Users can update own generated reports"
    on storage.objects
    for update
    using (
      bucket_id = 'generated-reports'
      and (auth.uid()::text = (storage.foldername(name))[1])
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can delete own generated reports'
  ) then
    create policy "Users can delete own generated reports"
    on storage.objects
    for delete
    using (
      bucket_id = 'generated-reports'
      and (auth.uid()::text = (storage.foldername(name))[1])
    );
  end if;
end $$;

-- 7) Cron job to invoke process-scheduled-reports every 5 minutes
-- Only schedule if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-reports-every-5-min') THEN
    PERFORM cron.schedule(
      'process-scheduled-reports-every-5-min',
      '*/5 * * * *',
      $$
      select net.http_post(
        url := 'https://ijvhqqdfthchtittyvnt.supabase.co/functions/v1/process-scheduled-reports',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      );
      $$
    );
  END IF;
END
$$;