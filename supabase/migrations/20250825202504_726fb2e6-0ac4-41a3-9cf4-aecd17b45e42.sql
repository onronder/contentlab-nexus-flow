-- Step 3: Add Database Schema Validation and Robust Error Recovery

-- Create a helper function to safely check if a column exists in a table
CREATE OR REPLACE FUNCTION public.column_exists(table_name text, column_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = column_exists.table_name 
    AND column_name = column_exists.column_name
  );
$function$;

-- Create a robust error logging function that won't cause cascade failures
CREATE OR REPLACE FUNCTION public.log_safe_error(
  error_type text,
  error_message text,
  context_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only log if the security_audit_logs table exists and we can access it safely
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_audit_logs') THEN
    BEGIN
      INSERT INTO public.security_audit_logs (
        user_id, event_type, event_description, success, metadata
      ) VALUES (
        auth.uid(), error_type, error_message, false, context_data
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- If even error logging fails, just continue silently
        NULL;
    END;
  END IF;
END;
$function$;

-- Improve the propagate_settings_change function with better schema validation
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
  has_user_id boolean := false;
  has_team_id boolean := false;
  has_project_id boolean := false;
BEGIN
  -- Check which columns exist in the current table
  has_user_id := public.column_exists(TG_TABLE_NAME, 'user_id');
  has_team_id := public.column_exists(TG_TABLE_NAME, 'team_id');
  has_project_id := public.column_exists(TG_TABLE_NAME, 'project_id');

  -- Get the appropriate entity ID based on available columns
  IF has_user_id THEN
    entity_id_value := NEW.user_id;
  ELSIF has_team_id THEN
    entity_id_value := NEW.team_id;
  ELSIF has_project_id THEN
    entity_id_value := NEW.project_id;
  ELSE
    -- No valid entity ID column found
    PERFORM public.log_safe_error(
      'trigger_schema_error',
      'No valid entity ID column found in table: ' || TG_TABLE_NAME,
      jsonb_build_object('table', TG_TABLE_NAME, 'available_columns', 'none')
    );
    RETURN NEW;
  END IF;

  -- Only proceed if we have a valid entity ID
  IF entity_id_value IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only run integration logic if the required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings_integrations') THEN
    BEGIN
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
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the operation
        PERFORM public.log_safe_error(
          'integration_sync_error',
          'Error during settings sync: ' || SQLERRM,
          jsonb_build_object('table', TG_TABLE_NAME, 'entity_id', entity_id_value, 'error', SQLERRM)
        );
    END;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ultimate fallback - log error but don't fail the operation
    PERFORM public.log_safe_error(
      'trigger_critical_error',
      'Critical error in propagate_settings_change: ' || SQLERRM,
      jsonb_build_object('table', TG_TABLE_NAME, 'error', SQLERRM, 'sqlstate', SQLSTATE)
    );
    RETURN NEW;
END;
$function$;

-- Create a safer version of update_user_app_preferences with better validation
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
  validation_error TEXT;
BEGIN
  -- Get current user with validation
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    PERFORM public.log_safe_error(
      'auth_error',
      'Unauthenticated user attempted to update preferences',
      '{}'::jsonb
    );
    RETURN; -- Don't raise exception to prevent cascade failures
  END IF;
  
  -- Validate and sanitize input preferences
  IF p_preferences IS NULL THEN
    p_preferences := '{}'::jsonb;
  ELSIF p_preferences = 'null'::jsonb THEN
    p_preferences := '{}'::jsonb;
  END IF;

  -- Basic validation of preference structure
  BEGIN
    -- Check if preferences contain only expected keys
    IF p_preferences ? 'currentTeamId' THEN
      -- Validate currentTeamId format if present
      IF (p_preferences->>'currentTeamId') IS NOT NULL AND 
         NOT (p_preferences->>'currentTeamId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
        validation_error := 'Invalid currentTeamId format';
      END IF;
    END IF;
    
    IF p_preferences ? 'recentTeams' THEN
      -- Validate recentTeams is an array
      IF NOT jsonb_typeof(p_preferences->'recentTeams') = 'array' THEN
        validation_error := 'recentTeams must be an array';
      END IF;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      validation_error := 'Invalid preference data structure';
  END;

  -- If validation failed, log and return without error
  IF validation_error IS NOT NULL THEN
    PERFORM public.log_safe_error(
      'preference_validation_error',
      validation_error,
      jsonb_build_object('user_id', current_user_id, 'preferences', p_preferences)
    );
    RETURN;
  END IF;

  -- Get existing preferences safely
  BEGIN
    SELECT COALESCE(app_preferences, '{}') INTO existing_preferences
    FROM public.user_settings 
    WHERE user_id = current_user_id;
  EXCEPTION
    WHEN OTHERS THEN
      existing_preferences := '{}';
  END;
  
  -- If no existing record found, use default preferences
  IF existing_preferences IS NULL OR existing_preferences = '{}' THEN
    existing_preferences := jsonb_build_object(
      'currentTeamId', null,
      'recentTeams', '[]'::jsonb,
      'teamSwitchBehavior', 'remember',
      'crossDeviceSync', true
    );
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
    EXCEPTION
      WHEN OTHERS THEN
        -- If recent teams update fails, continue with basic merge
        NULL;
    END;
  END IF;
  
  -- Update or create user settings with merged preferences
  BEGIN
    INSERT INTO public.user_settings (user_id, app_preferences, updated_at)
    VALUES (current_user_id, merged_preferences, now())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      app_preferences = merged_preferences,
      updated_at = now();

    -- Only log success if not in a trigger context to avoid recursion
    IF TG_NARGS IS NULL THEN
      PERFORM public.log_safe_error(
        'preferences_updated',
        'User app preferences updated successfully',
        jsonb_build_object('user_id', current_user_id)
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log detailed error but don't propagate to prevent cascade failures
      PERFORM public.log_safe_error(
        'preference_update_error',
        'Database error updating preferences: ' || SQLERRM,
        jsonb_build_object(
          'user_id', current_user_id, 
          'error', SQLERRM, 
          'sqlstate', SQLSTATE,
          'preferences_size', octet_length(merged_preferences::text)
        )
      );
  END;

EXCEPTION
  WHEN OTHERS THEN
    -- Ultimate fallback - log critical error but don't propagate
    PERFORM public.log_safe_error(
      'preference_critical_error',
      'Critical error in update_user_app_preferences: ' || SQLERRM,
      jsonb_build_object('user_id', current_user_id, 'error', SQLERRM, 'sqlstate', SQLSTATE)
    );
END;
$function$;