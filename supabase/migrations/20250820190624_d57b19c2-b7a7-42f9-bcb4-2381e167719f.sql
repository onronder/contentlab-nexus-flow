-- PHASE 1: Fix RLS Policy Infinite Recursion - Handle Dependencies First
-- Update policies that depend on functions we need to modify

-- First, update the activity_logs policy that depends on get_user_teams_safe
DROP POLICY IF EXISTS "Users can view relevant activity logs" ON public.activity_logs;

-- Create a new policy for activity_logs that doesn't depend on the function we're changing
CREATE POLICY "Users can view relevant activity logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR team_id IN (
      SELECT tm.team_id 
      FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
    OR project_id IN (
      SELECT p.id 
      FROM public.projects p
      WHERE p.created_by = auth.uid()
      UNION
      SELECT ptm.project_id
      FROM public.project_team_members ptm
      WHERE ptm.user_id = auth.uid() 
      AND ptm.invitation_status = 'active'
    )
  );

-- Now we can safely drop and recreate the get_user_teams_safe function
DROP FUNCTION IF EXISTS public.get_user_teams_safe(uuid);

-- Create improved get_user_teams_safe function
CREATE OR REPLACE FUNCTION public.get_user_teams_safe(p_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Return teams where user is owner OR active member
  SELECT t.id as team_id
  FROM public.teams t
  WHERE t.owner_id = p_user_id
  AND t.is_active = true
  UNION
  SELECT tm.team_id
  FROM public.team_members tm
  WHERE tm.user_id = p_user_id
  AND tm.is_active = true
  AND tm.status = 'active';
$$;

-- Create the get_user_projects_safe function
CREATE OR REPLACE FUNCTION public.get_user_projects_safe(p_user_id uuid)
RETURNS TABLE(project_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id 
  FROM public.projects p
  WHERE p.created_by = p_user_id
  UNION
  SELECT ptm.project_id
  FROM public.project_team_members ptm
  WHERE ptm.user_id = p_user_id 
  AND ptm.invitation_status = 'active';
$$;