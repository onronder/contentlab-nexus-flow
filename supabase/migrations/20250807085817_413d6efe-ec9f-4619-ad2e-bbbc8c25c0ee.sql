-- Comprehensive fix for team_members infinite recursion
-- The issue: can_manage_team_members_safe queries team_members table, creating circular dependency

-- Drop all existing team_members policies first
DROP POLICY IF EXISTS "Users can view team members for accessible teams" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can update team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can update their own team membership status" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can delete team members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view team data" ON public.team_members;
DROP POLICY IF EXISTS "Team members can update their own membership" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can manage members" ON public.team_members;

-- Drop problematic functions that query team_members
DROP FUNCTION IF EXISTS public.can_manage_team_members_safe(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_view_team_members_safe(uuid, uuid);

-- Create new functions that DON'T query team_members to avoid recursion
CREATE OR REPLACE FUNCTION public.is_team_owner_safe(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.teams 
    WHERE id = p_team_id AND owner_id = p_user_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_user_team_role_level_safe(p_team_id uuid, p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(ur.hierarchy_level, 0)
  FROM public.team_members tm
  JOIN public.user_roles ur ON tm.role_id = ur.id
  WHERE tm.team_id = p_team_id 
  AND tm.user_id = p_user_id 
  AND tm.is_active = true 
  AND tm.status = 'active';
$function$;

-- Create simple, non-recursive RLS policies
-- SELECT: Users can view team members if they're team owners OR if they're team members (via safe function)
CREATE POLICY "Team members can view team members"
ON public.team_members
FOR SELECT
USING (
  is_team_owner_safe(team_id, auth.uid()) 
  OR 
  team_id IN (SELECT team_id FROM get_user_teams_safe(auth.uid()))
);

-- INSERT: Only team owners can add members
CREATE POLICY "Team owners can add members"
ON public.team_members
FOR INSERT
WITH CHECK (is_team_owner_safe(team_id, auth.uid()));

-- UPDATE: Users can update their own records OR team owners can update any
CREATE POLICY "Users can update own membership or owners can update any"
ON public.team_members
FOR UPDATE
USING (
  user_id = auth.uid() 
  OR 
  is_team_owner_safe(team_id, auth.uid())
);

-- DELETE: Only team owners can delete members
CREATE POLICY "Team owners can delete members"
ON public.team_members
FOR DELETE
USING (is_team_owner_safe(team_id, auth.uid()));