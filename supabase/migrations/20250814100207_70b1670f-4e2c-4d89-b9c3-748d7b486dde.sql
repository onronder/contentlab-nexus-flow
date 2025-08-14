-- Fix team_channels table unique constraint issue
-- Add the missing unique constraint that the ON CONFLICT clause expects

-- First, check if constraint exists and add if missing
DO $$ 
BEGIN
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'team_channels_team_id_name_key'
    ) THEN
        ALTER TABLE public.team_channels 
        ADD CONSTRAINT team_channels_team_id_name_key UNIQUE (team_id, name);
    END IF;
END $$;

-- Ensure team_channels table has all required columns
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_channels' AND column_name = 'channel_type') THEN
        ALTER TABLE public.team_channels ADD COLUMN channel_type text DEFAULT 'general';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_channels' AND column_name = 'created_by') THEN
        ALTER TABLE public.team_channels ADD COLUMN created_by uuid;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_channels' AND column_name = 'description') THEN
        ALTER TABLE public.team_channels ADD COLUMN description text;
    END IF;
END $$;

-- Update the create_team_with_member_integration function to handle the constraint properly
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
AS $function$
DECLARE
  new_team_id UUID;
  owner_role_id UUID;
  current_user_id UUID;
  result_data JSONB;
  team_slug TEXT;
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

  -- Generate unique slug
  team_slug := lower(regexp_replace(p_team_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(gen_random_uuid()::text, 1, 8);

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
    'Team "' || p_team_name || '" was created with full integration',
    jsonb_build_object(
      'team_type', p_team_type,
      'member_limit', p_member_limit,
      'auto_setup', true,
      'integration_version', '2.0'
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
    'message', 'Team created successfully with full integration'
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
$function$;