-- Add team_id to projects table to enable team-based project filtering
ALTER TABLE public.projects ADD COLUMN team_id UUID REFERENCES public.teams(id);

-- Update existing projects to belong to the user's team (first team they own)
UPDATE public.projects 
SET team_id = (
  SELECT t.id 
  FROM public.teams t 
  WHERE t.owner_id = public.projects.created_by 
  LIMIT 1
)
WHERE team_id IS NULL;

-- Add team_id to content_items for team-based content filtering
ALTER TABLE public.content_items ADD COLUMN team_id UUID REFERENCES public.teams(id);

-- Update existing content to belong to the user's team
UPDATE public.content_items 
SET team_id = (
  SELECT t.id 
  FROM public.teams t 
  WHERE t.owner_id = public.content_items.user_id 
  LIMIT 1
)
WHERE team_id IS NULL;

-- Create indexes for better performance
CREATE INDEX idx_projects_team_id ON public.projects(team_id);
CREATE INDEX idx_content_items_team_id ON public.content_items(team_id);

-- Update RLS policies for team-based project access
DROP POLICY IF EXISTS "Users can view accessible projects" ON public.projects;
CREATE POLICY "Users can view team projects and own projects" ON public.projects
FOR SELECT USING (
  created_by = auth.uid() OR 
  team_id IN (
    SELECT tm.team_id 
    FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
  )
);

DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
CREATE POLICY "Users can create projects" ON public.projects
FOR INSERT WITH CHECK (
  created_by = auth.uid() AND
  team_id IN (
    SELECT tm.team_id 
    FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
  )
);

DROP POLICY IF EXISTS "Users can update their projects or team projects" ON public.projects;
CREATE POLICY "Users can update their projects or team projects" ON public.projects
FOR UPDATE USING (
  created_by = auth.uid() OR 
  (team_id IN (
    SELECT tm.team_id 
    FROM public.team_members tm 
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.hierarchy_level >= 6 -- managers and above
  ))
);

-- Update RLS policies for team-based content access
DROP POLICY IF EXISTS "Users can view their own content or project content" ON public.content_items;
CREATE POLICY "Users can view team content and own content" ON public.content_items
FOR SELECT USING (
  user_id = auth.uid() OR 
  team_id IN (
    SELECT tm.team_id 
    FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
  )
);

DROP POLICY IF EXISTS "Users can create content in their projects" ON public.content_items;
CREATE POLICY "Users can create team content" ON public.content_items
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  team_id IN (
    SELECT tm.team_id 
    FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
  )
);

-- Update project competitors for team-based access
DROP POLICY IF EXISTS "Team members can view competitors" ON public.project_competitors;
CREATE POLICY "Team members can view team competitors" ON public.project_competitors
FOR SELECT USING (
  project_id IN (
    SELECT p.id 
    FROM public.projects p 
    WHERE p.created_by = auth.uid() OR 
    p.team_id IN (
      SELECT tm.team_id 
      FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  )
);

DROP POLICY IF EXISTS "Team members with permissions can manage competitors" ON public.project_competitors;
CREATE POLICY "Team members with permissions can manage team competitors" ON public.project_competitors
FOR ALL USING (
  project_id IN (
    SELECT p.id 
    FROM public.projects p 
    WHERE p.created_by = auth.uid() OR 
    p.team_id IN (
      SELECT tm.team_id 
      FROM public.team_members tm 
      JOIN public.user_roles ur ON tm.role_id = ur.id
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
      AND ur.hierarchy_level >= 5 -- analysts and above
    )
  )
);

-- Create a function to get user's accessible teams for better performance
CREATE OR REPLACE FUNCTION public.get_user_accessible_teams(p_user_id UUID)
RETURNS TABLE(team_id UUID) 
LANGUAGE SQL 
STABLE 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
  SELECT tm.team_id 
  FROM public.team_members tm 
  WHERE tm.user_id = p_user_id 
  AND tm.is_active = true 
  AND tm.status = 'active';
$$;

-- Create a function to check if user can manage team resources
CREATE OR REPLACE FUNCTION public.can_manage_team_resources(p_user_id UUID, p_team_id UUID)
RETURNS BOOLEAN 
LANGUAGE SQL 
STABLE 
SECURITY DEFINER 
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