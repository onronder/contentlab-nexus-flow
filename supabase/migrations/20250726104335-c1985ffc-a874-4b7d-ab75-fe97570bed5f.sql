-- Drop the correct trigger that's causing the project_activities error
DROP TRIGGER IF EXISTS log_project_activity_trigger ON public.projects;

-- Also drop the problematic function since it references the non-existent project_activities table
DROP FUNCTION IF EXISTS public.log_project_activity();