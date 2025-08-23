-- Phase 1: Advanced Query Optimization Functions

-- Optimized project analytics function
CREATE OR REPLACE FUNCTION get_project_analytics_optimized(
  p_user_id UUID,
  p_team_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  project_id UUID,
  project_name TEXT,
  status TEXT,
  priority TEXT,
  team_member_count BIGINT,
  content_count BIGINT,
  recent_activity_count BIGINT,
  performance_score NUMERIC
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as project_id,
    p.name as project_name,
    p.status,
    p.priority,
    COALESCE(tm_count.count, 0) as team_member_count,
    COALESCE(content_count.count, 0) as content_count,
    COALESCE(activity_count.count, 0) as recent_activity_count,
    COALESCE(perf.avg_score, 0) as performance_score
  FROM projects p
  LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM project_team_members
    WHERE invitation_status = 'active'
    GROUP BY project_id
  ) tm_count ON p.id = tm_count.project_id
  LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM content_items
    WHERE status != 'archived'
    GROUP BY project_id
  ) content_count ON p.id = content_count.project_id
  LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM activity_logs
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY project_id
  ) activity_count ON p.id = activity_count.project_id
  LEFT JOIN (
    SELECT 
      project_id,
      AVG(CASE 
        WHEN metric_name = 'performance_score' THEN metric_value 
        ELSE NULL 
      END) as avg_score
    FROM business_metrics
    WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY project_id
  ) perf ON p.id = perf.project_id
  WHERE p.created_by = p_user_id
    OR (p_team_id IS NOT NULL AND p.team_id = p_team_id)
  ORDER BY p.updated_at DESC
  LIMIT p_limit;
END;
$$;