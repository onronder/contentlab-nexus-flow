-- Create settings tables with proper structure
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme jsonb DEFAULT '{"mode": "light", "color": "blue"}',
  notifications jsonb DEFAULT '{"email": true, "push": true, "inApp": true}',
  privacy jsonb DEFAULT '{"profileVisible": true, "activityTracking": true}',
  accessibility jsonb DEFAULT '{"fontSize": "medium", "contrast": "normal"}',
  language text DEFAULT 'en',
  timezone text DEFAULT 'UTC',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dashboard jsonb DEFAULT '{"layout": "grid", "widgets": []}',
  analysis jsonb DEFAULT '{"autoRun": true, "frequency": "daily"}',
  notifications jsonb DEFAULT '{"mentions": true, "updates": true}',
  collaboration jsonb DEFAULT '{"allowComments": true, "allowSharing": true}',
  inherit_from_team boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.content_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  management jsonb DEFAULT '{"defaultView": "grid", "autoSave": true}',
  workflow jsonb DEFAULT '{"requireApproval": false, "autoPublish": false}',
  upload jsonb DEFAULT '{"maxSize": 10485760, "allowedTypes": ["jpg", "png", "pdf"]}',
  organization jsonb DEFAULT '{"autoTag": true, "autoCategory": false}',
  search jsonb DEFAULT '{"indexContent": true, "includeMetadata": true}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.competitive_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monitoring jsonb DEFAULT '{"frequency": "daily", "alertThreshold": 5}',
  analysis jsonb DEFAULT '{"includeKeywords": true, "includePricing": true}',
  reports jsonb DEFAULT '{"format": "pdf", "frequency": "weekly"}',
  alerts jsonb DEFAULT '{"email": true, "inApp": true}',
  data_retention jsonb DEFAULT '{"months": 12, "autoCleanup": true}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.analytics_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dashboard jsonb DEFAULT '{"layout": "standard", "refreshRate": 300}',
  charts jsonb DEFAULT '{"defaultType": "line", "colorScheme": "blue"}',
  reports jsonb DEFAULT '{"format": "pdf", "includeCharts": true}',
  data jsonb DEFAULT '{"retention": 365, "sampling": "auto"}',
  alerts jsonb DEFAULT '{"threshold": 10, "email": true}',
  privacy jsonb DEFAULT '{"shareData": false, "anonymize": true}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitive_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_settings
CREATE POLICY "Users can manage their own settings" ON public.user_settings
  FOR ALL USING (user_id = auth.uid());

-- Create RLS policies for project_settings
CREATE POLICY "Users can manage their project settings" ON public.project_settings
  FOR ALL USING (user_id = auth.uid());

-- Create RLS policies for content_settings
CREATE POLICY "Users can manage their content settings" ON public.content_settings
  FOR ALL USING (user_id = auth.uid());

-- Create RLS policies for competitive_settings
CREATE POLICY "Users can manage their competitive settings" ON public.competitive_settings
  FOR ALL USING (user_id = auth.uid());

-- Create RLS policies for analytics_settings
CREATE POLICY "Users can manage their analytics settings" ON public.analytics_settings
  FOR ALL USING (user_id = auth.uid());

-- Create updated_at triggers
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_settings_updated_at
  BEFORE UPDATE ON public.project_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_settings_updated_at
  BEFORE UPDATE ON public.content_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_competitive_settings_updated_at
  BEFORE UPDATE ON public.competitive_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analytics_settings_updated_at
  BEFORE UPDATE ON public.analytics_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create RPC functions for settings management

-- Get platform settings
CREATE OR REPLACE FUNCTION public.get_platform_settings(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  user_settings_data jsonb;
  team_settings_data jsonb;
BEGIN
  -- Get user settings
  SELECT to_jsonb(us.*) INTO user_settings_data
  FROM public.user_settings us
  WHERE us.user_id = p_user_id;
  
  -- Get team settings (simplified - just return basic structure)
  SELECT jsonb_build_object(
    'allowMemberInvites', true,
    'requireContentApproval', false,
    'defaultProjectType', 'competitive_analysis'
  ) INTO team_settings_data;
  
  -- Combine all settings
  result := jsonb_build_object(
    'user', COALESCE(user_settings_data, jsonb_build_object(
      'theme', '{"mode": "light", "color": "blue"}',
      'notifications', '{"email": true, "push": true, "inApp": true}',
      'privacy', '{"profileVisible": true, "activityTracking": true}',
      'accessibility', '{"fontSize": "medium", "contrast": "normal"}',
      'language', 'en',
      'timezone', 'UTC'
    )),
    'team', team_settings_data,
    'project', '{}',
    'content', '{}',
    'competitive', '{}',
    'analytics', '{}'
  );
  
  RETURN result;
END;
$$;

-- Update user settings safely
CREATE OR REPLACE FUNCTION public.update_user_settings_safe(p_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  INSERT INTO public.user_settings (user_id, theme, notifications, privacy, accessibility, language, timezone)
  VALUES (
    auth.uid(),
    COALESCE(p_settings->'theme', '{"mode": "light", "color": "blue"}'::jsonb),
    COALESCE(p_settings->'notifications', '{"email": true, "push": true, "inApp": true}'::jsonb),
    COALESCE(p_settings->'privacy', '{"profileVisible": true, "activityTracking": true}'::jsonb),
    COALESCE(p_settings->'accessibility', '{"fontSize": "medium", "contrast": "normal"}'::jsonb),
    COALESCE(p_settings->>'language', 'en'),
    COALESCE(p_settings->>'timezone', 'UTC')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    theme = COALESCE(p_settings->'theme', user_settings.theme),
    notifications = COALESCE(p_settings->'notifications', user_settings.notifications),
    privacy = COALESCE(p_settings->'privacy', user_settings.privacy),
    accessibility = COALESCE(p_settings->'accessibility', user_settings.accessibility),
    language = COALESCE(p_settings->>'language', user_settings.language),
    timezone = COALESCE(p_settings->>'timezone', user_settings.timezone),
    updated_at = now()
  RETURNING to_jsonb(user_settings.*) INTO result;
  
  RETURN result;
END;
$$;

-- Get project settings safely
CREATE OR REPLACE FUNCTION public.get_project_settings_safe(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT to_jsonb(ps.*) INTO result
  FROM public.project_settings ps
  WHERE ps.project_id = p_project_id AND ps.user_id = auth.uid();
  
  IF result IS NULL THEN
    result := jsonb_build_object(
      'dashboard', '{"layout": "grid", "widgets": []}',
      'analysis', '{"autoRun": true, "frequency": "daily"}',
      'notifications', '{"mentions": true, "updates": true}',
      'collaboration', '{"allowComments": true, "allowSharing": true}',
      'inherit_from_team', true
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Update project settings safely
CREATE OR REPLACE FUNCTION public.update_project_settings_safe(p_project_id uuid, p_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  INSERT INTO public.project_settings (project_id, user_id, dashboard, analysis, notifications, collaboration, inherit_from_team)
  VALUES (
    p_project_id,
    auth.uid(),
    COALESCE(p_settings->'dashboard', '{"layout": "grid", "widgets": []}'::jsonb),
    COALESCE(p_settings->'analysis', '{"autoRun": true, "frequency": "daily"}'::jsonb),
    COALESCE(p_settings->'notifications', '{"mentions": true, "updates": true}'::jsonb),
    COALESCE(p_settings->'collaboration', '{"allowComments": true, "allowSharing": true}'::jsonb),
    COALESCE((p_settings->>'inherit_from_team')::boolean, true)
  )
  ON CONFLICT (project_id, user_id) DO UPDATE SET
    dashboard = COALESCE(p_settings->'dashboard', project_settings.dashboard),
    analysis = COALESCE(p_settings->'analysis', project_settings.analysis),
    notifications = COALESCE(p_settings->'notifications', project_settings.notifications),
    collaboration = COALESCE(p_settings->'collaboration', project_settings.collaboration),
    inherit_from_team = COALESCE((p_settings->>'inherit_from_team')::boolean, project_settings.inherit_from_team),
    updated_at = now()
  RETURNING to_jsonb(project_settings.*) INTO result;
  
  RETURN result;
END;
$$;

-- Create similar functions for content, competitive, and analytics settings
CREATE OR REPLACE FUNCTION public.get_content_settings_safe()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT to_jsonb(cs.*) INTO result
  FROM public.content_settings cs
  WHERE cs.user_id = auth.uid();
  
  IF result IS NULL THEN
    result := jsonb_build_object(
      'management', '{"defaultView": "grid", "autoSave": true}',
      'workflow', '{"requireApproval": false, "autoPublish": false}',
      'upload', '{"maxSize": 10485760, "allowedTypes": ["jpg", "png", "pdf"]}',
      'organization', '{"autoTag": true, "autoCategory": false}',
      'search', '{"indexContent": true, "includeMetadata": true}'
    );
  END IF;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_content_settings_safe(p_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  INSERT INTO public.content_settings (user_id, management, workflow, upload, organization, search)
  VALUES (
    auth.uid(),
    COALESCE(p_settings->'management', '{"defaultView": "grid", "autoSave": true}'::jsonb),
    COALESCE(p_settings->'workflow', '{"requireApproval": false, "autoPublish": false}'::jsonb),
    COALESCE(p_settings->'upload', '{"maxSize": 10485760, "allowedTypes": ["jpg", "png", "pdf"]}'::jsonb),
    COALESCE(p_settings->'organization', '{"autoTag": true, "autoCategory": false}'::jsonb),
    COALESCE(p_settings->'search', '{"indexContent": true, "includeMetadata": true}'::jsonb)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    management = COALESCE(p_settings->'management', content_settings.management),
    workflow = COALESCE(p_settings->'workflow', content_settings.workflow),
    upload = COALESCE(p_settings->'upload', content_settings.upload),
    organization = COALESCE(p_settings->'organization', content_settings.organization),
    search = COALESCE(p_settings->'search', content_settings.search),
    updated_at = now()
  RETURNING to_jsonb(content_settings.*) INTO result;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_competitive_settings_safe()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT to_jsonb(cs.*) INTO result
  FROM public.competitive_settings cs
  WHERE cs.user_id = auth.uid();
  
  IF result IS NULL THEN
    result := jsonb_build_object(
      'monitoring', '{"frequency": "daily", "alertThreshold": 5}',
      'analysis', '{"includeKeywords": true, "includePricing": true}',
      'reports', '{"format": "pdf", "frequency": "weekly"}',
      'alerts', '{"email": true, "inApp": true}',
      'data_retention', '{"months": 12, "autoCleanup": true}'
    );
  END IF;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_competitive_settings_safe(p_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  INSERT INTO public.competitive_settings (user_id, monitoring, analysis, reports, alerts, data_retention)
  VALUES (
    auth.uid(),
    COALESCE(p_settings->'monitoring', '{"frequency": "daily", "alertThreshold": 5}'::jsonb),
    COALESCE(p_settings->'analysis', '{"includeKeywords": true, "includePricing": true}'::jsonb),
    COALESCE(p_settings->'reports', '{"format": "pdf", "frequency": "weekly"}'::jsonb),
    COALESCE(p_settings->'alerts', '{"email": true, "inApp": true}'::jsonb),
    COALESCE(p_settings->'data_retention', '{"months": 12, "autoCleanup": true}'::jsonb)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    monitoring = COALESCE(p_settings->'monitoring', competitive_settings.monitoring),
    analysis = COALESCE(p_settings->'analysis', competitive_settings.analysis),
    reports = COALESCE(p_settings->'reports', competitive_settings.reports),
    alerts = COALESCE(p_settings->'alerts', competitive_settings.alerts),
    data_retention = COALESCE(p_settings->'data_retention', competitive_settings.data_retention),
    updated_at = now()
  RETURNING to_jsonb(competitive_settings.*) INTO result;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_settings_safe()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT to_jsonb(ars.*) INTO result
  FROM public.analytics_settings ars
  WHERE ars.user_id = auth.uid();
  
  IF result IS NULL THEN
    result := jsonb_build_object(
      'dashboard', '{"layout": "standard", "refreshRate": 300}',
      'charts', '{"defaultType": "line", "colorScheme": "blue"}',
      'reports', '{"format": "pdf", "includeCharts": true}',
      'data', '{"retention": 365, "sampling": "auto"}',
      'alerts', '{"threshold": 10, "email": true}',
      'privacy', '{"shareData": false, "anonymize": true}'
    );
  END IF;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_analytics_settings_safe(p_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  INSERT INTO public.analytics_settings (user_id, dashboard, charts, reports, data, alerts, privacy)
  VALUES (
    auth.uid(),
    COALESCE(p_settings->'dashboard', '{"layout": "standard", "refreshRate": 300}'::jsonb),
    COALESCE(p_settings->'charts', '{"defaultType": "line", "colorScheme": "blue"}'::jsonb),
    COALESCE(p_settings->'reports', '{"format": "pdf", "includeCharts": true}'::jsonb),
    COALESCE(p_settings->'data', '{"retention": 365, "sampling": "auto"}'::jsonb),
    COALESCE(p_settings->'alerts', '{"threshold": 10, "email": true}'::jsonb),
    COALESCE(p_settings->'privacy', '{"shareData": false, "anonymize": true}'::jsonb)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    dashboard = COALESCE(p_settings->'dashboard', analytics_settings.dashboard),
    charts = COALESCE(p_settings->'charts', analytics_settings.charts),
    reports = COALESCE(p_settings->'reports', analytics_settings.reports),
    data = COALESCE(p_settings->'data', analytics_settings.data),
    alerts = COALESCE(p_settings->'alerts', analytics_settings.alerts),
    privacy = COALESCE(p_settings->'privacy', analytics_settings.privacy),
    updated_at = now()
  RETURNING to_jsonb(analytics_settings.*) INTO result;
  
  RETURN result;
END;
$$;