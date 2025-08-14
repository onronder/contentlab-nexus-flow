-- Create missing analytics tables for production data collection

-- User analytics table (if not exists)
CREATE TABLE IF NOT EXISTS public.user_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System analytics table (if not exists)
CREATE TABLE IF NOT EXISTS public.system_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  dimensions JSONB DEFAULT '{}',
  aggregation_period TEXT DEFAULT 'hourly',
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance metrics table (if not exists)
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  team_id UUID,
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  page_path TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  tags TEXT[],
  context JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON public.user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_session_id ON public.user_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_created_at ON public.user_analytics(created_at);

CREATE INDEX IF NOT EXISTS idx_system_analytics_metric_name ON public.system_analytics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_analytics_created_at ON public.system_analytics(created_at);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON public.performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_team_id ON public.performance_metrics(team_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON public.performance_metrics(timestamp);

-- Add RLS policies for user analytics
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analytics"
ON public.user_analytics FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can insert analytics"
ON public.user_analytics FOR INSERT
WITH CHECK (true);

-- Add RLS policies for system analytics
ALTER TABLE public.system_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view system analytics"
ON public.system_analytics FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage system analytics"
ON public.system_analytics FOR ALL
USING (true);

-- Add RLS policies for performance metrics
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own performance metrics"
ON public.performance_metrics FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Team members can view team performance metrics"
ON public.performance_metrics FOR SELECT
USING (team_id IN (
  SELECT tm.team_id FROM team_members tm 
  WHERE tm.user_id = auth.uid() 
  AND tm.is_active = true 
  AND tm.status = 'active'
));

CREATE POLICY "System can insert performance metrics"
ON public.performance_metrics FOR INSERT
WITH CHECK (true);

-- Create triggers to automatically update content analytics on content interactions
CREATE OR REPLACE FUNCTION update_content_analytics_on_view()
RETURNS TRIGGER AS $$
BEGIN
  -- Update content analytics when content is viewed
  INSERT INTO public.content_analytics (
    content_id,
    analytics_date,
    views,
    impressions
  ) VALUES (
    NEW.entity_id::UUID,
    CURRENT_DATE,
    1,
    1
  )
  ON CONFLICT (content_id, analytics_date)
  DO UPDATE SET
    views = content_analytics.views + 1,
    impressions = content_analytics.impressions + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for content view tracking
CREATE TRIGGER trigger_content_view_analytics
  AFTER INSERT ON public.custom_events
  FOR EACH ROW
  WHEN (NEW.event_name = 'content_view')
  EXECUTE FUNCTION update_content_analytics_on_view();

-- Create function to update engagement metrics
CREATE OR REPLACE FUNCTION update_content_engagement_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update engagement metrics based on event type
  IF NEW.event_name = 'content_like' THEN
    UPDATE public.content_analytics 
    SET likes = likes + 1, updated_at = NOW()
    WHERE content_id = NEW.entity_id::UUID AND analytics_date = CURRENT_DATE;
  ELSIF NEW.event_name = 'content_share' THEN
    UPDATE public.content_analytics 
    SET shares = shares + 1, updated_at = NOW()
    WHERE content_id = NEW.entity_id::UUID AND analytics_date = CURRENT_DATE;
  ELSIF NEW.event_name = 'content_comment' THEN
    UPDATE public.content_analytics 
    SET comments = comments + 1, updated_at = NOW()
    WHERE content_id = NEW.entity_id::UUID AND analytics_date = CURRENT_DATE;
  ELSIF NEW.event_name = 'content_download' THEN
    UPDATE public.content_analytics 
    SET downloads = downloads + 1, updated_at = NOW()
    WHERE content_id = NEW.entity_id::UUID AND analytics_date = CURRENT_DATE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for content engagement tracking
CREATE TRIGGER trigger_content_engagement_analytics
  AFTER INSERT ON public.custom_events
  FOR EACH ROW
  WHEN (NEW.event_name IN ('content_like', 'content_share', 'content_comment', 'content_download'))
  EXECUTE FUNCTION update_content_engagement_analytics();