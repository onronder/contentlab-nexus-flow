-- Phase 1 Continued: More Critical Database Indexes
-- Performance metrics optimization
CREATE INDEX IF NOT EXISTS idx_performance_user_type_time 
ON public.performance_metrics (user_id, metric_type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_performance_team_time 
ON public.performance_metrics (team_id, timestamp DESC) WHERE team_id IS NOT NULL;

-- Competitor analysis optimization
CREATE INDEX IF NOT EXISTS idx_competitor_analysis_comp_type_date 
ON public.competitor_analysis_metadata (competitor_id, analysis_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_competitor_analysis_status_date 
ON public.competitor_analysis_metadata (status, started_at DESC);

-- Analytics insights optimization
CREATE INDEX IF NOT EXISTS idx_analytics_insights_team_category_date 
ON public.analytics_insights (team_id, insight_category, created_at DESC) WHERE team_id IS NOT NULL;

-- Business metrics optimization
CREATE INDEX IF NOT EXISTS idx_business_metrics_team_category_date 
ON public.business_metrics (team_id, metric_category, metric_date DESC) WHERE team_id IS NOT NULL;

-- Activity logs optimization
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_type_date 
ON public.activity_logs (user_id, activity_type, created_at DESC) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_logs_team_date 
ON public.activity_logs (team_id, created_at DESC) WHERE team_id IS NOT NULL;