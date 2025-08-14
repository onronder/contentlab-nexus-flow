-- Create user_settings table for user preferences and notifications
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_preferences JSONB DEFAULT '{"email": true, "push": false, "in_app": true}'::jsonb,
  theme_preferences JSONB DEFAULT '{"mode": "system", "color": "default"}'::jsonb,
  privacy_settings JSONB DEFAULT '{"profile_visibility": "team", "activity_visibility": "team"}'::jsonb,
  feature_flags JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_settings
CREATE POLICY "Users can view their own settings"
ON public.user_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON public.user_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.user_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON public.user_settings(updated_at);

-- Create trigger for updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get or create user settings
CREATE OR REPLACE FUNCTION public.get_or_create_user_settings(p_user_id UUID)
RETURNS public.user_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_settings_record public.user_settings;
BEGIN
  -- Try to get existing settings
  SELECT * INTO user_settings_record
  FROM public.user_settings
  WHERE user_id = p_user_id;
  
  -- If not found, create default settings
  IF NOT FOUND THEN
    INSERT INTO public.user_settings (user_id)
    VALUES (p_user_id)
    RETURNING * INTO user_settings_record;
  END IF;
  
  RETURN user_settings_record;
END;
$$;

-- Fix team settings by ensuring proper team access validation
CREATE OR REPLACE FUNCTION public.get_user_team_settings_safe(p_user_id UUID)
RETURNS TABLE(
  team_id UUID,
  team_name TEXT,
  team_description TEXT,
  member_count INTEGER,
  active_users INTEGER,
  pending_invitations INTEGER,
  user_role TEXT,
  permissions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    t.description as team_description,
    t.current_member_count as member_count,
    t.current_member_count as active_users,
    COALESCE(inv_count.count, 0)::INTEGER as pending_invitations,
    ur.name as user_role,
    jsonb_build_object(
      'allowMemberInvites', true,
      'allowMemberCreateProjects', true,
      'requireContentApproval', false
    ) as permissions
  FROM public.teams t
  JOIN public.team_members tm ON t.id = tm.team_id
  JOIN public.user_roles ur ON tm.role_id = ur.id
  LEFT JOIN (
    SELECT 
      team_id, 
      COUNT(*) as count
    FROM public.team_invitations 
    WHERE status = 'pending' 
    GROUP BY team_id
  ) inv_count ON t.id = inv_count.team_id
  WHERE tm.user_id = p_user_id 
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND t.is_active = true
  ORDER BY tm.created_at DESC
  LIMIT 1;
END;
$$;