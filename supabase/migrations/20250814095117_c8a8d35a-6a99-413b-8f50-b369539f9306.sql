-- Enhanced team creation integration migration
-- Ensure all required functions and triggers are properly set up

-- Create or update the team creation function with better error handling
CREATE OR REPLACE FUNCTION public.create_team_with_member_integration(
  p_team_name TEXT,
  p_team_description TEXT DEFAULT '',
  p_team_type TEXT DEFAULT 'organization',
  p_member_limit INTEGER DEFAULT 50,
  p_settings JSONB DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_team_id UUID;
  owner_role_id UUID;
  current_user_id UUID;
  result_data JSONB;
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
    lower(regexp_replace(p_team_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(gen_random_uuid()::text, 1, 8),
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

  -- Create default team channel (handled by trigger, but we'll ensure it exists)
  INSERT INTO public.team_channels (team_id, name, description, channel_type, created_by)
  VALUES (
    new_team_id,
    'general',
    'General team discussion',
    'general',
    current_user_id
  ) ON CONFLICT (team_id, name) DO NOTHING;

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
$$;

-- Ensure team channels table exists with proper structure
CREATE TABLE IF NOT EXISTS public.team_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  channel_type TEXT NOT NULL DEFAULT 'general',
  created_by UUID NOT NULL,
  is_private BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_id, name)
);

-- Enable RLS on team_channels
ALTER TABLE public.team_channels ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for team_channels
DROP POLICY IF EXISTS "Team members can view team channels" ON public.team_channels;
CREATE POLICY "Team members can view team channels" ON public.team_channels
FOR SELECT USING (
  team_id IN (
    SELECT tm.team_id 
    FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'::member_status
  )
);

DROP POLICY IF EXISTS "Team members can manage channels" ON public.team_channels;
CREATE POLICY "Team members can manage channels" ON public.team_channels
FOR ALL USING (
  team_id IN (
    SELECT tm.team_id 
    FROM public.team_members tm 
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'::member_status
    AND ur.hierarchy_level >= 6 -- Managers and above
  )
);

-- Create trigger for team channel creation
CREATE OR REPLACE FUNCTION public.create_default_team_channel()
RETURNS TRIGGER AS $$
BEGIN
  -- Create general channel for new team
  INSERT INTO public.team_channels (team_id, name, description, channel_type, created_by)
  VALUES (
    NEW.id,
    'general',
    'General team discussion',
    'general',
    NEW.owner_id
  ) ON CONFLICT (team_id, name) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_create_default_team_channel ON public.teams;
CREATE TRIGGER trigger_create_default_team_channel
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_team_channel();

-- Update team member count trigger
CREATE OR REPLACE FUNCTION public.update_team_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active'::member_status AND NEW.is_active = true THEN
        UPDATE public.teams 
        SET current_member_count = current_member_count + 1 
        WHERE id = NEW.team_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- If member became active
        IF (OLD.status != 'active'::member_status OR OLD.is_active = false) 
           AND NEW.status = 'active'::member_status AND NEW.is_active = true THEN
            UPDATE public.teams 
            SET current_member_count = current_member_count + 1 
            WHERE id = NEW.team_id;
        -- If member became inactive
        ELSIF (OLD.status = 'active'::member_status AND OLD.is_active = true) 
              AND (NEW.status != 'active'::member_status OR NEW.is_active = false) THEN
            UPDATE public.teams 
            SET current_member_count = current_member_count - 1 
            WHERE id = NEW.team_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'active'::member_status AND OLD.is_active = true THEN
        UPDATE public.teams 
        SET current_member_count = current_member_count - 1 
        WHERE id = OLD.team_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS trigger_update_team_member_count ON public.team_members;
CREATE TRIGGER trigger_update_team_member_count
  AFTER INSERT OR UPDATE OR DELETE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_team_member_count();