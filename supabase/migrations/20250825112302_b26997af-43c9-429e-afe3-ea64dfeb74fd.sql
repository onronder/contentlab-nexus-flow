-- Phase 1: Drop all problematic RLS policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view team content" ON public.content_items;
DROP POLICY IF EXISTS "Users can view accessible projects" ON public.projects;
DROP POLICY IF EXISTS "Team members can view team projects" ON public.projects;

-- Phase 2: Fix the recursive functions by making them security definer and non-recursive
-- Drop and recreate get_user_teams_safe to prevent recursion
DROP FUNCTION IF EXISTS public.get_user_teams_safe(uuid);
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

-- Drop and recreate get_user_projects_safe to prevent recursion  
DROP FUNCTION IF EXISTS public.get_user_projects_safe(uuid);
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
  AND ptm.invitation_status = 'active'::invitation_status;
$$;

-- Create simple security definer functions for project access
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
    AND invitation_status = 'active'::invitation_status
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

-- Phase 3: Create simple, non-recursive RLS policies
-- Projects policies
CREATE POLICY "Users can view their own projects and team projects" 
ON public.projects 
FOR SELECT 
USING (
  created_by = auth.uid() OR 
  user_can_access_project(id, auth.uid())
);

-- Content policies  
CREATE POLICY "Users can view their own content and team content"
ON public.content_items
FOR SELECT
USING (
  user_id = auth.uid() OR 
  (team_id IS NOT NULL AND user_can_access_team_content(team_id, auth.uid()))
);

-- Phase 4: Remove duplicate policies
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can delete own profile" ON public.profiles;

-- Keep only the public role policies for profiles
-- They're simpler and work fine

-- Phase 5: Fix the extension warning by moving uuid-ossp to extensions schema
DROP EXTENSION IF EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;