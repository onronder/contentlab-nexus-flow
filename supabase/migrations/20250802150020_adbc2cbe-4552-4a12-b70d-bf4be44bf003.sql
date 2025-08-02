-- Drop all existing problematic policies first
DROP POLICY IF EXISTS "Team owners and admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members for accessible teams" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can manage team members" ON public.team_members;

-- Also drop the problematic existing functions that cause recursion
DROP FUNCTION IF EXISTS public.is_team_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_team_admin(uuid, uuid);

-- Create teams table (missing)
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  team_type VARCHAR(50) NOT NULL DEFAULT 'project',
  parent_team_id UUID REFERENCES public.teams(id),
  owner_id UUID NOT NULL,
  current_member_count INTEGER NOT NULL DEFAULT 0,
  member_limit INTEGER,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (missing)  
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  role_type VARCHAR(50) NOT NULL DEFAULT 'custom',
  hierarchy_level INTEGER NOT NULL DEFAULT 1,
  permissions JSONB DEFAULT '[]',
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_invitations table (missing)
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role_id UUID NOT NULL REFERENCES public.user_roles(id),
  invited_by UUID NOT NULL,
  invitation_token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID,
  declined_at TIMESTAMP WITH TIME ZONE,
  message TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Insert default user roles
INSERT INTO public.user_roles (name, slug, description, role_type, hierarchy_level, is_system_role) VALUES
  ('Owner', 'owner', 'Full administrative access', 'system', 10, true),
  ('Admin', 'admin', 'Administrative access with some restrictions', 'system', 8, true),
  ('Manager', 'manager', 'Team management capabilities', 'system', 6, true),
  ('Member', 'member', 'Standard team member access', 'system', 4, true),
  ('Viewer', 'viewer', 'Read-only access', 'system', 2, true)
ON CONFLICT (slug) DO NOTHING;

-- Create NEW security definer functions that avoid recursion
CREATE OR REPLACE FUNCTION public.get_user_team_role_level_safe(p_team_id UUID, p_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(ur.hierarchy_level, 0)
  FROM public.team_members tm
  JOIN public.user_roles ur ON tm.role_id = ur.id
  WHERE tm.team_id = p_team_id 
  AND tm.user_id = p_user_id 
  AND tm.is_active = true 
  AND tm.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.is_team_owner_safe(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams 
    WHERE id = p_team_id AND owner_id = p_user_id
  );
$$;

-- Create safe RLS policies for teams
CREATE POLICY "Users can view teams they own or are members of" 
ON public.teams FOR SELECT 
USING (
  owner_id = auth.uid() OR 
  id IN (
    SELECT tm.team_id FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
  )
);

CREATE POLICY "Users can create teams" 
ON public.teams FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update teams" 
ON public.teams FOR UPDATE 
USING (public.is_team_owner_safe(id, auth.uid()));

-- Create safe RLS policies for team_members (no self-reference)
CREATE POLICY "Users can view team members for accessible teams" 
ON public.team_members FOR SELECT 
USING (
  team_id IN (
    SELECT t.id FROM public.teams t 
    WHERE t.owner_id = auth.uid()
  )
  OR 
  user_id = auth.uid()
);

CREATE POLICY "Team owners and admins can manage team members" 
ON public.team_members FOR ALL 
USING (
  public.is_team_owner_safe(team_id, auth.uid()) OR 
  public.get_user_team_role_level_safe(team_id, auth.uid()) >= 8
);

-- User roles policies
CREATE POLICY "Anyone can view user roles" 
ON public.user_roles FOR SELECT 
USING (true);

-- Team invitations policies  
CREATE POLICY "Team members can view invitations for their teams" 
ON public.team_invitations FOR SELECT 
USING (
  team_id IN (
    SELECT t.id FROM public.teams t 
    WHERE t.owner_id = auth.uid()
  )
);

CREATE POLICY "Team owners and admins can manage invitations" 
ON public.team_invitations FOR ALL 
USING (
  public.is_team_owner_safe(team_id, auth.uid()) OR 
  public.get_user_team_role_level_safe(team_id, auth.uid()) >= 8
);