-- Fix security issues identified by linter

-- 1. Fix function search path mutable issues by setting proper search_path
-- Update existing functions to have secure search_path settings

-- Fix function 1: update_folder_path
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

-- Fix function 2: manage_file_versions
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

-- Fix function 3: update_updated_at_column
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

-- Add missing RLS policy for report_shares if it exists and doesn't have proper security
-- First check if table exists and add basic RLS if missing

-- Add RLS policies for content processing and file management
-- Enable RLS on file processing related tables if they exist

DO $$
BEGIN
  -- Check if file_processing_jobs table exists and add RLS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'file_processing_jobs') THEN
    -- Enable RLS
    ALTER TABLE public.file_processing_jobs ENABLE ROW LEVEL SECURITY;
    
    -- Add policy for users to manage their own processing jobs
    DROP POLICY IF EXISTS "Users can manage their file processing jobs" ON public.file_processing_jobs;
    CREATE POLICY "Users can manage their file processing jobs" 
    ON public.file_processing_jobs 
    FOR ALL 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
    
    -- Add policy for system to create processing jobs
    DROP POLICY IF EXISTS "System can create processing jobs" ON public.file_processing_jobs;
    CREATE POLICY "System can create processing jobs" 
    ON public.file_processing_jobs 
    FOR INSERT 
    WITH CHECK (true);
  END IF;
  
  -- Check if file_versions table exists and add RLS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'file_versions') THEN
    -- Enable RLS  
    ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;
    
    -- Add policy for users to manage versions of their content
    DROP POLICY IF EXISTS "Users can manage versions of their content" ON public.file_versions;
    CREATE POLICY "Users can manage versions of their content"
    ON public.file_versions
    FOR ALL
    USING (content_id IN (
      SELECT id FROM public.content_items 
      WHERE user_id = auth.uid()
    ))
    WITH CHECK (content_id IN (
      SELECT id FROM public.content_items 
      WHERE user_id = auth.uid()
    ));
  END IF;
  
  -- Check if file_folders table exists and add RLS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'file_folders') THEN
    -- Enable RLS
    ALTER TABLE public.file_folders ENABLE ROW LEVEL SECURITY;
    
    -- Add policy for users to manage their folders
    DROP POLICY IF EXISTS "Users can manage their folders" ON public.file_folders;
    CREATE POLICY "Users can manage their folders"
    ON public.file_folders
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;