-- Fix infinite recursion in team_members RLS policies
-- Drop ALL existing policies on team_members table
DROP POLICY IF EXISTS "Users can view team members for accessible teams" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can update team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can update their own team membership status" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can delete team members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view team data" ON public.team_members;
DROP POLICY IF EXISTS "Team members can update their own membership" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can manage members" ON public.team_members;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.can_view_team_members_safe(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Check if user is team owner
  SELECT EXISTS (
    SELECT 1 FROM public.teams 
    WHERE id = p_team_id AND owner_id = p_user_id
  )
  OR
  -- Check if user is a team member via the safe function
  EXISTS (
    SELECT 1 FROM get_user_teams_safe(p_user_id) guts
    WHERE guts.team_id = p_team_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_team_members_safe(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Check if user is team owner
  SELECT EXISTS (
    SELECT 1 FROM public.teams 
    WHERE id = p_team_id AND owner_id = p_user_id
  )
  OR
  -- Check if user has admin/manager role in team
  EXISTS (
    SELECT 1 
    FROM public.team_members tm
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.team_id = p_team_id 
    AND tm.user_id = p_user_id
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.hierarchy_level >= 8 -- Admin level or higher
  );
$function$;

-- Create new RLS policies using security definer functions
CREATE POLICY "Users can view team members for accessible teams"
ON public.team_members
FOR SELECT
USING (can_view_team_members_safe(team_id, auth.uid()));

CREATE POLICY "Team owners and admins can insert team members"
ON public.team_members
FOR INSERT
WITH CHECK (can_manage_team_members_safe(team_id, auth.uid()));

CREATE POLICY "Team owners and admins can update team members"
ON public.team_members
FOR UPDATE
USING (can_manage_team_members_safe(team_id, auth.uid()));

CREATE POLICY "Users can update their own team membership status"
ON public.team_members
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Team owners and admins can delete team members"
ON public.team_members
FOR DELETE
USING (can_manage_team_members_safe(team_id, auth.uid()));