-- Fix the create_default_team_for_user function search_path
CREATE OR REPLACE FUNCTION public.create_default_team_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;