-- Fix infinite recursion in team_members RLS policies
-- Drop all existing problematic RLS policies on team_members
DROP POLICY IF EXISTS "Team members can view same team members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view team membership" ON public.team_members;
DROP POLICY IF EXISTS "Users can view their own team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can manage all team members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view other team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can manage their own team memberships" ON public.team_members;

-- Create new, secure non-recursive RLS policies
-- Policy 1: Users can view their own team memberships
CREATE POLICY "Users can view own team memberships" ON public.team_members
FOR SELECT USING (user_id = auth.uid());

-- Policy 2: Team owners can view all members of their teams
CREATE POLICY "Team owners can view team members" ON public.team_members
FOR SELECT USING (
  team_id IN (
    SELECT t.id FROM public.teams t 
    WHERE t.owner_id = auth.uid()
  )
);

-- Policy 3: Team members can view other members of same teams (using security definer function)
CREATE POLICY "Team members can view same team members" ON public.team_members
FOR SELECT USING (
  team_id IN (
    SELECT team_id FROM public.get_user_teams_safe(auth.uid())
  )
);

-- Policy 4: Users can insert their own team memberships (for invitations)
CREATE POLICY "Users can insert own team memberships" ON public.team_members
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy 5: Team owners can manage all team members
CREATE POLICY "Team owners can manage team members" ON public.team_members
FOR ALL USING (
  team_id IN (
    SELECT t.id FROM public.teams t 
    WHERE t.owner_id = auth.uid()
  )
) WITH CHECK (
  team_id IN (
    SELECT t.id FROM public.teams t 
    WHERE t.owner_id = auth.uid()
  )
);

-- Policy 6: Users can update their own team membership status
CREATE POLICY "Users can update own team memberships" ON public.team_members
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());