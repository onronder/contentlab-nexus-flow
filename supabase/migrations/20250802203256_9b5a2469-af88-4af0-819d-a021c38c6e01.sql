-- Fix type conversion in create_project_secure function
CREATE OR REPLACE FUNCTION public.create_project_secure(project_name text, project_industry text, project_description text DEFAULT ''::text, project_type_param text DEFAULT 'competitive_analysis'::text, project_target_market text DEFAULT ''::text, project_primary_objectives text[] DEFAULT '{}'::text[], project_success_metrics text[] DEFAULT '{}'::text[], project_status text DEFAULT 'planning'::text, project_priority text DEFAULT 'medium'::text, project_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, project_target_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, project_is_public boolean DEFAULT false, project_allow_team_access boolean DEFAULT true, project_auto_analysis_enabled boolean DEFAULT true, project_notification_settings jsonb DEFAULT '{"email": true, "inApp": true, "frequency": "daily"}'::jsonb, project_custom_fields jsonb DEFAULT '{}'::jsonb, project_tags text[] DEFAULT '{}'::text[])
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
    to_jsonb(project_primary_objectives),
    to_jsonb(project_success_metrics),
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