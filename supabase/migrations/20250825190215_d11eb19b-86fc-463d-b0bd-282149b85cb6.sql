-- Fix the update_user_app_preferences function to properly handle the data structure
-- The error suggests there might be a trigger issue, let's fix the function properly

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
  INSERT INTO public.user_settings (user_id, app_preferences)
  VALUES (auth.uid(), p_preferences)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    app_preferences = COALESCE(user_settings.app_preferences, '{}') || p_preferences,
    updated_at = now();
END;
$function$;