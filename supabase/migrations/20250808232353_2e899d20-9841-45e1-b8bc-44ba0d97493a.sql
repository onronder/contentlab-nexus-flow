-- Enable required extensions for scheduling HTTP calls
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Schedule daily batch performance reports at 08:00 UTC
select cron.schedule(
  'team-performance-report-daily',
  '0 8 * * *',
  $$
  select
    net.http_post(
      url:='https://ijvhqqdfthchtittyvnt.supabase.co/functions/v1/team-performance-report-batch',
      headers:='{"Content-Type": "application/json"}'::jsonb,
      body:='{}'::jsonb
    )
  $$
);
