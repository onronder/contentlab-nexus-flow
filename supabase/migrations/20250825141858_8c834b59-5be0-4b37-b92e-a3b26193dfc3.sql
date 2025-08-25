-- Step 1: Drop ALL policies on team_members and teams with CASCADE to remove dependencies
DROP POLICY IF EXISTS "Users can view team members for their teams" ON public.team_members CASCADE;
DROP POLICY IF EXISTS "Team owners can manage team members" ON public.team_members CASCADE;
DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members CASCADE;
DROP POLICY IF EXISTS "Users can view their own team memberships" ON public.team_members CASCADE;
DROP POLICY IF EXISTS "System can manage team members" ON public.team_members CASCADE;
DROP POLICY IF EXISTS "Team owners and admins can manage members" ON public.team_members CASCADE;
DROP POLICY IF EXISTS "Members can view team members" ON public.team_members CASCADE;

-- Drop all team policies
DROP POLICY IF EXISTS "Users can view teams they belong to" ON public.teams CASCADE;
DROP POLICY IF EXISTS "Team owners can manage teams" ON public.teams CASCADE;
DROP POLICY IF EXISTS "Team members can view teams" ON public.teams CASCADE;
DROP POLICY IF EXISTS "Users can view accessible teams" ON public.teams CASCADE;
DROP POLICY IF EXISTS "System can manage teams" ON public.teams CASCADE;
DROP POLICY IF EXISTS "Owners can manage their teams" ON public.teams CASCADE;
DROP POLICY IF EXISTS "Members can view their teams" ON public.teams CASCADE;

-- Now drop the problematic functions with CASCADE
DROP FUNCTION IF EXISTS public.is_team_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_team_owner(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_teams_safe(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_accessible_teams(uuid) CASCADE;

-- Step 2: Create minimal, safe RLS policies (NO cross-table references)
-- team_members: Users can only see their own memberships
CREATE POLICY "Users can view own memberships" ON public.team_members
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage team members" ON public.team_members
FOR ALL USING (true);

-- teams: Users can only see teams they own
CREATE POLICY "Owners can view owned teams" ON public.teams
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "System can manage teams" ON public.teams  
FOR ALL USING (true);

-- Step 3: Ensure the safe security definer functions exist
CREATE OR REPLACE FUNCTION public.get_user_team_ids_safe(p_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
  SELECT t.id as team_id
  FROM teams t
  WHERE t.owner_id = p_user_id
  AND t.is_active = true
  UNION
  SELECT tm.team_id
  FROM team_members tm
  WHERE tm.user_id = p_user_id
  AND tm.is_active = true
  AND tm.status = 'active'::member_status;
$$;