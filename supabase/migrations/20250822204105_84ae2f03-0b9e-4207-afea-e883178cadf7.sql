-- CRITICAL FIX: Eliminate RLS Policy Infinite Recursion
-- This migration fixes 500 errors on /rest/v1/projects, /rest/v1/teams, /rest/v1/activity_logs

-- =============================================
-- PHASE 1: DROP ALL CONFLICTING RLS POLICIES
-- =============================================

-- Drop all existing policies on teams table to eliminate recursion
DROP POLICY IF EXISTS "Users can view teams they are members of" ON public.teams;
DROP POLICY IF EXISTS "Team owners can manage their teams" ON public.teams;
DROP POLICY IF EXISTS "Team members can view team details" ON public.teams;
DROP POLICY IF EXISTS "Team managers can update team settings" ON public.teams;
DROP POLICY IF EXISTS "Authenticated team owners can manage teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated team members can view teams" ON public.teams;
DROP POLICY IF EXISTS "Team administrators can delete teams" ON public.teams;
DROP POLICY IF EXISTS "System can manage teams" ON public.teams;

-- Drop all existing policies on team_members table to eliminate recursion
DROP POLICY IF EXISTS "Users can view their team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated members can view own membership" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated team owners can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated members can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team administrators can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Members can view team membership" ON public.team_members;
DROP POLICY IF EXISTS "Team managers can manage memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can update member roles" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can remove members" ON public.team_members;
DROP POLICY IF EXISTS "System can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view own team membership" ON public.team_members;

-- =============================================
-- PHASE 2: CREATE NON-RECURSIVE RLS POLICIES
-- =============================================

-- TEAMS TABLE POLICIES (NO RECURSION)
-- Policy 1: Team owners can manage their own teams
CREATE POLICY "Team owners manage own teams" ON public.teams
FOR ALL USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Policy 2: Team members can view teams (using safe helper function)
CREATE POLICY "Members view accessible teams" ON public.teams
FOR SELECT USING (
  id IN (SELECT team_id FROM get_user_teams_safe(auth.uid()))
);

-- TEAM_MEMBERS TABLE POLICIES (NO RECURSION)
-- Policy 1: Users can view their own memberships
CREATE POLICY "Users view own memberships" ON public.team_members
FOR SELECT USING (user_id = auth.uid());

-- Policy 2: Team owners can manage members (using safe helper function)
CREATE POLICY "Owners manage team members" ON public.team_members
FOR ALL USING (
  is_team_owner_safe(team_id, auth.uid())
)
WITH CHECK (
  is_team_owner_safe(team_id, auth.uid())
);

-- Policy 3: Users can insert their own membership (for accepting invitations)
CREATE POLICY "Users create own membership" ON public.team_members
FOR INSERT WITH CHECK (user_id = auth.uid());

-- =============================================
-- PHASE 3: VERIFY HELPER FUNCTIONS EXIST
-- =============================================

-- Ensure required helper functions exist (they should already exist)
-- get_user_teams_safe(uuid) - Returns team IDs for user without recursion
-- is_team_owner_safe(uuid, uuid) - Checks team ownership without recursion
-- is_team_member_safe(uuid, uuid) - Checks team membership without recursion

-- =============================================
-- PHASE 4: ADD COMMENTS FOR CLARITY
-- =============================================

COMMENT ON POLICY "Team owners manage own teams" ON public.teams IS 
'Allows team owners to manage their own teams. Uses direct owner_id check to avoid recursion.';

COMMENT ON POLICY "Members view accessible teams" ON public.teams IS 
'Allows team members to view teams they belong to. Uses get_user_teams_safe() helper function to prevent recursion.';

COMMENT ON POLICY "Users view own memberships" ON public.team_members IS 
'Allows users to view their own team memberships. Uses direct user_id check to avoid recursion.';

COMMENT ON POLICY "Owners manage team members" ON public.team_members IS 
'Allows team owners to manage team members. Uses is_team_owner_safe() helper function to prevent recursion.';

COMMENT ON POLICY "Users create own membership" ON public.team_members IS 
'Allows users to create their own membership records (for invitation acceptance). Direct user_id check prevents recursion.';

-- =============================================
-- VERIFICATION QUERIES (FOR TESTING)
-- =============================================

-- Test that policies work without recursion:
-- SELECT * FROM teams WHERE owner_id = auth.uid(); -- Should work for owners
-- SELECT * FROM team_members WHERE user_id = auth.uid(); -- Should work for members
-- SELECT * FROM teams WHERE id IN (SELECT team_id FROM get_user_teams_safe(auth.uid())); -- Should work for members