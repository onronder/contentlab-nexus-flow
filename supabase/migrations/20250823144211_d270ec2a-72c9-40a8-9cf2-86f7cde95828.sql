-- Phase 1: Critical Database Performance Indexes (without CONCURRENTLY)
-- Add composite indexes for frequently queried columns

-- Projects table optimization
CREATE INDEX IF NOT EXISTS idx_projects_user_updated 
ON public.projects (created_by, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_team_status 
ON public.projects (team_id, status) WHERE team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_industry_date 
ON public.projects (industry, created_at DESC);

-- Content items optimization  
CREATE INDEX IF NOT EXISTS idx_content_user_status_date 
ON public.content_items (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_team_type 
ON public.content_items (team_id, content_type) WHERE team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_project_workflow 
ON public.content_items (project_id, workflow_status);

CREATE INDEX IF NOT EXISTS idx_content_search_vector 
ON public.content_items USING GIN (search_vector);

-- Team members optimization
CREATE INDEX IF NOT EXISTS idx_team_members_user_active 
ON public.team_members (user_id, is_active, status) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_team_members_team_role 
ON public.team_members (team_id, role_id, is_active) WHERE is_active = true;