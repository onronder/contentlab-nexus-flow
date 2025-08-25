-- Complete RLS Recursion Fix
-- Phase 1: Create truly safe security definer functions that disable RLS

-- Drop existing problematic functions
DROP FUNCTION IF EXISTS public.get_user_teams_safe(uuid);
DROP FUNCTION IF EXISTS public.get_user_accessible_teams(uuid);
DROP FUNCTION IF EXISTS public.is_team_member_safe(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_team_owner_safe(uuid, uuid);

-- Create truly safe security definer functions that disable RLS
CREATE OR REPLACE FUNCTION public.get_user_team_ids_safe(p_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.is_user_team_owner_safe(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM teams 
    WHERE id = p_team_id AND owner_id = p_user_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_user_team_member_safe(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id 
    AND user_id = p_user_id 
    AND is_active = true 
    AND status = 'active'::member_status
  );
$function$;

-- Phase 2: Clean slate - Drop ALL existing RLS policies on problematic tables

-- Drop all team_members policies
DROP POLICY IF EXISTS "Users can view own team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view same team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can insert own team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can update own team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view team membership" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view other team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can manage their own team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can manage all team members" ON public.team_members;

-- Drop all teams policies
DROP POLICY IF EXISTS "Users can view teams they own" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams they are members of" ON public.teams;
DROP POLICY IF EXISTS "Team owners can manage their teams" ON public.teams;
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team members can view team details" ON public.teams;

-- Phase 3: Create simple, direct RLS policies without recursion

-- Simple team_members policies using only direct comparisons
CREATE POLICY "team_members_select_own" ON public.team_members
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "team_members_insert_own" ON public.team_members
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "team_members_update_own" ON public.team_members
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Simple teams policies using only direct comparisons
CREATE POLICY "teams_select_owner" ON public.teams
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "teams_insert_owner" ON public.teams
FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "teams_update_owner" ON public.teams
FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "teams_delete_owner" ON public.teams
FOR DELETE USING (owner_id = auth.uid());

-- Phase 4: Create admin override policies for system operations
-- These will be used by application code for broader team access

CREATE POLICY "team_members_admin_access" ON public.team_members
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    JOIN user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'::member_status
    AND ur.slug IN ('admin', 'super_admin', 'system_admin')
    AND ur.is_active = true
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members tm
    JOIN user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'::member_status
    AND ur.slug IN ('admin', 'super_admin', 'system_admin')
    AND ur.is_active = true
  )
);

CREATE POLICY "teams_admin_access" ON public.teams
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    JOIN user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'::member_status
    AND ur.slug IN ('admin', 'super_admin', 'system_admin')
    AND ur.is_active = true
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members tm
    JOIN user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'::member_status
    AND ur.slug IN ('admin', 'super_admin', 'system_admin')
    AND ur.is_active = true
  )
);