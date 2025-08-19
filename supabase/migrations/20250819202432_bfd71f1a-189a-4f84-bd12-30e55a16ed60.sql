-- Fix function search path security warnings
-- Update functions to have explicit search_path settings

-- Fix function search path for handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$function$;

-- Fix function search path for trigger_file_processing
CREATE OR REPLACE FUNCTION public.trigger_file_processing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix function search path for log_competitor_changes
CREATE OR REPLACE FUNCTION public.log_competitor_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Log the change in project_activities table
    INSERT INTO public.project_activities (
        project_id,
        user_id,
        activity_type,
        activity_description,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        COALESCE(NEW.project_id, OLD.project_id),
        auth.uid(),
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'competitor_added'
            WHEN TG_OP = 'UPDATE' THEN 'competitor_updated'
            WHEN TG_OP = 'DELETE' THEN 'competitor_removed'
        END,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'Added competitor: ' || NEW.company_name
            WHEN TG_OP = 'UPDATE' THEN 'Updated competitor: ' || NEW.company_name
            WHEN TG_OP = 'DELETE' THEN 'Removed competitor: ' || OLD.company_name
        END,
        'competitor',
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'operation', TG_OP,
            'competitor_name', COALESCE(NEW.company_name, OLD.company_name),
            'changes', CASE WHEN TG_OP = 'UPDATE' THEN 
                jsonb_build_object(
                    'old', to_jsonb(OLD.*),
                    'new', to_jsonb(NEW.*)
                )
                ELSE '{}' END
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Move extensions to extensions schema if they exist in public schema
-- This fixes the "Extension in Public" warning
DO $$
BEGIN
    -- Create extensions schema if it doesn't exist
    CREATE SCHEMA IF NOT EXISTS extensions;
    
    -- Grant usage on extensions schema
    GRANT USAGE ON SCHEMA extensions TO public;
    GRANT USAGE ON SCHEMA extensions TO anon;
    GRANT USAGE ON SCHEMA extensions TO authenticated;
    GRANT USAGE ON SCHEMA extensions TO service_role;
    
    -- Note: Moving existing extensions requires superuser privileges
    -- This will be handled by Supabase team or during database setup
END $$;