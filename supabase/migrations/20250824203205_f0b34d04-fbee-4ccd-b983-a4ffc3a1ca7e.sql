-- Phase 1: Database Schema Migration
-- Add app_preferences JSONB column to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS app_preferences JSONB DEFAULT '{"currentTeamId": null, "recentTeams": [], "teamSwitchBehavior": "remember", "crossDeviceSync": true}';

-- Migration function to copy existing last_team_id values to app_preferences
CREATE OR REPLACE FUNCTION public.migrate_last_team_to_app_preferences()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  migration_count integer := 0;
BEGIN
  -- Migrate existing last_team_id values to app_preferences.currentTeamId
  UPDATE public.user_settings 
  SET app_preferences = jsonb_set(
    COALESCE(app_preferences, '{}'), 
    '{currentTeamId}', 
    to_jsonb(p.last_team_id)
  )
  FROM public.profiles p
  WHERE user_settings.user_id = p.id 
  AND p.last_team_id IS NOT NULL
  AND (app_preferences->>'currentTeamId' IS NULL OR app_preferences->>'currentTeamId' = 'null');
  
  GET DIAGNOSTICS migration_count = ROW_COUNT;
  RETURN migration_count;
END;
$function$;

-- New RPC function to update app preferences
CREATE OR REPLACE FUNCTION public.update_user_app_preferences(p_preferences JSONB)
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

-- New RPC function to get app preferences
CREATE OR REPLACE FUNCTION public.get_user_app_preferences()
RETURNS JSONB
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(app_preferences, '{"currentTeamId": null, "recentTeams": [], "teamSwitchBehavior": "remember", "crossDeviceSync": true}')
  FROM public.user_settings 
  WHERE user_id = auth.uid();
$function$;

-- Update get_or_create_user_settings to include app_preferences
CREATE OR REPLACE FUNCTION public.get_or_create_user_settings(p_user_id uuid)
RETURNS user_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  settings_record public.user_settings;
BEGIN
  SELECT * INTO settings_record
  FROM public.user_settings
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.user_settings (
      user_id, 
      notification_preferences,
      theme_preferences,
      privacy_settings,
      feature_flags,
      app_preferences
    )
    VALUES (
      p_user_id,
      '{"email": true, "push": false, "in_app": true}',
      '{"mode": "system", "color": "default"}',
      '{"profile_visibility": "team", "activity_visibility": "team"}',
      '{}',
      '{"currentTeamId": null, "recentTeams": [], "teamSwitchBehavior": "remember", "crossDeviceSync": true}'
    )
    RETURNING * INTO settings_record;
  END IF;
  
  RETURN settings_record;
END;
$function$;

-- Run the migration
SELECT migrate_last_team_to_app_preferences();