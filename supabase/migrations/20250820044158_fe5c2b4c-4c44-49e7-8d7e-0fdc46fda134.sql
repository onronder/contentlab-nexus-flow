-- Phase 2A: Fix remaining function security warnings and create production tables (corrected)

-- 1. Fix remaining function search_path issues
ALTER FUNCTION public.get_user_teams(uuid) SET search_path = 'public';
ALTER FUNCTION public.is_user_system_admin(uuid) SET search_path = 'public';
ALTER FUNCTION public.compute_next_run_at(timestamp with time zone, text, integer, integer, text) SET search_path = 'public';

-- 2. Create production monitoring tables

-- Performance metrics table
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type text NOT NULL, -- 'vitals', 'database', 'system', 'user'
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text,
  context jsonb DEFAULT '{}',
  tags jsonb DEFAULT '{}',
  session_id text,
  correlation_id text,
  user_id uuid REFERENCES auth.users(id),
  team_id uuid REFERENCES public.teams(id),
  project_id uuid REFERENCES public.projects(id),
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- System health metrics table
CREATE TABLE IF NOT EXISTS public.system_health_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text,
  service_name text NOT NULL,
  environment text DEFAULT 'production',
  status text DEFAULT 'healthy',
  threshold_value numeric,
  severity text DEFAULT 'info',
  message text,
  tags jsonb DEFAULT '{}',
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'
);

-- Session recordings table
CREATE TABLE IF NOT EXISTS public.session_recordings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL,
  team_id uuid NOT NULL REFERENCES public.teams(id),
  name text NOT NULL,
  duration integer NOT NULL DEFAULT 0, -- in seconds
  events jsonb DEFAULT '[]',
  participants jsonb DEFAULT '[]',
  file_size bigint DEFAULT 0,
  storage_path text,
  status text DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Error tracking table
CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  error_type text NOT NULL,
  error_message text NOT NULL,
  error_stack text,
  user_id uuid REFERENCES auth.users(id),
  team_id uuid REFERENCES public.teams(id),
  project_id uuid REFERENCES public.projects(id),
  session_id text,
  url text,
  user_agent text,
  environment text DEFAULT 'production',
  severity text DEFAULT 'error',
  resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamp with time zone,
  tags jsonb DEFAULT '{}',
  context jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  timestamp timestamp with time zone NOT NULL DEFAULT now()
);

-- Analytics data aggregation table
CREATE TABLE IF NOT EXISTS public.analytics_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_type text NOT NULL, -- 'user_behavior', 'performance', 'engagement'
  aggregation_period text NOT NULL, -- 'hourly', 'daily', 'weekly'
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  team_id uuid REFERENCES public.teams(id),
  project_id uuid REFERENCES public.projects(id),
  metrics jsonb NOT NULL DEFAULT '{}',
  dimensions jsonb DEFAULT '{}',
  calculated_fields jsonb DEFAULT '{}',
  data_quality_score numeric DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_time ON public.performance_metrics(metric_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_team ON public.performance_metrics(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_service_time ON public.system_health_metrics(service_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_session_recordings_team_created ON public.session_recordings(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved_time ON public.error_logs(resolved, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_data_type_period ON public.analytics_data(data_type, period_start, period_end);

-- Add RLS policies
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_data ENABLE ROW LEVEL SECURITY;

-- Performance metrics policies
CREATE POLICY "System can manage performance metrics" ON public.performance_metrics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view team performance metrics" ON public.performance_metrics
  FOR SELECT USING (
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
    )
  );

-- System health metrics policies
CREATE POLICY "System can manage health metrics" ON public.system_health_metrics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System admins can view health metrics" ON public.system_health_metrics
  FOR SELECT USING (is_user_system_admin(auth.uid()));

-- Session recordings policies
CREATE POLICY "Team members can manage session recordings" ON public.session_recordings
  FOR ALL USING (
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
    )
  ) WITH CHECK (
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
    )
  );

-- Error logs policies
CREATE POLICY "System can manage error logs" ON public.error_logs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view relevant error logs" ON public.error_logs
  FOR SELECT USING (
    user_id = auth.uid() OR 
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
    )
  );

-- Analytics data policies
CREATE POLICY "System can manage analytics data" ON public.analytics_data
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view team analytics data" ON public.analytics_data
  FOR SELECT USING (
    user_id = auth.uid() OR 
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_session_recordings_updated_at
  BEFORE UPDATE ON public.session_recordings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_analytics_data_updated_at
  BEFORE UPDATE ON public.analytics_data
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();