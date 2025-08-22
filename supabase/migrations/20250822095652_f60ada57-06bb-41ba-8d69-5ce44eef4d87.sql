-- PHASE 1: Complete RLS Policy Cleanup - Drop ALL conflicting policies
-- Drop all existing RLS policies on teams table
DROP POLICY IF EXISTS "Teams are viewable by authenticated members" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams they own or are members of" ON public.teams;
DROP POLICY IF EXISTS "Users can view their own teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can manage their teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can update their teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can delete their teams" ON public.teams;
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;

-- Drop all existing RLS policies on team_members table
DROP POLICY IF EXISTS "member_select_owned_teams" ON public.team_members;
DROP POLICY IF EXISTS "Users can view their own team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Team managers can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Users can manage their own membership" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can manage team members" ON public.team_members;

-- PHASE 2: Create clean, simple RLS policies without recursion

-- Teams table policies - Simple and direct
CREATE POLICY "Users can view teams they own"
ON public.teams
FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "Users can view teams they are members of"
ON public.teams
FOR SELECT
USING (id IN (
  SELECT team_id FROM public.team_members
  WHERE user_id = auth.uid() 
  AND is_active = true 
  AND status = 'active'
));

CREATE POLICY "Users can create teams"
ON public.teams
FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update their teams"
ON public.teams
FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can delete their teams"
ON public.teams
FOR DELETE
USING (owner_id = auth.uid());

-- Team members table policies - Simple and direct
CREATE POLICY "Users can view their own memberships"
ON public.team_members
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Team owners can view all team members"
ON public.team_members
FOR SELECT
USING (team_id IN (
  SELECT id FROM public.teams 
  WHERE owner_id = auth.uid()
));

CREATE POLICY "Team owners can manage team members"
ON public.team_members
FOR ALL
USING (team_id IN (
  SELECT id FROM public.teams 
  WHERE owner_id = auth.uid()
))
WITH CHECK (team_id IN (
  SELECT id FROM public.teams 
  WHERE owner_id = auth.uid()
));

CREATE POLICY "Users can update their own membership status"
ON public.team_members
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());