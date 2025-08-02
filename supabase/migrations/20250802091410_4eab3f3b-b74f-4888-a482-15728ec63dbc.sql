-- Create security definer functions to prevent infinite recursion in team_members policies

-- Function to check if user is team member
CREATE OR REPLACE FUNCTION public.is_team_member(team_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = team_id_param 
    AND user_id = user_id_param 
    AND is_active = true 
    AND status = 'active'
  );
$$;

-- Function to check if user is team admin
CREATE OR REPLACE FUNCTION public.is_team_admin(team_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.team_id = team_id_param 
    AND tm.user_id = user_id_param 
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.hierarchy_level >= 8
  );
$$;

-- Function to get user's teams
CREATE OR REPLACE FUNCTION public.get_user_teams(user_id_param uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tm.team_id FROM public.team_members tm
  WHERE tm.user_id = user_id_param 
  AND tm.is_active = true 
  AND tm.status = 'active';
$$;

-- Drop existing conflicting policies on team_members
DROP POLICY IF EXISTS "Team members can view their team" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can update members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can delete members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can insert members" ON public.team_members;

-- Create new non-recursive policies using security definer functions
CREATE POLICY "Users can view team members for their teams"
ON public.team_members
FOR SELECT
TO authenticated
USING (team_id IN (SELECT get_user_teams(auth.uid())));

CREATE POLICY "Team admins can insert team members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (is_team_admin(team_id, auth.uid()));

CREATE POLICY "Team admins can update team members"
ON public.team_members
FOR UPDATE
TO authenticated
USING (is_team_admin(team_id, auth.uid()));

CREATE POLICY "Team admins can delete team members"
ON public.team_members
FOR DELETE
TO authenticated
USING (is_team_admin(team_id, auth.uid()));