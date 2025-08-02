-- Fix remaining team system integration issues

-- 1. Create a default team for existing users who don't have one
INSERT INTO public.teams (name, slug, description, owner_id, team_type, settings, member_limit)
SELECT 
  'My Team',
  'my-team-' || SUBSTRING(p.id::text, 1, 8),
  'Default team for ' || COALESCE(p.full_name, p.email, 'User'),
  p.id,
  'organization',
  '{"auto_invite": true, "public_join": false}',
  50
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.teams t WHERE t.owner_id = p.id
)
ON CONFLICT DO NOTHING;

-- 2. Add team members for team owners
INSERT INTO public.team_members (user_id, team_id, role_id, status, is_active, joined_at)
SELECT 
  t.owner_id,
  t.id,
  (SELECT id FROM public.user_roles WHERE slug = 'owner' LIMIT 1),
  'active',
  true,
  now()
FROM public.teams t
WHERE NOT EXISTS (
  SELECT 1 FROM public.team_members tm 
  WHERE tm.team_id = t.id AND tm.user_id = t.owner_id
)
ON CONFLICT DO NOTHING;

-- 3. Create function to automatically create team for new users
CREATE OR REPLACE FUNCTION public.create_default_team_for_user()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
  owner_role_id UUID;
BEGIN
  -- Get the owner role ID
  SELECT id INTO owner_role_id FROM public.user_roles WHERE slug = 'owner' LIMIT 1;
  
  -- Create default team
  INSERT INTO public.teams (name, slug, description, owner_id, team_type, settings, member_limit)
  VALUES (
    'My Team',
    'my-team-' || SUBSTRING(NEW.id::text, 1, 8),
    'Default team for ' || COALESCE(NEW.full_name, NEW.email, 'User'),
    NEW.id,
    'organization',
    '{"auto_invite": true, "public_join": false}',
    50
  ) RETURNING id INTO new_team_id;
  
  -- Add user as team owner
  INSERT INTO public.team_members (user_id, team_id, role_id, status, is_active, joined_at)
  VALUES (NEW.id, new_team_id, owner_role_id, 'active', true, now());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger to automatically create teams for new users
DROP TRIGGER IF EXISTS on_profile_created_create_team ON public.profiles;
CREATE TRIGGER on_profile_created_create_team
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_team_for_user();

-- 5. Update team member count for existing teams
UPDATE public.teams 
SET current_member_count = (
  SELECT COUNT(*) 
  FROM public.team_members tm 
  WHERE tm.team_id = teams.id 
  AND tm.is_active = true 
  AND tm.status = 'active'
);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_members_user_team ON public.team_members(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON public.team_members(status, is_active);
CREATE INDEX IF NOT EXISTS idx_teams_owner ON public.teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_slug ON public.user_roles(slug);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email, status);