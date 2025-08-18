-- Set up scheduled analytics aggregation using pg_cron
-- This will run the analytics aggregation every hour

-- Schedule analytics aggregation to run every hour
SELECT cron.schedule(
  'analytics-aggregation',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://ijvhqqdfthchtittyvnt.supabase.co/functions/v1/analytics-aggregator',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdmhxcWRmdGhjaHRpdHR5dm50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE5MTg5MywiZXhwIjoyMDY4NzY3ODkzfQ.1pUJ9cYwv7ry9Hqm7nHt4hXa2RCqcFxWEQvEJwPyq3M"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Create a trigger to automatically start file processing when content is created with a file
CREATE OR REPLACE FUNCTION public.trigger_file_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger processing if content has a file path and isn't already processed
  IF NEW.file_path IS NOT NULL AND NEW.processing_status != 'completed' THEN
    -- Insert a processing job
    INSERT INTO public.file_processing_jobs (
      content_id,
      job_type,
      status
    ) VALUES (
      NEW.id,
      CASE 
        WHEN NEW.mime_type LIKE 'image/%' THEN 'thumbnail_generation'
        WHEN NEW.mime_type IN ('application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') THEN 'document_processing'
        ELSE 'content_analysis'
      END,
      'pending'
    );

    -- Call the document processor edge function asynchronously
    PERFORM net.http_post(
      url := 'https://ijvhqqdfthchtittyvnt.supabase.co/functions/v1/document-processor',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := json_build_object(
        'contentId', NEW.id,
        'filePath', NEW.file_path,
        'extractText', true,
        'generateThumbnail', true,
        'analyzeStructure', true
      )::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'net';

-- Create the trigger
DROP TRIGGER IF EXISTS content_processing_trigger ON public.content_items;
CREATE TRIGGER content_processing_trigger
  AFTER INSERT OR UPDATE OF file_path, processing_status
  ON public.content_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_file_processing();