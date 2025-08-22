-- Populate business_metrics table with calculated data for teams (fixed enum values)
INSERT INTO public.business_metrics (
  team_id,
  metric_name,
  metric_category,
  metric_value,
  target_value,
  metric_date,
  time_period,
  change_percentage,
  previous_period_value
)
SELECT 
  t.id as team_id,
  'content_creation_rate' as metric_name,
  'growth' as metric_category,
  COALESCE(content_stats.content_count, 0) as metric_value,
  50 as target_value,
  CURRENT_DATE as metric_date,
  'monthly' as time_period,
  CASE 
    WHEN COALESCE(prev_content_stats.content_count, 0) > 0 
    THEN ROUND(((COALESCE(content_stats.content_count, 0) - COALESCE(prev_content_stats.content_count, 0))::numeric / COALESCE(prev_content_stats.content_count, 1)::numeric) * 100, 2)
    ELSE 0
  END as change_percentage,
  COALESCE(prev_content_stats.content_count, 0) as previous_period_value
FROM public.teams t
LEFT JOIN (
  SELECT 
    team_id,
    COUNT(*) as content_count
  FROM public.content_items 
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY team_id
) content_stats ON t.id = content_stats.team_id
LEFT JOIN (
  SELECT 
    team_id,
    COUNT(*) as content_count
  FROM public.content_items 
  WHERE created_at >= CURRENT_DATE - INTERVAL '60 days'
    AND created_at < CURRENT_DATE - INTERVAL '30 days'
  GROUP BY team_id
) prev_content_stats ON t.id = prev_content_stats.team_id
WHERE t.is_active = true;

-- Add collaboration efficiency metrics (using valid enum values)
INSERT INTO public.business_metrics (
  team_id,
  metric_name,
  metric_category,
  metric_value,
  target_value,
  metric_date,
  time_period,
  change_percentage,
  previous_period_value
)
SELECT 
  t.id as team_id,
  'collaboration_score' as metric_name,
  'engagement' as metric_category,
  COALESCE(collab_stats.collaboration_score, 0) as metric_value,
  85 as target_value,
  CURRENT_DATE as metric_date,
  'monthly' as time_period,
  CASE 
    WHEN COALESCE(prev_collab_stats.collaboration_score, 0) > 0 
    THEN ROUND(((COALESCE(collab_stats.collaboration_score, 0) - COALESCE(prev_collab_stats.collaboration_score, 0))::numeric / COALESCE(prev_collab_stats.collaboration_score, 1)::numeric) * 100, 2)
    ELSE 0
  END as change_percentage,
  COALESCE(prev_collab_stats.collaboration_score, 0) as previous_period_value
FROM public.teams t
LEFT JOIN (
  SELECT 
    al.team_id,
    LEAST(100, GREATEST(0, 50 + (COUNT(CASE WHEN al.activity_type = 'communication' THEN 1 END) * 2) + (COUNT(CASE WHEN al.activity_type = 'team_management' THEN 1 END) * 1.5))) as collaboration_score
  FROM public.activity_logs al
  WHERE al.created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY al.team_id
) collab_stats ON t.id = collab_stats.team_id
LEFT JOIN (
  SELECT 
    al.team_id,
    LEAST(100, GREATEST(0, 50 + (COUNT(CASE WHEN al.activity_type = 'communication' THEN 1 END) * 2) + (COUNT(CASE WHEN al.activity_type = 'team_management' THEN 1 END) * 1.5))) as collaboration_score
  FROM public.activity_logs al
  WHERE al.created_at >= CURRENT_DATE - INTERVAL '60 days'
    AND al.created_at < CURRENT_DATE - INTERVAL '30 days'
  GROUP BY al.team_id
) prev_collab_stats ON t.id = prev_collab_stats.team_id
WHERE t.is_active = true;

-- Add conversion metrics
INSERT INTO public.business_metrics (
  team_id,
  metric_name, 
  metric_category,
  metric_value,
  target_value,
  metric_date,
  time_period,
  change_percentage,
  previous_period_value
)
SELECT 
  t.id as team_id,
  'content_completion_rate' as metric_name,
  'conversion' as metric_category,
  COALESCE(conversion_stats.completion_rate, 0) as metric_value,
  80 as target_value,
  CURRENT_DATE as metric_date,
  'monthly' as time_period,
  CASE 
    WHEN COALESCE(prev_conversion_stats.completion_rate, 0) > 0 
    THEN ROUND(((COALESCE(conversion_stats.completion_rate, 0) - COALESCE(prev_conversion_stats.completion_rate, 0))::numeric / COALESCE(prev_conversion_stats.completion_rate, 1)::numeric) * 100, 2)
    ELSE 0
  END as change_percentage,
  COALESCE(prev_conversion_stats.completion_rate, 0) as previous_period_value
FROM public.teams t
LEFT JOIN (
  SELECT 
    team_id,
    CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(CASE WHEN status = 'published' THEN 1 END)::numeric / COUNT(*)::numeric) * 100, 2)
      ELSE 0
    END as completion_rate
  FROM public.content_items 
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY team_id
) conversion_stats ON t.id = conversion_stats.team_id
LEFT JOIN (
  SELECT 
    team_id,
    CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(CASE WHEN status = 'published' THEN 1 END)::numeric / COUNT(*)::numeric) * 100, 2)
      ELSE 0
    END as completion_rate
  FROM public.content_items 
  WHERE created_at >= CURRENT_DATE - INTERVAL '60 days'
    AND created_at < CURRENT_DATE - INTERVAL '30 days'
  GROUP BY team_id
) prev_conversion_stats ON t.id = prev_conversion_stats.team_id
WHERE t.is_active = true;