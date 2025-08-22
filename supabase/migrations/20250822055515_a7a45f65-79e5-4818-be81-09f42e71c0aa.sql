-- Phase 1: Fix RLS Policies - Remove conflicting circular policies
-- Drop existing problematic policies on teams and team_members tables

-- Drop existing team policies that may cause recursion
DROP POLICY IF EXISTS "Team members can view teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can manage teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams they're members of" ON public.teams;
DROP POLICY IF EXISTS "Users can manage teams they own" ON public.teams;

-- Drop existing team_members policies that may cause recursion  
DROP POLICY IF EXISTS "Team members can view team membership" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can manage team members" ON public.team_members;

-- Create helper function to avoid recursion - get user teams directly
CREATE OR REPLACE FUNCTION public.get_user_teams_direct(user_id_param UUID)
RETURNS TABLE(team_id UUID) 
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT tm.team_id 
  FROM team_members tm 
  WHERE tm.user_id = user_id_param 
    AND tm.is_active = true 
    AND tm.status = 'active'::member_status;
$$;

-- Create helper function to check if user owns team
CREATE OR REPLACE FUNCTION public.is_team_owner(team_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM teams t 
    WHERE t.id = team_id_param 
      AND t.owner_id = user_id_param
  );
$$;

-- Create helper function to check if user is team member
CREATE OR REPLACE FUNCTION public.is_team_member(team_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM team_members tm 
    WHERE tm.team_id = team_id_param 
      AND tm.user_id = user_id_param 
      AND tm.is_active = true 
      AND tm.status = 'active'::member_status
  );
$$;

-- NEW SIMPLIFIED TEAMS POLICIES (no recursion)
CREATE POLICY "Users can view teams they own or are members of" 
ON public.teams FOR SELECT 
USING (
  owner_id = auth.uid() OR 
  is_team_member(id, auth.uid())
);

CREATE POLICY "Users can create teams" 
ON public.teams FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update their teams" 
ON public.teams FOR UPDATE 
USING (owner_id = auth.uid());

CREATE POLICY "Team owners can delete their teams" 
ON public.teams FOR DELETE 
USING (owner_id = auth.uid());

-- NEW SIMPLIFIED TEAM_MEMBERS POLICIES (no recursion)
CREATE POLICY "Users can view team members for their teams" 
ON public.team_members FOR SELECT 
USING (
  user_id = auth.uid() OR 
  is_team_owner(team_id, auth.uid()) OR
  is_team_member(team_id, auth.uid())
);

CREATE POLICY "Team owners can insert team members" 
ON public.team_members FOR INSERT 
WITH CHECK (is_team_owner(team_id, auth.uid()));

CREATE POLICY "Team owners can update team members" 
ON public.team_members FOR UPDATE 
USING (is_team_owner(team_id, auth.uid()));

CREATE POLICY "Team owners and members can leave teams" 
ON public.team_members FOR DELETE 
USING (
  user_id = auth.uid() OR 
  is_team_owner(team_id, auth.uid())
);