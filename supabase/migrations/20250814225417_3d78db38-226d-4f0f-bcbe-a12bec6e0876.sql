-- Fix critical security issues from the analytics migration

-- Add RLS policies for new analytics tables

-- Business metrics policies
CREATE POLICY "Team managers can manage business metrics" 
ON public.business_metrics 
FOR ALL 
USING (
  team_id IN (
    SELECT tm.team_id 
    FROM public.team_members tm
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.hierarchy_level >= 6 -- managers and above
  )
);

CREATE POLICY "Team members can view team business metrics" 
ON public.business_metrics 
FOR SELECT 
USING (
  team_id IN (
    SELECT tm.team_id 
    FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
  ) OR 
  project_id IN (
    SELECT p.id 
    FROM public.projects p 
    WHERE p.created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.project_team_members ptm 
      WHERE ptm.project_id = p.id 
      AND ptm.user_id = auth.uid() 
      AND ptm.invitation_status = 'active'
    )
  )
);

-- Analytics insights policies
CREATE POLICY "Team members can view team insights" 
ON public.analytics_insights 
FOR SELECT 
USING (
  team_id IN (
    SELECT tm.team_id 
    FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
  ) OR 
  project_id IN (
    SELECT p.id 
    FROM public.projects p 
    WHERE p.created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.project_team_members ptm 
      WHERE ptm.project_id = p.id 
      AND ptm.user_id = auth.uid() 
      AND ptm.invitation_status = 'active'
    )
  )
);

CREATE POLICY "Team managers can manage insights" 
ON public.analytics_insights 
FOR ALL 
USING (
  team_id IN (
    SELECT tm.team_id 
    FROM public.team_members tm
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.hierarchy_level >= 6
  )
);

-- User analytics policies
CREATE POLICY "Users can view their own analytics" 
ON public.user_analytics 
FOR ALL 
USING (user_id = auth.uid());

CREATE POLICY "Team managers can view team user analytics" 
ON public.user_analytics 
FOR SELECT 
USING (
  team_id IN (
    SELECT tm.team_id 
    FROM public.team_members tm
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.hierarchy_level >= 6
  )
);

-- Fix database function security - update functions with proper search_path
CREATE OR REPLACE FUNCTION public.calculate_user_engagement_score(p_user_id uuid, p_days integer DEFAULT 30)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.aggregate_business_metrics(p_team_id uuid DEFAULT NULL::uuid, p_project_id uuid DEFAULT NULL::uuid, p_start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), p_end_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_business_metrics_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_analytics_insights_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;