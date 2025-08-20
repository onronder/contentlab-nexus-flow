-- PHASE 1: Fix RLS Policy Infinite Recursion (CRITICAL)
-- This addresses the "infinite recursion detected in policy for relation team_members" error
-- that prevents users from accessing projects, content, and other team-related features

-- Create security definer functions to avoid circular dependencies in RLS policies
-- These functions bypass RLS when checking permissions, preventing infinite recursion

-- Function to safely check if user is a team member (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_team_member_safe(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = p_team_id 
    AND user_id = p_user_id 
    AND is_active = true 
    AND status = 'active'
  );
$$;

-- Function to safely get user's accessible teams (avoids recursion)
CREATE OR REPLACE FUNCTION public.get_user_accessible_teams(p_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tm.team_id 
  FROM public.team_members tm 
  WHERE tm.user_id = p_user_id 
  AND tm.is_active = true 
  AND tm.status = 'active';
$$;

-- Function to safely check if user is team owner
CREATE OR REPLACE FUNCTION public.is_team_owner_safe(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams 
    WHERE id = p_team_id AND owner_id = p_user_id
  );
$$;

-- Function to safely get user's role level in team
CREATE OR REPLACE FUNCTION public.get_user_team_role_level_safe(p_team_id uuid, p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(ur.hierarchy_level, 0)
  FROM public.team_members tm
  JOIN public.user_roles ur ON tm.role_id = ur.id
  WHERE tm.team_id = p_team_id 
  AND tm.user_id = p_user_id 
  AND tm.is_active = true 
  AND tm.status = 'active';
$$;

-- Function to check if user can manage team resources
CREATE OR REPLACE FUNCTION public.can_manage_team_resources(p_user_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.team_members tm 
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = p_user_id 
    AND tm.team_id = p_team_id
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.hierarchy_level >= 6 -- managers and above
  );
$$;

-- Function to safely get user's teams (avoiding recursion)
CREATE OR REPLACE FUNCTION public.get_user_teams_safe(p_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Only return teams where user is owner to avoid circular dependency
  SELECT t.id as team_id
  FROM public.teams t
  WHERE t.owner_id = p_user_id
  AND t.is_active = true;
$$;

-- Function to get projects user can access safely
CREATE OR REPLACE FUNCTION public.get_user_projects_safe(p_user_id uuid)
RETURNS TABLE(project_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id 
  FROM public.projects p
  WHERE p.created_by = p_user_id
  UNION
  SELECT ptm.project_id
  FROM public.project_team_members ptm
  WHERE ptm.user_id = p_user_id 
  AND ptm.invitation_status = 'active';
$$;

-- Now fix the problematic RLS policies using these safe functions

-- Fix team_members policies (remove circular dependencies)
DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view their own team memberships" ON public.team_members;

-- Create non-recursive policies for team_members
CREATE POLICY "Users can view their own team memberships" ON public.team_members
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Team owners can manage all team members" ON public.team_members
  FOR ALL TO authenticated
  USING (public.is_team_owner_safe(team_id, auth.uid()))
  WITH CHECK (public.is_team_owner_safe(team_id, auth.uid()));

CREATE POLICY "Team members can view other team members" ON public.team_members
  FOR SELECT TO authenticated
  USING (team_id IN (SELECT team_id FROM public.get_user_accessible_teams(auth.uid())));

-- Fix projects policies to use safe functions
DROP POLICY IF EXISTS "Users can view team projects" ON public.projects;
DROP POLICY IF EXISTS "Project creators can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Team members can view projects" ON public.projects;

CREATE POLICY "Project creators can manage their projects" ON public.projects
  FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view accessible projects" ON public.projects
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() 
    OR id IN (SELECT project_id FROM public.get_user_projects_safe(auth.uid()))
  );

-- Fix content_items policies
DROP POLICY IF EXISTS "Users can view team content and own content" ON public.content_items;
DROP POLICY IF EXISTS "Users can create team content" ON public.content_items;

CREATE POLICY "Users can manage their own content" ON public.content_items
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view team content" ON public.content_items
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR team_id IN (SELECT team_id FROM public.get_user_accessible_teams(auth.uid()))
  );

-- Log this critical fix
INSERT INTO public.activity_logs (
  activity_type, 
  action, 
  description, 
  metadata
) VALUES (
  'system_maintenance',
  'rls_policy_recursion_fixed', 
  'CRITICAL: Fixed infinite recursion in RLS policies for team_members, projects, and content_items',
  jsonb_build_object(
    'affected_tables', array['team_members', 'projects', 'content_items'],
    'fix_type', 'SECURITY_DEFINER_FUNCTIONS',
    'security_functions_created', array[
      'is_team_member_safe', 'get_user_accessible_teams', 'is_team_owner_safe',
      'get_user_team_role_level_safe', 'can_manage_team_resources', 
      'get_user_teams_safe', 'get_user_projects_safe'
    ]
  )
) ON CONFLICT DO NOTHING;