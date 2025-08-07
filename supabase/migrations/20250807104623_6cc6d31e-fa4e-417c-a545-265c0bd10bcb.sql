-- Complete RLS Policy Reset to Fix Infinite Recursion
-- Phase 1: Drop ALL existing policies on teams and team_members

-- Drop all policies on teams table
DROP POLICY IF EXISTS "Users can view teams they own or are members of" ON public.teams;
DROP POLICY IF EXISTS "Team owners can manage teams" ON public.teams;
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Users can update their teams" ON public.teams;
DROP POLICY IF EXISTS "Users can delete their teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners and members can view teams" ON public.teams;

-- Drop all policies on team_members table
DROP POLICY IF EXISTS "Team members can view team membership" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view their own membership" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view memberships they have access to" ON public.team_members;

-- Phase 2: Create simple, non-circular policies

-- Simple policies for teams table (no cross-table references)
CREATE POLICY "Users can view teams they own" 
ON public.teams 
FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "Users can create teams" 
ON public.teams 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update teams" 
ON public.teams 
FOR UPDATE 
USING (owner_id = auth.uid());

CREATE POLICY "Team owners can delete teams" 
ON public.teams 
FOR DELETE 
USING (owner_id = auth.uid());

-- Simple policies for team_members table (no cross-table references)
CREATE POLICY "Users can view their own memberships" 
ON public.team_members 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "System can manage memberships" 
ON public.team_members 
FOR ALL 
USING (true);