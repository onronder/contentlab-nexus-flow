-- Fix cron job creation with proper string quoting
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-reports-every-5-min') THEN
    PERFORM cron.schedule(
      'process-scheduled-reports-every-5-min',
      '*/5 * * * *',
      'select net.http_post(url := ''https://ijvhqqdfthchtittyvnt.supabase.co/functions/v1/process-scheduled-reports'', headers := ''{"Content-Type": "application/json"}''::jsonb, body := ''{}''::jsonb)'
    );
  END IF;
END
$$;