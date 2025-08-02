-- Fix the database security issue: update function search_path configuration
-- This addresses the Supabase linter warning about insecure search_path

CREATE OR REPLACE FUNCTION public.update_content_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_vector = to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' || 
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(array_to_string(ARRAY(SELECT tag FROM public.content_tags WHERE content_id = NEW.id), ' '), '')
  );
  RETURN NEW;
END;
$function$;