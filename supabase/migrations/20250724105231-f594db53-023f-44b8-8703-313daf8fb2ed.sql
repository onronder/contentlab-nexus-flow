-- Create security definer functions to avoid RLS recursion

-- Function to check if user owns a project
CREATE OR REPLACE FUNCTION public.is_project_owner(project_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id AND created_by = user_id
  );
$$;

-- Function to check if user is an active team member
CREATE OR REPLACE FUNCTION public.is_project_team_member(project_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_team_members 
    WHERE project_id = is_project_team_member.project_id 
    AND user_id = is_project_team_member.user_id 
    AND invitation_status = 'active'
  );
$$;

-- Function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_project_admin_or_manager(project_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_team_members 
    WHERE project_id = is_project_admin_or_manager.project_id 
    AND user_id = is_project_admin_or_manager.user_id 
    AND role IN ('admin', 'manager')
    AND invitation_status = 'active'
  );
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view projects they own or are members of" ON public.projects;
DROP POLICY IF EXISTS "Project owners and admins can update projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;

-- Create new policies using security definer functions
CREATE POLICY "Users can view projects they own or are members of" 
ON public.projects 
FOR SELECT 
USING (
  public.is_project_owner(id, auth.uid()) OR 
  public.is_project_team_member(id, auth.uid())
);

CREATE POLICY "Project owners and admins can update projects" 
ON public.projects 
FOR UPDATE 
USING (
  public.is_project_owner(id, auth.uid()) OR 
  public.is_project_admin_or_manager(id, auth.uid())
);

CREATE POLICY "Project owners can delete projects" 
ON public.projects 
FOR DELETE 
USING (public.is_project_owner(id, auth.uid()));

CREATE POLICY "Users can create projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (created_by = auth.uid());