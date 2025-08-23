-- Phase 1: Critical Database Performance Indexes
-- Add composite indexes for frequently queried columns

-- Projects table optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_user_updated 
ON public.projects (created_by, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_team_status 
ON public.projects (team_id, status) WHERE team_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_industry_date 
ON public.projects (industry, created_at DESC);

-- Content items optimization  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_user_status_date 
ON public.content_items (user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_team_type 
ON public.content_items (team_id, content_type) WHERE team_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_project_workflow 
ON public.content_items (project_id, workflow_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_search_vector 
ON public.content_items USING GIN (search_vector);

-- Team members optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_user_active 
ON public.team_members (user_id, is_active, status) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_team_role 
ON public.team_members (team_id, role_id, is_active) WHERE is_active = true;

-- Performance metrics optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_user_type_time 
ON public.performance_metrics (user_id, metric_type, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_team_time 
ON public.performance_metrics (team_id, timestamp DESC) WHERE team_id IS NOT NULL;

-- Competitor analysis optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_competitor_analysis_comp_type_date 
ON public.competitor_analysis_metadata (competitor_id, analysis_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_competitor_analysis_status_date 
ON public.competitor_analysis_metadata (status, started_at DESC);

-- Analytics insights optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_insights_team_category_date 
ON public.analytics_insights (team_id, insight_category, created_at DESC) WHERE team_id IS NOT NULL;

-- Business metrics optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_metrics_team_category_date 
ON public.business_metrics (team_id, metric_category, metric_date DESC) WHERE team_id IS NOT NULL;

-- Activity logs optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_user_type_date 
ON public.activity_logs (user_id, activity_type, created_at DESC) WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_team_date 
ON public.activity_logs (team_id, created_at DESC) WHERE team_id IS NOT NULL;