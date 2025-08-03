-- Fix activity_logs RLS policies to prevent infinite recursion
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view team activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "System can create activity logs" ON public.activity_logs;

-- Create a security definer function to get user teams safely
CREATE OR REPLACE FUNCTION public.get_user_teams_safe(p_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT tm.team_id 
  FROM public.team_members tm
  WHERE tm.user_id = p_user_id 
  AND tm.is_active = true 
  AND tm.status = 'active';
$function$;

-- Create a security definer function to get user projects safely
CREATE OR REPLACE FUNCTION public.get_user_projects_safe(p_user_id uuid)
RETURNS TABLE(project_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id 
  FROM public.projects p
  WHERE p.created_by = p_user_id
  UNION
  SELECT ptm.project_id
  FROM public.project_team_members ptm
  WHERE ptm.user_id = p_user_id 
  AND ptm.invitation_status = 'active';
$function$;

-- Create new simplified RLS policies
CREATE POLICY "Users can view relevant activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  team_id IN (SELECT team_id FROM public.get_user_teams_safe(auth.uid())) OR
  project_id IN (SELECT project_id FROM public.get_user_projects_safe(auth.uid()))
);

-- Allow system to create activity logs
CREATE POLICY "System can create activity logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (true);