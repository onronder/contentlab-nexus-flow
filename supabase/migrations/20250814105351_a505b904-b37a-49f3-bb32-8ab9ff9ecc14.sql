-- Complete fix for infinite recursion in team RLS policies
-- Drop ALL existing problematic RLS policies

-- Drop all policies on teams table
DROP POLICY IF EXISTS "Team owners can update teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can delete teams" ON public.teams;
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view accessible teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams they are members of" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams" ON public.teams;

-- Drop all policies on team_members table
DROP POLICY IF EXISTS "Team owners and admins can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members for accessible teams" ON public.team_members;
DROP POLICY IF EXISTS "Users can view members of their teams" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view their own membership" ON public.team_members;

-- Create a security definer function for slug checking to avoid RLS
CREATE OR REPLACE FUNCTION public.is_slug_unique_safe(p_slug text, p_exclude_team_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.teams 
    WHERE slug = p_slug 
    AND (p_exclude_team_id IS NULL OR id != p_exclude_team_id)
  );
$$;

-- Create simple, non-recursive RLS policies for teams
CREATE POLICY "Users can create their own teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can view teams they own"
ON public.teams
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Team owners can update their teams"
ON public.teams
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Team owners can delete their teams"
ON public.teams
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Create simple, non-recursive RLS policies for team_members
CREATE POLICY "Users can view their own memberships"
ON public.team_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Team owners can view all members"
ON public.team_members
FOR SELECT
TO authenticated
USING (team_id IN (
  SELECT id FROM public.teams WHERE owner_id = auth.uid()
));

CREATE POLICY "Team owners can manage members"
ON public.team_members
FOR ALL
TO authenticated
USING (team_id IN (
  SELECT id FROM public.teams WHERE owner_id = auth.uid()
));

CREATE POLICY "Users can insert their own memberships"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Update the create_team_with_member_integration function to be more robust
CREATE OR REPLACE FUNCTION public.create_team_with_member_integration(
  p_team_name text,
  p_team_description text DEFAULT ''::text,
  p_team_type text DEFAULT 'organization'::text,
  p_member_limit integer DEFAULT 50,
  p_settings jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_team_id UUID;
  owner_role_id UUID;
  current_user_id UUID;
  result_data JSONB;
  team_slug TEXT;
  attempt_count INTEGER := 0;
  max_attempts INTEGER := 10;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create teams';
  END IF;

  -- Get owner role
  SELECT id INTO owner_role_id 
  FROM public.user_roles 
  WHERE slug = 'owner' AND is_active = true 
  LIMIT 1;

  IF owner_role_id IS NULL THEN
    -- Create owner role if it doesn't exist
    INSERT INTO public.user_roles (name, slug, description, role_type, hierarchy_level, is_active)
    VALUES ('Owner', 'owner', 'Team owner with full permissions', 'management', 10, true)
    RETURNING id INTO owner_role_id;
  END IF;

  -- Generate unique slug with retry logic
  LOOP
    attempt_count := attempt_count + 1;
    team_slug := lower(regexp_replace(p_team_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(gen_random_uuid()::text, 1, 8);
    
    -- Check if slug is unique (this function bypasses RLS)
    IF public.is_slug_unique_safe(team_slug) THEN
      EXIT;
    END IF;
    
    IF attempt_count >= max_attempts THEN
      RAISE EXCEPTION 'Unable to generate unique slug after % attempts', max_attempts;
    END IF;
  END LOOP;

  -- Create the team
  INSERT INTO public.teams (
    name, 
    slug, 
    description, 
    owner_id, 
    team_type, 
    settings, 
    member_limit,
    current_member_count,
    is_active
  ) VALUES (
    p_team_name,
    team_slug,
    p_team_description,
    current_user_id,
    p_team_type::team_type,
    p_settings,
    p_member_limit,
    1, -- Owner counts as first member
    true
  ) RETURNING id INTO new_team_id;

  -- Add owner as team member
  INSERT INTO public.team_members (
    user_id, 
    team_id, 
    role_id, 
    status, 
    is_active, 
    joined_at, 
    invited_by
  ) VALUES (
    current_user_id,
    new_team_id,
    owner_role_id,
    'active'::member_status,
    true,
    now(),
    current_user_id
  );

  -- Create default team channel with proper conflict handling
  INSERT INTO public.team_channels (team_id, name, description, channel_type, created_by)
  VALUES (
    new_team_id,
    'general',
    'General team discussion',
    'general',
    current_user_id
  ) 
  ON CONFLICT (team_id, name) DO NOTHING;

  -- Log the activity
  INSERT INTO public.activity_logs (
    team_id, 
    user_id, 
    activity_type, 
    action, 
    description, 
    metadata
  ) VALUES (
    new_team_id,
    current_user_id,
    'team_management'::activity_type,
    'team_created',
    'Team "' || p_team_name || '" was created successfully',
    jsonb_build_object(
      'team_type', p_team_type,
      'member_limit', p_member_limit,
      'auto_setup', true,
      'integration_version', '3.0'
    )
  );

  -- Return team data
  SELECT jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'slug', t.slug,
    'description', t.description,
    'team_type', t.team_type,
    'owner_id', t.owner_id,
    'settings', t.settings,
    'member_limit', t.member_limit,
    'current_member_count', t.current_member_count,
    'is_active', t.is_active,
    'created_at', t.created_at,
    'updated_at', t.updated_at,
    'success', true,
    'message', 'Team created successfully'
  ) INTO result_data
  FROM public.teams t
  WHERE t.id = new_team_id;

  RETURN result_data;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE,
      'message', 'Failed to create team: ' || SQLERRM
    );
END;
$$;