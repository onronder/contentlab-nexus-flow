-- Create analytics tables for comprehensive insights dashboard

-- User analytics table for tracking user behavior and engagement
CREATE TABLE public.user_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id TEXT,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_properties JSONB DEFAULT '{}',
  page_path TEXT,
  user_agent TEXT,
  ip_address INET,
  country TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  INDEX idx_user_analytics_user_id ON public.user_analytics (user_id),
  INDEX idx_user_analytics_event_type ON public.user_analytics (event_type),
  INDEX idx_user_analytics_created_at ON public.user_analytics (created_at),
  INDEX idx_user_analytics_session_id ON public.user_analytics (session_id)
);

-- System analytics for performance and usage statistics
CREATE TABLE public.system_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  dimensions JSONB DEFAULT '{}',
  aggregation_period TEXT NOT NULL DEFAULT 'hourly', -- hourly, daily, weekly, monthly
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  INDEX idx_system_analytics_metric_name ON public.system_analytics (metric_name),
  INDEX idx_system_analytics_period ON public.system_analytics (period_start, period_end),
  INDEX idx_system_analytics_aggregation ON public.system_analytics (aggregation_period)
);

-- Business metrics for revenue, conversion, and growth tracking
CREATE TABLE public.business_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID,
  project_id UUID,
  metric_category TEXT NOT NULL, -- revenue, conversion, growth, engagement
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  target_value NUMERIC,
  previous_period_value NUMERIC,
  change_percentage NUMERIC,
  currency TEXT DEFAULT 'USD',
  time_period TEXT NOT NULL, -- daily, weekly, monthly, quarterly, yearly
  metric_date DATE NOT NULL,
  segment_filters JSONB DEFAULT '{}',
  calculated_fields JSONB DEFAULT '{}',
  data_quality_score NUMERIC DEFAULT 100,
  is_forecast BOOLEAN DEFAULT false,
  confidence_interval JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  INDEX idx_business_metrics_team_id ON public.business_metrics (team_id),
  INDEX idx_business_metrics_project_id ON public.business_metrics (project_id),
  INDEX idx_business_metrics_category ON public.business_metrics (metric_category),
  INDEX idx_business_metrics_date ON public.business_metrics (metric_date),
  INDEX idx_business_metrics_name ON public.business_metrics (metric_name)
);

-- Custom events for flexible business event tracking
CREATE TABLE public.custom_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID,
  project_id UUID,
  user_id UUID,
  event_name TEXT NOT NULL,
  event_category TEXT,
  event_value NUMERIC,
  event_properties JSONB DEFAULT '{}',
  entity_type TEXT, -- project, content, competitor, team, user
  entity_id UUID,
  source_component TEXT,
  session_id TEXT,
  correlation_id TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed BOOLEAN DEFAULT false,
  processing_error TEXT,
  metadata JSONB DEFAULT '{}',
  INDEX idx_custom_events_team_id ON public.custom_events (team_id),
  INDEX idx_custom_events_project_id ON public.custom_events (project_id),
  INDEX idx_custom_events_user_id ON public.custom_events (user_id),
  INDEX idx_custom_events_name ON public.custom_events (event_name),
  INDEX idx_custom_events_timestamp ON public.custom_events (timestamp),
  INDEX idx_custom_events_entity ON public.custom_events (entity_type, entity_id)
);

-- Analytics insights for AI-generated business intelligence
CREATE TABLE public.analytics_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID,
  project_id UUID,
  insight_type TEXT NOT NULL, -- trend, anomaly, opportunity, alert
  insight_category TEXT NOT NULL, -- performance, user_behavior, business, security
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence_score NUMERIC DEFAULT 0,
  impact_level TEXT DEFAULT 'medium', -- low, medium, high, critical
  data_sources TEXT[] DEFAULT '{}',
  metrics_involved JSONB DEFAULT '{}',
  recommended_actions JSONB DEFAULT '[]',
  insight_data JSONB DEFAULT '{}',
  time_period_start DATE,
  time_period_end DATE,
  is_actionable BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_by UUID,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  INDEX idx_analytics_insights_team_id ON public.analytics_insights (team_id),
  INDEX idx_analytics_insights_project_id ON public.analytics_insights (project_id),
  INDEX idx_analytics_insights_type ON public.analytics_insights (insight_type),
  INDEX idx_analytics_insights_category ON public.analytics_insights (insight_category),
  INDEX idx_analytics_insights_impact ON public.analytics_insights (impact_level)
);

-- Enable Row Level Security
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_analytics
CREATE POLICY "Users can view their own analytics"
ON public.user_analytics FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can create user analytics"
ON public.user_analytics FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own analytics"
ON public.user_analytics FOR UPDATE
USING (user_id = auth.uid());

-- RLS Policies for system_analytics
CREATE POLICY "Authenticated users can view system analytics"
ON public.system_analytics FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage system analytics"
ON public.system_analytics FOR ALL
USING (true);

-- RLS Policies for business_metrics
CREATE POLICY "Team members can view team business metrics"
ON public.business_metrics FOR SELECT
USING (
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
  ) OR
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM project_team_members ptm
      WHERE ptm.project_id = p.id 
      AND ptm.user_id = auth.uid() 
      AND ptm.invitation_status = 'active'
    )
  )
);

CREATE POLICY "Team managers can manage business metrics"
ON public.business_metrics FOR ALL
USING (
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    JOIN user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.hierarchy_level >= 6
  )
);

-- RLS Policies for custom_events
CREATE POLICY "Team members can view team custom events"
ON public.custom_events FOR SELECT
USING (
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
  ) OR
  user_id = auth.uid() OR
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM project_team_members ptm
      WHERE ptm.project_id = p.id 
      AND ptm.user_id = auth.uid() 
      AND ptm.invitation_status = 'active'
    )
  )
);

CREATE POLICY "Users can create custom events"
ON public.custom_events FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
  )
);

-- RLS Policies for analytics_insights
CREATE POLICY "Team members can view team insights"
ON public.analytics_insights FOR SELECT
USING (
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
  ) OR
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM project_team_members ptm
      WHERE ptm.project_id = p.id 
      AND ptm.user_id = auth.uid() 
      AND ptm.invitation_status = 'active'
    )
  )
);

CREATE POLICY "Team managers can manage insights"
ON public.analytics_insights FOR ALL
USING (
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    JOIN user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.hierarchy_level >= 6
  )
);

-- Functions for analytics processing
CREATE OR REPLACE FUNCTION public.aggregate_business_metrics(
  p_team_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB := '{}';
  revenue_metrics JSONB;
  conversion_metrics JSONB;
  growth_metrics JSONB;
  engagement_metrics JSONB;
BEGIN
  -- Aggregate revenue metrics
  SELECT jsonb_agg(
    jsonb_build_object(
      'metric_name', metric_name,
      'current_value', metric_value,
      'target_value', target_value,
      'change_percentage', change_percentage,
      'trend', CASE 
        WHEN change_percentage > 10 THEN 'up'
        WHEN change_percentage < -10 THEN 'down'
        ELSE 'stable'
      END
    )
  ) INTO revenue_metrics
  FROM public.business_metrics
  WHERE metric_category = 'revenue'
  AND metric_date BETWEEN p_start_date AND p_end_date
  AND (p_team_id IS NULL OR team_id = p_team_id)
  AND (p_project_id IS NULL OR project_id = p_project_id);

  -- Aggregate conversion metrics
  SELECT jsonb_agg(
    jsonb_build_object(
      'metric_name', metric_name,
      'current_value', metric_value,
      'target_value', target_value,
      'change_percentage', change_percentage
    )
  ) INTO conversion_metrics
  FROM public.business_metrics
  WHERE metric_category = 'conversion'
  AND metric_date BETWEEN p_start_date AND p_end_date
  AND (p_team_id IS NULL OR team_id = p_team_id)
  AND (p_project_id IS NULL OR project_id = p_project_id);

  -- Aggregate growth metrics
  SELECT jsonb_agg(
    jsonb_build_object(
      'metric_name', metric_name,
      'current_value', metric_value,
      'change_percentage', change_percentage
    )
  ) INTO growth_metrics
  FROM public.business_metrics
  WHERE metric_category = 'growth'
  AND metric_date BETWEEN p_start_date AND p_end_date
  AND (p_team_id IS NULL OR team_id = p_team_id)
  AND (p_project_id IS NULL OR project_id = p_project_id);

  -- Aggregate engagement metrics
  SELECT jsonb_agg(
    jsonb_build_object(
      'metric_name', metric_name,
      'current_value', metric_value,
      'change_percentage', change_percentage
    )
  ) INTO engagement_metrics
  FROM public.business_metrics
  WHERE metric_category = 'engagement'
  AND metric_date BETWEEN p_start_date AND p_end_date
  AND (p_team_id IS NULL OR team_id = p_team_id)
  AND (p_project_id IS NULL OR project_id = p_project_id);

  result := jsonb_build_object(
    'revenue', COALESCE(revenue_metrics, '[]'),
    'conversion', COALESCE(conversion_metrics, '[]'),
    'growth', COALESCE(growth_metrics, '[]'),
    'engagement', COALESCE(engagement_metrics, '[]'),
    'period_start', p_start_date,
    'period_end', p_end_date,
    'generated_at', now()
  );

  RETURN result;
END;
$$;

-- Function to calculate user engagement score
CREATE OR REPLACE FUNCTION public.calculate_user_engagement_score(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  engagement_score NUMERIC := 0;
  session_count INTEGER := 0;
  event_count INTEGER := 0;
  unique_days INTEGER := 0;
BEGIN
  -- Count sessions
  SELECT COUNT(DISTINCT session_id) INTO session_count
  FROM public.user_analytics
  WHERE user_id = p_user_id
  AND created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days;

  -- Count events
  SELECT COUNT(*) INTO event_count
  FROM public.user_analytics
  WHERE user_id = p_user_id
  AND created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days;

  -- Count unique active days
  SELECT COUNT(DISTINCT DATE(created_at)) INTO unique_days
  FROM public.user_analytics
  WHERE user_id = p_user_id
  AND created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days;

  -- Calculate engagement score (0-100)
  engagement_score := LEAST(100, 
    (session_count * 2) + 
    (event_count * 0.1) + 
    (unique_days * 5)
  );

  RETURN ROUND(engagement_score, 2);
END;
$$;

-- Trigger to auto-update business metrics timestamps
CREATE OR REPLACE FUNCTION public.update_business_metrics_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER business_metrics_updated_at
  BEFORE UPDATE ON public.business_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_business_metrics_updated_at();

-- Trigger to auto-update analytics insights timestamps
CREATE OR REPLACE FUNCTION public.update_analytics_insights_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER analytics_insights_updated_at
  BEFORE UPDATE ON public.analytics_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_analytics_insights_updated_at();