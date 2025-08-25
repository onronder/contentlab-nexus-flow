-- Fix propagate_settings_change trigger to handle different table schemas correctly
DROP TRIGGER IF EXISTS propagate_settings_change_trigger ON public.user_settings;
DROP TRIGGER IF EXISTS propagate_settings_change_trigger ON public.content_settings;
DROP TRIGGER IF EXISTS propagate_settings_change_trigger ON public.competitive_settings;
DROP TRIGGER IF EXISTS propagate_settings_change_trigger ON public.analytics_settings;

-- Recreate the propagate_settings_change function with proper schema awareness
CREATE OR REPLACE FUNCTION public.propagate_settings_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  integration_record RECORD;
  sync_targets JSONB := '[]';
  entity_id_value UUID;
BEGIN
  -- Get the appropriate entity ID based on table structure
  CASE TG_TABLE_NAME
    WHEN 'user_settings' THEN
      entity_id_value := NEW.user_id;
    WHEN 'content_settings' THEN
      entity_id_value := NEW.user_id;
    WHEN 'competitive_settings' THEN
      entity_id_value := NEW.user_id;
    WHEN 'analytics_settings' THEN
      entity_id_value := NEW.user_id;
    ELSE
      -- For other tables, try to get entity ID from available columns
      entity_id_value := COALESCE(NEW.user_id, NEW.team_id, NEW.project_id);
  END CASE;

  -- Only proceed if we have a valid entity ID
  IF entity_id_value IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only run if tables exist to prevent errors during migrations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings_integrations') THEN
    -- Find all integration relationships where this setting is a source
    FOR integration_record IN 
      SELECT * FROM public.settings_integrations 
      WHERE source_entity_id = entity_id_value
      AND is_active = true
      AND integration_type IN ('inheritance', 'sync')
    LOOP
      -- Add to sync targets
      sync_targets := sync_targets || jsonb_build_object(
        'type', integration_record.target_setting_type,
        'entity_id', integration_record.target_entity_id,
        'integration_type', integration_record.integration_type
      );
    END LOOP;

    -- Log the synchronization event if table exists and has targets
    IF jsonb_array_length(sync_targets) > 0 AND 
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings_sync_log') THEN
      INSERT INTO public.settings_sync_log (
        setting_type, entity_id, sync_event, source_user_id, target_entities, metadata
      ) VALUES (
        TG_TABLE_NAME, 
        entity_id_value,
        'propagate',
        auth.uid(),
        sync_targets,
        jsonb_build_object('trigger', 'settings_change', 'table', TG_TABLE_NAME)
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the operation
    PERFORM public.log_security_event(
      'trigger_error',
      'Error in propagate_settings_change: ' || SQLERRM,
      NULL, NULL, false,
      jsonb_build_object('table', TG_TABLE_NAME, 'error', SQLERRM)
    );
    RETURN NEW;
END;
$function$;

-- Fix auto_version_settings_change trigger to handle different table schemas
DROP TRIGGER IF EXISTS auto_version_settings_change_trigger ON public.user_settings;
DROP TRIGGER IF EXISTS auto_version_settings_change_trigger ON public.content_settings;
DROP TRIGGER IF EXISTS auto_version_settings_change_trigger ON public.competitive_settings;
DROP TRIGGER IF EXISTS auto_version_settings_change_trigger ON public.analytics_settings;

CREATE OR REPLACE FUNCTION public.auto_version_settings_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_setting_type TEXT;
  v_entity_id UUID;
  v_changed_fields TEXT[];
BEGIN
  -- Determine setting type and entity ID based on table
  CASE TG_TABLE_NAME
    WHEN 'user_settings' THEN
      v_setting_type := 'user';
      v_entity_id := NEW.user_id;
    WHEN 'content_settings' THEN
      v_setting_type := 'content';
      v_entity_id := NEW.user_id;
    WHEN 'competitive_settings' THEN
      v_setting_type := 'competitive';
      v_entity_id := NEW.user_id;
    WHEN 'analytics_settings' THEN
      v_setting_type := 'analytics';
      v_entity_id := NEW.user_id;
    ELSE
      -- For other tables, try to determine from available columns
      v_setting_type := TG_TABLE_NAME;
      v_entity_id := COALESCE(NEW.user_id, NEW.team_id, NEW.project_id);
  END CASE;
  
  -- Only proceed if we have valid data
  IF v_entity_id IS NULL OR v_setting_type IS NULL THEN
    RETURN NEW;
  END IF;

  -- Create version record if function exists
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_settings_version') THEN
    PERFORM public.create_settings_version(
      v_setting_type,
      v_entity_id,
      to_jsonb(NEW),
      'Automatic version on settings update',
      v_changed_fields
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the operation
    PERFORM public.log_security_event(
      'trigger_error',
      'Error in auto_version_settings_change: ' || SQLERRM,
      NULL, NULL, false,
      jsonb_build_object('table', TG_TABLE_NAME, 'error', SQLERRM)
    );
    RETURN NEW;
END;
$function$;

-- Recreate triggers on appropriate tables
CREATE TRIGGER propagate_settings_change_trigger
  AFTER UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.propagate_settings_change();

CREATE TRIGGER auto_version_settings_change_trigger
  AFTER UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.auto_version_settings_change();

-- Fix the update_user_app_preferences function to handle errors gracefully
CREATE OR REPLACE FUNCTION public.update_user_app_preferences(p_preferences jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  existing_preferences JSONB;
  merged_preferences JSONB;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Validate input preferences
  IF p_preferences IS NULL OR p_preferences = 'null'::jsonb THEN
    p_preferences := '{}'::jsonb;
  END IF;

  -- Get existing preferences safely
  SELECT COALESCE(app_preferences, '{}') INTO existing_preferences
  FROM public.user_settings 
  WHERE user_id = current_user_id;
  
  -- If no existing record, use default preferences
  IF existing_preferences IS NULL THEN
    existing_preferences := '{"currentTeamId": null, "recentTeams": [], "teamSwitchBehavior": "remember", "crossDeviceSync": true}'::jsonb;
  END IF;

  -- Merge preferences intelligently
  merged_preferences := existing_preferences || p_preferences;
  
  -- Special handling for recentTeams array to prevent duplicates
  IF p_preferences ? 'currentTeamId' AND (p_preferences->>'currentTeamId') IS NOT NULL THEN
    DECLARE
      current_team_id TEXT := p_preferences->>'currentTeamId';
      recent_teams JSONB := COALESCE(existing_preferences->'recentTeams', '[]');
      updated_recent JSONB := '[]';
    BEGIN
      -- Add current team to recent teams if not already there
      IF NOT (recent_teams @> to_jsonb(current_team_id)) THEN
        updated_recent := jsonb_build_array(current_team_id) || recent_teams;
        -- Keep only last 5 recent teams
        IF jsonb_array_length(updated_recent) > 5 THEN
          updated_recent := jsonb_path_query_array(updated_recent, '$[0 to 4]');
        END IF;
        merged_preferences := merged_preferences || jsonb_build_object('recentTeams', updated_recent);
      END IF;
    END;
  END IF;
  
  -- Update or create user settings with merged preferences
  INSERT INTO public.user_settings (user_id, app_preferences, updated_at)
  VALUES (current_user_id, merged_preferences, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    app_preferences = merged_preferences,
    updated_at = now();

  -- Log successful update
  PERFORM public.log_security_event(
    'preferences_updated',
    'User app preferences updated successfully',
    NULL, NULL, true,
    jsonb_build_object('user_id', current_user_id, 'preferences_keys', jsonb_object_keys(p_preferences))
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error with details but don't propagate
    PERFORM public.log_security_event(
      'preferences_update_error',
      'Failed to update user app preferences: ' || SQLERRM,
      NULL, NULL, false,
      jsonb_build_object('user_id', current_user_id, 'error', SQLERRM, 'sqlstate', SQLSTATE)
    );
    -- Don't re-raise the exception to prevent cascade failures
    RETURN;
END;
$function$;