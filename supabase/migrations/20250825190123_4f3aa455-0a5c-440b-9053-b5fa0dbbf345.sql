-- Check the current update_user_app_preferences function and fix the issue
-- The error suggests there's a trigger expecting a team_id field that doesn't exist

-- First, let's see what triggers exist on user_settings table
SELECT 
    trigger_name,
    trigger_definition
FROM information_schema.triggers 
WHERE event_object_table = 'user_settings';

-- Let's also check the current function definition
SELECT 
    proname,
    prosrc 
FROM pg_proc 
WHERE proname = 'update_user_app_preferences';

-- Fix the update_user_app_preferences function to handle the data correctly
CREATE OR REPLACE FUNCTION public.update_user_app_preferences(p_preferences jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Update or create user settings with new app preferences
  -- Use COALESCE to merge with existing preferences
  INSERT INTO public.user_settings (user_id, app_preferences)
  VALUES (auth.uid(), p_preferences)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    app_preferences = COALESCE(user_settings.app_preferences, '{}') || p_preferences,
    updated_at = now();
END;
$function$;