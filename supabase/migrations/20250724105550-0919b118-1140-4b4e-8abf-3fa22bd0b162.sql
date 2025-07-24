-- Create security definer functions for project_team_members table to avoid recursion

-- Function to check if user can manage a specific project team
CREATE OR REPLACE FUNCTION public.can_manage_project_team(project_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  -- User is project owner OR user is admin/manager of the project
  SELECT (
    -- Check if user owns the project
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = project_id AND created_by = user_id
    )
    OR
    -- Check if user is admin or manager
    EXISTS (
      SELECT 1 FROM public.project_team_members 
      WHERE project_id = can_manage_project_team.project_id 
      AND user_id = can_manage_project_team.user_id 
      AND role IN ('admin', 'manager')
      AND invitation_status = 'active'
    )
  );
$$;

-- Function to check if user can view a specific project team
CREATE OR REPLACE FUNCTION public.can_view_project_team(project_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  -- User is project owner OR user is active team member
  SELECT (
    -- Check if user owns the project
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = project_id AND created_by = user_id
    )
    OR
    -- Check if user is active team member
    EXISTS (
      SELECT 1 FROM public.project_team_members 
      WHERE project_id = can_view_project_team.project_id 
      AND user_id = can_view_project_team.user_id 
      AND invitation_status = 'active'
    )
  );
$$;

-- Drop existing problematic policies for project_team_members
DROP POLICY IF EXISTS "Project owners and admins can manage team" ON public.project_team_members;
DROP POLICY IF EXISTS "Team members can view project team" ON public.project_team_members;

-- Create new policies using security definer functions
CREATE POLICY "Project owners and admins can manage team" 
ON public.project_team_members 
FOR ALL
USING (public.can_manage_project_team(project_id, auth.uid()));

CREATE POLICY "Team members can view project team" 
ON public.project_team_members 
FOR SELECT 
USING (public.can_view_project_team(project_id, auth.uid()));