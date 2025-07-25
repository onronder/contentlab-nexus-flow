-- Create a secure function to insert projects that properly handles authentication
CREATE OR REPLACE FUNCTION public.create_project_secure(
  project_name TEXT,
  project_description TEXT DEFAULT '',
  project_industry TEXT,
  project_type TEXT DEFAULT 'competitive_analysis',
  project_status TEXT DEFAULT 'planning',
  project_priority TEXT DEFAULT 'medium'
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  industry TEXT,
  project_type TEXT,
  created_by UUID,
  status TEXT,
  priority TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    project_description,
    project_industry,
    project_type,
    current_user_id,
    project_status,
    project_priority
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
  
END;
$$;