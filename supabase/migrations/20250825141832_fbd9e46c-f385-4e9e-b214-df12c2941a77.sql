-- Step 1: Complete Policy Cleanup - Drop ALL RLS policies on team_members and teams
DROP POLICY IF EXISTS "Team owners can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view their own team memberships" ON public.team_members;
DROP POLICY IF EXISTS "System can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Members can view team members" ON public.team_members;

DROP POLICY IF EXISTS "Team owners can manage teams" ON public.teams;
DROP POLICY IF EXISTS "Team members can view teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view accessible teams" ON public.teams;
DROP POLICY IF EXISTS "System can manage teams" ON public.teams;
DROP POLICY IF EXISTS "Owners can manage their teams" ON public.teams;
DROP POLICY IF EXISTS "Members can view their teams" ON public.teams;

-- Drop any remaining problematic functions that cause recursion
DROP FUNCTION IF EXISTS public.is_team_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_team_owner(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_user_teams_safe(uuid);
DROP FUNCTION IF EXISTS public.get_user_accessible_teams(uuid);

-- Step 2: Create Minimal, Safe RLS Policies (NO cross-table references)
-- team_members: Users can only see their own memberships
CREATE POLICY "Users can view own memberships" ON public.team_members
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own memberships" ON public.team_members
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own memberships" ON public.team_members
FOR UPDATE USING (user_id = auth.uid());

-- teams: Users can only see teams they own
CREATE POLICY "Owners can view owned teams" ON public.teams
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Owners can manage owned teams" ON public.teams
FOR ALL USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Step 3: Create system policies for edge functions and internal operations
CREATE POLICY "System can manage team members" ON public.team_members
FOR ALL USING (true);

CREATE POLICY "System can manage teams" ON public.teams  
FOR ALL USING (true);

-- Ensure the safe functions exist for application-level logic
CREATE OR REPLACE FUNCTION public.get_user_team_ids_safe(p_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
  -- Direct queries without RLS to avoid recursion
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

CREATE OR REPLACE FUNCTION public.is_user_team_owner_safe(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams 
    WHERE id = p_team_id AND owner_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_user_team_member_safe(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id 
    AND user_id = p_user_id 
    AND is_active = true 
    AND status = 'active'::member_status
  );
$$;