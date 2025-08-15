-- Fix the get_or_create_user_settings function to ensure it returns proper structure
CREATE OR REPLACE FUNCTION public.get_or_create_user_settings(p_user_id uuid)
 RETURNS user_settings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_settings_record public.user_settings;
BEGIN
  -- Try to get existing settings
  SELECT * INTO user_settings_record
  FROM public.user_settings
  WHERE user_id = p_user_id;
  
  -- If not found, create default settings
  IF NOT FOUND THEN
    INSERT INTO public.user_settings (user_id)
    VALUES (p_user_id)
    RETURNING * INTO user_settings_record;
  END IF;
  
  RETURN user_settings_record;
END;
$function$