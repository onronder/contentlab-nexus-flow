-- Phase 1: Drop all dependent policies first
DROP POLICY IF EXISTS "Team members can view other team members" ON public.team_members;
DROP POLICY IF EXISTS "Members view accessible teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view team content" ON public.content_items;
DROP POLICY IF EXISTS "Users can view accessible projects" ON public.projects;
DROP POLICY IF EXISTS "Team members can view team projects" ON public.projects;

-- Phase 2: Now drop and recreate the problematic functions
DROP FUNCTION IF EXISTS public.get_user_teams_safe(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.get_user_teams_safe(p_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Direct queries without RLS to avoid recursion
  SELECT t.id as team_id
  FROM public.teams t
  WHERE t.owner_id = p_user_id
  AND t.is_active = true
  UNION
  SELECT tm.team_id
  FROM public.team_members tm
  WHERE tm.user_id = p_user_id
  AND tm.is_active = true
  AND tm.status = 'active'::member_status;
$$;

DROP FUNCTION IF EXISTS public.get_user_projects_safe(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.get_user_projects_safe(p_user_id uuid)
RETURNS TABLE(project_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Direct queries without RLS to avoid recursion
  SELECT p.id as project_id
  FROM public.projects p
  WHERE p.created_by = p_user_id
  UNION
  SELECT ptm.project_id
  FROM public.project_team_members ptm
  WHERE ptm.user_id = p_user_id 
  AND ptm.invitation_status = 'active';
$$;

-- Create simple security definer functions for access control
CREATE OR REPLACE FUNCTION public.user_can_access_project(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    -- User owns the project
    SELECT 1 FROM public.projects 
    WHERE id = p_project_id AND created_by = p_user_id
    UNION
    -- User is active team member
    SELECT 1 FROM public.project_team_members 
    WHERE project_id = p_project_id 
    AND user_id = p_user_id 
    AND invitation_status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_team_content(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    -- User owns the team
    SELECT 1 FROM public.teams 
    WHERE id = p_team_id AND owner_id = p_user_id
    UNION
    -- User is active team member
    SELECT 1 FROM public.team_members 
    WHERE team_id = p_team_id 
    AND user_id = p_user_id 
    AND is_active = true 
    AND status = 'active'::member_status
  );
$$;