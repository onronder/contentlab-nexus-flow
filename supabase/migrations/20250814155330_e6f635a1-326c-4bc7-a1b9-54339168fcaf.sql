-- Create comprehensive settings tables with proper schema

-- Project Settings Table
CREATE TABLE IF NOT EXISTS public.project_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  dashboard_preferences JSONB DEFAULT '{
    "defaultView": "grid",
    "showMetrics": true,
    "autoRefresh": false,
    "refreshInterval": 300
  }'::jsonb,
  analysis_settings JSONB DEFAULT '{
    "autoAnalysis": true,
    "analysisFrequency": "weekly",
    "includeCompetitors": true,
    "detailLevel": "standard"
  }'::jsonb,
  notification_settings JSONB DEFAULT '{
    "email": true,
    "inApp": true,
    "frequency": "daily",
    "types": ["alerts", "reports", "updates"]
  }'::jsonb,
  collaboration_settings JSONB DEFAULT '{
    "allowComments": true,
    "requireApproval": false,
    "shareMode": "team"
  }'::jsonb,
  custom_settings JSONB DEFAULT '{}'::jsonb,
  inherit_from_team BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Content Settings Table
CREATE TABLE IF NOT EXISTS public.content_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_id UUID,
  management_settings JSONB DEFAULT '{
    "autoSave": true,
    "versionControl": true,
    "backupFrequency": "daily"
  }'::jsonb,
  workflow_settings JSONB DEFAULT '{
    "approvalRequired": false,
    "reviewSteps": 1,
    "autoPublish": false
  }'::jsonb,
  upload_settings JSONB DEFAULT '{
    "maxFileSize": 10485760,
    "allowedTypes": ["image", "document", "video"],
    "autoOptimize": true
  }'::jsonb,
  organization_settings JSONB DEFAULT '{
    "defaultTags": [],
    "autoTagging": false,
    "categoryRequired": false
  }'::jsonb,
  search_settings JSONB DEFAULT '{
    "indexContent": true,
    "enableFullText": true,
    "searchHistory": true
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, team_id)
);

-- Competitive Settings Table
CREATE TABLE IF NOT EXISTS public.competitive_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_id UUID,
  monitoring_settings JSONB DEFAULT '{
    "autoMonitoring": true,
    "frequency": "daily",
    "alertThreshold": 0.15
  }'::jsonb,
  analysis_settings JSONB DEFAULT '{
    "depthLevel": "standard",
    "includeSerp": true,
    "trackChanges": true
  }'::jsonb,
  reporting_settings JSONB DEFAULT '{
    "autoReports": false,
    "reportFrequency": "weekly",
    "includeCharts": true
  }'::jsonb,
  alerting_settings JSONB DEFAULT '{
    "emailAlerts": true,
    "inAppAlerts": true,
    "severityFilter": "medium"
  }'::jsonb,
  data_retention JSONB DEFAULT '{
    "retentionPeriod": 365,
    "autoCleanup": true,
    "exportBeforeCleanup": false
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, team_id)
);

-- Analytics Settings Table
CREATE TABLE IF NOT EXISTS public.analytics_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_id UUID,
  dashboard_settings JSONB DEFAULT '{
    "defaultDateRange": "30d",
    "refreshInterval": 300,
    "showRealTime": false
  }'::jsonb,
  chart_settings JSONB DEFAULT '{
    "defaultChartType": "line",
    "showDataLabels": true,
    "enableInteractivity": true
  }'::jsonb,
  report_settings JSONB DEFAULT '{
    "autoGenerate": false,
    "frequency": "weekly",
    "format": "pdf"
  }'::jsonb,
  data_settings JSONB DEFAULT '{
    "dataRetention": 365,
    "aggregationLevel": "daily",
    "includeRawData": false
  }'::jsonb,
  alert_settings JSONB DEFAULT '{
    "thresholdAlerts": true,
    "anomalyDetection": false,
    "alertChannels": ["email", "inApp"]
  }'::jsonb,
  privacy_settings JSONB DEFAULT '{
    "shareAnalytics": false,
    "anonymizeData": true,
    "dataExport": true
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, team_id)
);

-- Enable RLS on all settings tables
ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitive_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Project Settings
CREATE POLICY "Users can manage their own project settings" 
ON public.project_settings FOR ALL 
USING (user_id = auth.uid());

CREATE POLICY "Project team members can view project settings" 
ON public.project_settings FOR SELECT 
USING (
  project_id IN (
    SELECT p.id FROM public.projects p 
    WHERE p.created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.project_team_members ptm 
      WHERE ptm.project_id = p.id AND ptm.user_id = auth.uid() 
      AND ptm.invitation_status = 'active'
    )
  )
);

-- RLS Policies for Content Settings
CREATE POLICY "Users can manage their own content settings" 
ON public.content_settings FOR ALL 
USING (user_id = auth.uid());

CREATE POLICY "Team members can view team content settings" 
ON public.content_settings FOR SELECT 
USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
  )
);

-- RLS Policies for Competitive Settings
CREATE POLICY "Users can manage their own competitive settings" 
ON public.competitive_settings FOR ALL 
USING (user_id = auth.uid());

CREATE POLICY "Team members can view team competitive settings" 
ON public.competitive_settings FOR SELECT 
USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
  )
);

-- RLS Policies for Analytics Settings
CREATE POLICY "Users can manage their own analytics settings" 
ON public.analytics_settings FOR ALL 
USING (user_id = auth.uid());

CREATE POLICY "Team members can view team analytics settings" 
ON public.analytics_settings FOR SELECT 
USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
  )
);

-- Create RPC functions for settings management
CREATE OR REPLACE FUNCTION public.get_or_create_project_settings(p_project_id UUID, p_user_id UUID)
RETURNS public.project_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_record public.project_settings;
BEGIN
  SELECT * INTO settings_record
  FROM public.project_settings
  WHERE project_id = p_project_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.project_settings (project_id, user_id)
    VALUES (p_project_id, p_user_id)
    RETURNING * INTO settings_record;
  END IF;
  
  RETURN settings_record;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_content_settings(p_user_id UUID, p_team_id UUID DEFAULT NULL)
RETURNS public.content_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_record public.content_settings;
BEGIN
  SELECT * INTO settings_record
  FROM public.content_settings
  WHERE user_id = p_user_id AND (team_id = p_team_id OR (team_id IS NULL AND p_team_id IS NULL));
  
  IF NOT FOUND THEN
    INSERT INTO public.content_settings (user_id, team_id)
    VALUES (p_user_id, p_team_id)
    RETURNING * INTO settings_record;
  END IF;
  
  RETURN settings_record;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_competitive_settings(p_user_id UUID, p_team_id UUID DEFAULT NULL)
RETURNS public.competitive_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_record public.competitive_settings;
BEGIN
  SELECT * INTO settings_record
  FROM public.competitive_settings
  WHERE user_id = p_user_id AND (team_id = p_team_id OR (team_id IS NULL AND p_team_id IS NULL));
  
  IF NOT FOUND THEN
    INSERT INTO public.competitive_settings (user_id, team_id)
    VALUES (p_user_id, p_team_id)
    RETURNING * INTO settings_record;
  END IF;
  
  RETURN settings_record;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_analytics_settings(p_user_id UUID, p_team_id UUID DEFAULT NULL)
RETURNS public.analytics_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_record public.analytics_settings;
BEGIN
  SELECT * INTO settings_record
  FROM public.analytics_settings
  WHERE user_id = p_user_id AND (team_id = p_team_id OR (team_id IS NULL AND p_team_id IS NULL));
  
  IF NOT FOUND THEN
    INSERT INTO public.analytics_settings (user_id, team_id)
    VALUES (p_user_id, p_team_id)
    RETURNING * INTO settings_record;
  END IF;
  
  RETURN settings_record;
END;
$$;

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_project_settings_updated_at
  BEFORE UPDATE ON public.project_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_settings_updated_at();

CREATE TRIGGER update_content_settings_updated_at
  BEFORE UPDATE ON public.content_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_settings_updated_at();

CREATE TRIGGER update_competitive_settings_updated_at
  BEFORE UPDATE ON public.competitive_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_settings_updated_at();

CREATE TRIGGER update_analytics_settings_updated_at
  BEFORE UPDATE ON public.analytics_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_settings_updated_at();