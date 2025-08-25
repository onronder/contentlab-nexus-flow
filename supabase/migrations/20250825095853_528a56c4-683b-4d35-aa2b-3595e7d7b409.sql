-- CRITICAL SECURITY FIX: Enable Row Level Security on vulnerable tables
-- Fix for publicly accessible sensitive data

-- Enable RLS on profiles table if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on teams table if not already enabled  
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Enable RLS on projects table if not already enabled
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY; 

-- Enable RLS on project_competitors table if not already enabled
ALTER TABLE public.project_competitors ENABLE ROW LEVEL SECURITY;

-- Create secure RLS policies for profiles table
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create secure RLS policies for teams table  
CREATE POLICY "Team owners can manage their teams" 
ON public.teams 
FOR ALL 
USING (auth.uid() = owner_id);

CREATE POLICY "Team members can view their teams" 
ON public.teams 
FOR SELECT 
USING (id IN (
  SELECT team_id FROM public.team_members 
  WHERE user_id = auth.uid() AND is_active = true AND status = 'active'
));

-- Create secure RLS policies for projects table
CREATE POLICY "Project owners can manage their projects" 
ON public.projects 
FOR ALL 
USING (auth.uid() = created_by);

CREATE POLICY "Team members can view team projects" 
ON public.projects 
FOR SELECT 
USING (team_id IN (
  SELECT team_id FROM public.team_members 
  WHERE user_id = auth.uid() AND is_active = true AND status = 'active'
));

CREATE POLICY "Project team members can view assigned projects" 
ON public.projects 
FOR SELECT 
USING (id IN (
  SELECT project_id FROM public.project_team_members 
  WHERE user_id = auth.uid() AND invitation_status = 'active'
));

-- Create secure RLS policies for project_competitors table
CREATE POLICY "Users can manage competitors for accessible projects" 
ON public.project_competitors 
FOR ALL 
USING (project_id IN (
  SELECT id FROM public.projects 
  WHERE created_by = auth.uid() 
  OR team_id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid() AND is_active = true AND status = 'active'
  )
  OR id IN (
    SELECT project_id FROM public.project_team_members 
    WHERE user_id = auth.uid() AND invitation_status = 'active'
  )
));

-- Add missing RLS policy for content_items if needed
DO $$ 
BEGIN
  -- Check if content_items already has RLS enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'content_items' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can manage their own content" 
    ON public.content_items 
    FOR ALL 
    USING (auth.uid() = user_id);
    
    CREATE POLICY "Team members can view team content" 
    ON public.content_items 
    FOR SELECT 
    USING (team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND is_active = true AND status = 'active'
    ));
  END IF;
END $$;