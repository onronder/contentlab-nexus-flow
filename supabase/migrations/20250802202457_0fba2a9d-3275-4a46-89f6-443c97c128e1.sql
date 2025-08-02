-- Fix all remaining functions with insecure search_path configuration
-- This addresses all Supabase linter warnings about function search paths

-- Fix the log_content_activity function
CREATE OR REPLACE FUNCTION public.log_content_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  action_type TEXT;
  user_id_val UUID;
BEGIN
  user_id_val := auth.uid();
  
  -- Only log activity if there's a valid authenticated user
  -- This prevents constraint violations during manual/system operations
  IF user_id_val IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status AND NEW.status = 'published' THEN
      action_type := 'published';
    ELSIF OLD.status != NEW.status AND NEW.status = 'archived' THEN
      action_type := 'archived';
    ELSE
      action_type := 'updated';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'deleted';
  END IF;
  
  INSERT INTO public.content_activity_log (
    content_id,
    user_id,
    action,
    description,
    metadata
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    user_id_val,
    action_type,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Content created: ' || NEW.title
      WHEN TG_OP = 'UPDATE' THEN 'Content updated: ' || NEW.title
      WHEN TG_OP = 'DELETE' THEN 'Content deleted: ' || OLD.title
    END,
    jsonb_build_object(
      'operation', TG_OP,
      'content_type', COALESCE(NEW.content_type, OLD.content_type),
      'status', COALESCE(NEW.status, OLD.status)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;