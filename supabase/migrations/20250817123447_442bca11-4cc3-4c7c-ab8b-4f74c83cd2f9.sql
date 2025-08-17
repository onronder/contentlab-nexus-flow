-- Fix security issues first - only update existing functions search paths

-- Fix function 1: update_folder_path (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_folder_path') THEN
    CREATE OR REPLACE FUNCTION public.update_folder_path()
     RETURNS trigger
     LANGUAGE plpgsql
     SECURITY DEFINER
     SET search_path TO 'public'
    AS $function$
    BEGIN
      IF NEW.parent_id IS NULL THEN
        NEW.folder_path = NEW.name;
      ELSE
        SELECT folder_path || '/' || NEW.name INTO NEW.folder_path
        FROM file_folders WHERE id = NEW.parent_id;
      END IF;
      
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $function$;
  END IF;
END $$;

-- Fix function 2: manage_file_versions (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'manage_file_versions') THEN
    CREATE OR REPLACE FUNCTION public.manage_file_versions()
     RETURNS trigger
     LANGUAGE plpgsql
     SECURITY DEFINER
     SET search_path TO 'public'
    AS $function$
    BEGIN
      IF TG_OP = 'INSERT' AND NEW.is_current = true THEN
        -- Mark other versions as not current
        UPDATE file_versions 
        SET is_current = false 
        WHERE content_id = NEW.content_id AND id != NEW.id;
      END IF;
      
      RETURN NEW;
    END;
    $function$;
  END IF;
END $$;

-- Fix function 3: update_updated_at_column (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
     RETURNS trigger
     LANGUAGE plpgsql
     SECURITY DEFINER
     SET search_path TO 'public'
    AS $function$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $function$;
  END IF;
END $$;

-- Create file processing jobs table with proper structure for content processing
CREATE TABLE IF NOT EXISTS public.file_processing_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  job_type text NOT NULL DEFAULT 'document_processing' CHECK (job_type IN ('document_processing', 'thumbnail_generation', 'content_analysis')),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  error_message text,
  processing_metadata jsonb DEFAULT '{}',
  result_data jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on file_processing_jobs
ALTER TABLE public.file_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Add policies for file_processing_jobs based on content ownership
CREATE POLICY "Users can view processing jobs for their content" 
ON public.file_processing_jobs 
FOR SELECT 
USING (content_id IN (
  SELECT id FROM public.content_items 
  WHERE user_id = auth.uid()
));

CREATE POLICY "System can manage all processing jobs" 
ON public.file_processing_jobs 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create update trigger for file_processing_jobs
CREATE OR REPLACE FUNCTION public.update_file_processing_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER update_file_processing_jobs_updated_at
  BEFORE UPDATE ON public.file_processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_file_processing_jobs_updated_at();