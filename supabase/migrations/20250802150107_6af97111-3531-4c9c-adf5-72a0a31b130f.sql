-- Drop all dependent policies first
DROP POLICY IF EXISTS "Team admins can insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can update team members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can delete team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members for accessible teams" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members;

-- Now drop the problematic functions
DROP FUNCTION IF EXISTS public.is_team_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_team_admin(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_teams(uuid) CASCADE;

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