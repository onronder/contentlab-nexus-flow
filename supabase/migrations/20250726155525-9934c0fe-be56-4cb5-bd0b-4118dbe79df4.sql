-- Fix analytics by ensuring all projects have start dates

-- Update existing projects that have NULL start_date to use their created_at timestamp
UPDATE public.projects 
SET start_date = created_at 
WHERE start_date IS NULL;

-- Update the create_project_secure function to set start_date by default
CREATE OR REPLACE FUNCTION public.create_project_secure(project_name text, project_description text, project_industry text, project_type_param text, project_status text, project_priority text)
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
  
  -- Insert the project and return the complete record
  INSERT INTO public.projects (
    name,
    description,
    industry,
    project_type,
    created_by,
    status,
    priority,
    start_date
  ) VALUES (
    project_name,
    COALESCE(project_description, ''),
    project_industry,
    COALESCE(project_type_param, 'competitive_analysis'),
    current_user_id,
    COALESCE(project_status, 'planning'),
    COALESCE(project_priority, 'medium'),
    now()
  ) RETURNING * INTO new_project;
  
  -- Return the complete project record
  RETURN new_project;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise
    RAISE EXCEPTION 'Failed to create project: %', SQLERRM;
END;
$function$;