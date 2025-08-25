-- STEP 1: Temporarily disable RLS to avoid recursion during cleanup
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop ALL existing policies and problematic functions with CASCADE
DROP POLICY IF EXISTS "Team admins can delete teams" ON public.teams CASCADE;
DROP POLICY IF EXISTS "Team admins can update teams" ON public.teams CASCADE;
DROP POLICY IF EXISTS "Team members can view teams" ON public.teams CASCADE;
DROP POLICY IF EXISTS "Team owners can manage teams" ON public.teams CASCADE;
DROP POLICY IF EXISTS "Users can create teams" ON public.teams CASCADE;
DROP POLICY IF EXISTS "Users can view accessible teams" ON public.teams CASCADE;
DROP POLICY IF EXISTS "Owners can manage their teams" ON public.teams CASCADE;
DROP POLICY IF EXISTS "Members can view their teams" ON public.teams CASCADE;
DROP POLICY IF EXISTS "Users can manage teams they own" ON public.teams CASCADE;
DROP POLICY IF EXISTS "Users can view teams they belong to" ON public.teams CASCADE;
DROP POLICY IF EXISTS "Team owners can delete teams" ON public.teams CASCADE;
DROP POLICY IF EXISTS "Team members can view team details" ON public.teams CASCADE;

DROP POLICY IF EXISTS "Team admins can delete members" ON public.team_members CASCADE;
DROP POLICY IF EXISTS "Team admins can manage members" ON public.team_members CASCADE;
DROP POLICY IF EXISTS "Team managers can update member roles" ON public.team_members CASCADE;
DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members CASCADE;
DROP POLICY IF EXISTS "Team owners can manage all members" ON public.team_members CASCADE;
DROP POLICY IF EXISTS "Users can join teams via invitation" ON public.team_members CASCADE;
DROP POLICY IF EXISTS "Users can view their own team memberships" ON public.team_members CASCADE;
DROP POLICY IF EXISTS "Members can view other members" ON public.team_members CASCADE;
DROP POLICY IF EXISTS "Owners can manage members" ON public.team_members CASCADE;
DROP POLICY IF EXISTS "Users can manage their team memberships" ON public.team_members CASCADE;
DROP POLICY IF EXISTS "Users can view team member details" ON public.team_members CASCADE;

-- Drop any remaining policies that might exist
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('teams', 'team_members')) LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename || ' CASCADE';
    END LOOP;
END $$;

-- STEP 3: Ensure get_user_team_ids_safe function exists and is correct
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

-- STEP 4: Re-enable RLS on both tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create minimal, non-recursive policies
-- Teams policies - only direct ownership check
CREATE POLICY "Team owners can manage their teams"
ON public.teams
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Team members policies - only direct user check  
CREATE POLICY "Users can manage their own memberships"
ON public.team_members
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Additional read-only policy for team members to see other members in their teams
CREATE POLICY "Team members can view team member list"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND status = 'active'::member_status
  )
);

-- Teams read policy for team members
CREATE POLICY "Team members can view their teams"
ON public.teams
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND status = 'active'::member_status
  )
);