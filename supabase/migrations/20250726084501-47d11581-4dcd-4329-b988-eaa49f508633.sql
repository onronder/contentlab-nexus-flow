-- Grant execute permissions on the create_project_secure function
GRANT EXECUTE ON FUNCTION public.create_project_secure TO authenticated;

-- Check if the log_project_activity trigger exists and drop it if it does
-- since it's referencing project_activities table which doesn't exist
DROP TRIGGER IF EXISTS project_activity_log ON public.projects;

-- Update the create_project_secure function to handle errors gracefully
CREATE OR REPLACE FUNCTION public.create_project_secure(
  project_name text, 
  project_description text, 
  project_industry text, 
  project_type_param text, 
  project_status text, 
  project_priority text
)
RETURNS TABLE(
  id uuid, 
  name text, 
  description text, 
  industry text, 
  project_type text, 
  created_by uuid, 
  status text, 
  priority text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  new_project_id UUID;
BEGIN
  -- Get the current authenticated user ID
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create projects';
  END IF;
  
  -- Insert the project with explicit user ID
  INSERT INTO public.projects (
    name,
    description,
    industry,
    project_type,
    created_by,
    status,
    priority
  ) VALUES (
    project_name,
    COALESCE(project_description, ''),
    project_industry,
    COALESCE(project_type_param, 'competitive_analysis'),
    current_user_id,
    COALESCE(project_status, 'planning'),
    COALESCE(project_priority, 'medium')
  ) RETURNING projects.id INTO new_project_id;
  
  -- Return the created project data
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.industry,
    p.project_type,
    p.created_by,
    p.status,
    p.priority,
    p.created_at,
    p.updated_at
  FROM public.projects p
  WHERE p.id = new_project_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise
    RAISE EXCEPTION 'Failed to create project: %', SQLERRM;
END;
$function$;