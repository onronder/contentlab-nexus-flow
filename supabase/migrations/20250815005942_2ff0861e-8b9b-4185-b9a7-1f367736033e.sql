-- Fix critical security issues: RLS policies and function search paths

-- 1. Fix permissions table - restrict public access to authenticated users only
DROP POLICY IF EXISTS "Anyone can view permissions" ON public.permissions;
CREATE POLICY "Authenticated users can view permissions" ON public.permissions
  FOR SELECT TO authenticated
  USING (true);

-- 2. Fix user_roles table - restrict public access to authenticated users only  
DROP POLICY IF EXISTS "Anyone can view user roles" ON public.user_roles;
CREATE POLICY "Authenticated users can view user roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (true);

-- 3. Fix system_analytics table - restrict to system administrators only
DROP POLICY IF EXISTS "Authenticated users can view system analytics" ON public.system_analytics;
CREATE POLICY "System administrators can view system analytics" ON public.system_analytics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.user_roles ur ON tm.role_id = ur.id
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
      AND ur.slug IN ('admin', 'super_admin', 'system_admin')
    )
  );

-- 4. Update remaining security definer functions with SET search_path
CREATE OR REPLACE FUNCTION public.update_settings_updated_at()
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

CREATE OR REPLACE FUNCTION public.update_team_billing_updated_at()
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

CREATE OR REPLACE FUNCTION public.get_or_create_user_settings(p_user_id uuid)
RETURNS user_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_settings_record public.user_settings;
BEGIN
  -- Try to get existing settings
  SELECT * INTO user_settings_record
  FROM public.user_settings
  WHERE user_id = p_user_id;
  
  -- If not found, create default settings
  IF NOT FOUND THEN
    INSERT INTO public.user_settings (user_id)
    VALUES (p_user_id)
    RETURNING * INTO user_settings_record;
  END IF;
  
  RETURN user_settings_record;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_or_create_project_settings(p_project_id uuid, p_user_id uuid)
RETURNS project_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_or_create_content_settings(p_user_id uuid, p_team_id uuid DEFAULT NULL::uuid)
RETURNS content_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_or_create_competitive_settings(p_user_id uuid, p_team_id uuid DEFAULT NULL::uuid)
RETURNS competitive_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_or_create_analytics_settings(p_user_id uuid, p_team_id uuid DEFAULT NULL::uuid)
RETURNS analytics_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.create_settings_version(p_setting_type text, p_entity_id uuid, p_settings_data jsonb, p_change_summary text DEFAULT NULL::text, p_changed_fields text[] DEFAULT NULL::text[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_version_number INTEGER;
  v_version_id UUID;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 
  INTO v_version_number
  FROM public.settings_versions 
  WHERE setting_type = p_setting_type AND entity_id = p_entity_id;
  
  -- Create new version
  INSERT INTO public.settings_versions (
    setting_type, entity_id, version_number, settings_data, 
    change_summary, changed_fields, created_by
  ) VALUES (
    p_setting_type, p_entity_id, v_version_number, p_settings_data,
    p_change_summary, p_changed_fields, auth.uid()
  ) RETURNING id INTO v_version_id;
  
  RETURN v_version_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_settings_from_version(p_version_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_version_record public.settings_versions;
  v_restored_data JSONB;
BEGIN
  -- Get version record
  SELECT * INTO v_version_record
  FROM public.settings_versions
  WHERE id = p_version_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settings version not found';
  END IF;
  
  -- Log the restore action
  INSERT INTO public.settings_audit_logs (
    setting_type, entity_id, action, new_value, user_id
  ) VALUES (
    v_version_record.setting_type, 
    v_version_record.entity_id, 
    'restore', 
    v_version_record.settings_data,
    auth.uid()
  );
  
  RETURN v_version_record.settings_data;
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.can_access_team_billing(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Only team owners and members with high-level roles can access billing data
  SELECT EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = p_team_id AND t.owner_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.team_id = p_team_id 
    AND tm.user_id = p_user_id
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND (
      ur.slug IN ('owner', 'admin', 'billing_manager') 
      OR ur.hierarchy_level >= 8  -- High-level access required for billing
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.compute_next_run_at(current timestamp with time zone, cadence text, hour integer, minute integer, tz text)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  base_time timestamptz := (date_trunc('day', current at time zone tz) at time zone tz) + make_interval(hours => hour, mins => minute);
  next_time timestamptz;
begin
  if cadence = 'daily' then
    next_time := base_time;
    if next_time <= current then
      next_time := next_time + interval '1 day';
    end if;
  elsif cadence = 'weekly' then
    next_time := base_time;
    if next_time <= current then
      next_time := next_time + interval '7 days';
    end if;
  elsif cadence = 'monthly' then
    next_time := base_time;
    if next_time <= current then
      next_time := (base_time + interval '1 month');
    end if;
  else
    next_time := base_time + interval '1 day';
  end if;
  return next_time;
end;
$function$;

-- 5. Move pg_net extension from public schema to extensions schema (if it exists)
-- Note: This may require manual intervention if the extension is heavily used
-- CREATE SCHEMA IF NOT EXISTS extensions;
-- ALTER EXTENSION pg_net SET SCHEMA extensions;

-- Add comment documenting the security fixes
COMMENT ON POLICY "Authenticated users can view permissions" ON public.permissions 
IS 'Restricts access to authenticated users only - prevents public exposure of security model';

COMMENT ON POLICY "Authenticated users can view user roles" ON public.user_roles 
IS 'Restricts access to authenticated users only - prevents public exposure of organizational hierarchy';

COMMENT ON POLICY "System administrators can view system analytics" ON public.system_analytics 
IS 'Restricts access to system administrators only - prevents unauthorized access to performance data';