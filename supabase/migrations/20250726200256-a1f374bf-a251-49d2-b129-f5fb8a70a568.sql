-- Update create_project_secure function to accept all project fields (fixed parameter order)
CREATE OR REPLACE FUNCTION public.create_project_secure(
  project_name text,
  project_industry text,
  project_description text DEFAULT '',
  project_type_param text DEFAULT 'competitive_analysis',
  project_target_market text DEFAULT '',
  project_primary_objectives text[] DEFAULT '{}',
  project_success_metrics text[] DEFAULT '{}',
  project_status text DEFAULT 'planning',
  project_priority text DEFAULT 'medium',
  project_start_date timestamp with time zone DEFAULT NULL,
  project_target_end_date timestamp with time zone DEFAULT NULL,
  project_is_public boolean DEFAULT false,
  project_allow_team_access boolean DEFAULT true,
  project_auto_analysis_enabled boolean DEFAULT true,
  project_notification_settings jsonb DEFAULT '{"email": true, "inApp": true, "frequency": "daily"}',
  project_custom_fields jsonb DEFAULT '{}',
  project_tags text[] DEFAULT '{}'
)
RETURNS projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  new_project public.projects;
BEGIN
  -- Get the current authenticated user ID
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create projects';
  END IF;
  
  -- Insert the project with all fields and return the complete record
  INSERT INTO public.projects (
    name,
    description,
    industry,
    project_type,
    target_market,
    primary_objectives,
    success_metrics,
    status,
    priority,
    start_date,
    target_end_date,
    is_public,
    allow_team_access,
    auto_analysis_enabled,
    notification_settings,
    custom_fields,
    tags,
    created_by
  ) VALUES (
    project_name,
    project_description,
    project_industry,
    project_type_param,
    project_target_market,
    project_primary_objectives,
    project_success_metrics,
    project_status,
    project_priority,
    COALESCE(project_start_date, now()),
    project_target_end_date,
    project_is_public,
    project_allow_team_access,
    project_auto_analysis_enabled,
    project_notification_settings,
    project_custom_fields,
    project_tags,
    current_user_id
  ) RETURNING * INTO new_project;
  
  -- Return the complete project record
  RETURN new_project;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise
    RAISE EXCEPTION 'Failed to create project: %', SQLERRM;
END;
$function$;