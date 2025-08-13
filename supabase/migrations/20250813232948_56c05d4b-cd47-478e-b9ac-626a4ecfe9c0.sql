-- Phase 1: Fix RLS policies and ensure default team creation

-- First, ensure every user has a default team via improved trigger
CREATE OR REPLACE FUNCTION public.create_default_team_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
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

-- Create trigger for automatic team creation when profile is created
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_team_for_user();

-- Update teams table RLS policies to be more permissive for user's own teams
DROP POLICY IF EXISTS "Users can view their teams" ON public.teams;
CREATE POLICY "Users can view their teams" ON public.teams
FOR SELECT USING (
  owner_id = auth.uid() OR 
  id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid() AND is_active = true AND status = 'active'
  )
);

DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
CREATE POLICY "Users can create teams" ON public.teams
FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Team owners can update teams" ON public.teams;
CREATE POLICY "Team owners can update teams" ON public.teams
FOR UPDATE USING (owner_id = auth.uid());

-- Update team_members RLS policies
DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
CREATE POLICY "Users can view team members" ON public.team_members
FOR SELECT USING (
  user_id = auth.uid() OR 
  team_id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid() AND is_active = true AND status = 'active'
  )
);

DROP POLICY IF EXISTS "Team managers can manage members" ON public.team_members;
CREATE POLICY "Team managers can manage members" ON public.team_members
FOR ALL USING (
  team_id IN (
    SELECT id FROM public.teams WHERE owner_id = auth.uid()
  ) OR
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.hierarchy_level >= 8
  )
);

-- Ensure existing users without teams get default teams
DO $$
DECLARE
  profile_record public.profiles;
BEGIN
  FOR profile_record IN 
    SELECT * FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.teams t WHERE t.owner_id = p.id
    )
  LOOP
    PERFORM public.create_default_team_for_user.* FROM (SELECT profile_record.*) AS NEW;
  END LOOP;
END $$;