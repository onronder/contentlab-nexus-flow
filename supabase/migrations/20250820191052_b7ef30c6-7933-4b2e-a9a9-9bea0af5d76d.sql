-- PHASE 3: Complete Production Readiness - Final Implementation
-- Fix enum issue and complete essential functions

-- Enhance Initial User Experience with auto team creation
CREATE OR REPLACE FUNCTION public.create_default_team_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_team_id UUID;
  owner_role_id UUID;
BEGIN
  -- Get the owner role ID
  SELECT id INTO owner_role_id FROM public.user_roles WHERE slug = 'owner' AND is_active = true LIMIT 1;
  
  -- If no owner role exists, create it
  IF owner_role_id IS NULL THEN
    INSERT INTO public.user_roles (name, slug, description, role_type, hierarchy_level, is_active)
    VALUES ('Owner', 'owner', 'Team owner with full permissions', 'management', 10, true)
    RETURNING id INTO owner_role_id;
  END IF;
  
  -- Create default team for new user
  INSERT INTO public.teams (name, slug, description, owner_id, team_type, settings, member_limit, is_active)
  VALUES (
    COALESCE(NEW.full_name, 'My') || '''s Team',
    'team-' || SUBSTRING(NEW.id::text, 1, 8),
    'Default workspace for ' || COALESCE(NEW.full_name, NEW.email, 'User'),
    NEW.id,
    'organization',
    '{"auto_invite": true, "public_join": false}'::jsonb,
    50,
    true
  ) RETURNING id INTO new_team_id;
  
  -- Add user as team owner/member
  INSERT INTO public.team_members (user_id, team_id, role_id, status, is_active, joined_at, invited_by)
  VALUES (NEW.id, new_team_id, owner_role_id, 'active', true, now(), NEW.id);
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create team for new users
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_team_for_user();

-- Create function to check if slug is unique (needed for team creation)
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

-- Helper function to log team activity safely
CREATE OR REPLACE FUNCTION public.log_team_activity(
  p_team_id uuid,
  p_user_id uuid,
  p_activity_type activity_type,
  p_action varchar(255),
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO public.activity_logs (
    team_id, user_id, activity_type, action, description, metadata
  ) VALUES (
    p_team_id, p_user_id, p_activity_type, p_action, p_description, p_metadata
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$;

-- Complete the team creation function
CREATE OR REPLACE FUNCTION public.create_team_with_member_integration(
  p_team_name text,
  p_team_description text DEFAULT '',
  p_team_type text DEFAULT 'organization',
  p_member_limit integer DEFAULT 50,
  p_settings jsonb DEFAULT '{}'
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
    
    -- Check if slug is unique
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
    1,
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

  -- Create default team channel
  INSERT INTO public.team_channels (team_id, name, description, channel_type, created_by)
  VALUES (
    new_team_id,
    'general',
    'General team discussion',
    'general',
    current_user_id
  ) 
  ON CONFLICT (team_id, name) DO NOTHING;

  -- Log the activity using correct enum value
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
      'integration_version', '4.0'
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