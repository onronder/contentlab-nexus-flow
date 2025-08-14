-- Create comprehensive production monitoring database infrastructure

-- Error tracking and logging tables
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  team_id UUID,
  project_id UUID,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  context JSONB DEFAULT '{}',
  user_agent TEXT,
  ip_address INET,
  url TEXT,
  session_id TEXT,
  correlation_id TEXT,
  fingerprint TEXT,
  occurrence_count INTEGER DEFAULT 1,
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Performance metrics storage
CREATE TABLE public.performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  team_id UUID,
  project_id UUID,
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  context JSONB DEFAULT '{}',
  tags JSONB DEFAULT '{}',
  session_id TEXT,
  correlation_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- System audit logs
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  team_id UUID,
  project_id UUID,
  action_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  action_description TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  correlation_id TEXT,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- System health status monitoring
CREATE TABLE public.system_health_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  service_version TEXT,
  status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  last_check_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  response_time_ms INTEGER,
  uptime_percentage NUMERIC(5,2),
  error_rate NUMERIC(5,4),
  cpu_usage NUMERIC(5,2),
  memory_usage NUMERIC(5,2),
  disk_usage NUMERIC(5,2),
  network_latency_ms INTEGER,
  active_connections INTEGER,
  health_details JSONB DEFAULT '{}',
  checks_performed JSONB DEFAULT '{}',
  alerts_triggered INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cache performance tracking
CREATE TABLE public.cache_statistics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_name TEXT NOT NULL,
  cache_type TEXT NOT NULL,
  hit_count INTEGER DEFAULT 0,
  miss_count INTEGER DEFAULT 0,
  eviction_count INTEGER DEFAULT 0,
  total_requests INTEGER DEFAULT 0,
  hit_ratio NUMERIC(5,4),
  average_response_time_ms NUMERIC(8,2),
  cache_size_bytes BIGINT,
  max_size_bytes BIGINT,
  key_count INTEGER,
  oldest_entry_age_seconds INTEGER,
  memory_usage_bytes BIGINT,
  statistics_period_start TIMESTAMP WITH TIME ZONE,
  statistics_period_end TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enhanced monitoring alerts
CREATE TABLE public.monitoring_alert_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  team_id UUID,
  project_id UUID,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_active BOOLEAN DEFAULT true,
  cooldown_minutes INTEGER DEFAULT 5,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Log entry storage
CREATE TABLE public.log_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  team_id UUID,
  project_id UUID,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
  message TEXT NOT NULL,
  component TEXT,
  module TEXT,
  function_name TEXT,
  line_number INTEGER,
  correlation_id TEXT,
  session_id TEXT,
  request_id TEXT,
  user_agent TEXT,
  ip_address INET,
  context JSONB DEFAULT '{}',
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX idx_error_logs_team_id ON public.error_logs(team_id);
CREATE INDEX idx_error_logs_project_id ON public.error_logs(project_id);
CREATE INDEX idx_error_logs_error_type ON public.error_logs(error_type);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at);
CREATE INDEX idx_error_logs_fingerprint ON public.error_logs(fingerprint);

CREATE INDEX idx_performance_metrics_user_id ON public.performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_team_id ON public.performance_metrics(team_id);
CREATE INDEX idx_performance_metrics_project_id ON public.performance_metrics(project_id);
CREATE INDEX idx_performance_metrics_metric_type ON public.performance_metrics(metric_type);
CREATE INDEX idx_performance_metrics_timestamp ON public.performance_metrics(timestamp);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_team_id ON public.audit_logs(team_id);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

CREATE INDEX idx_system_health_service_name ON public.system_health_status(service_name);
CREATE INDEX idx_system_health_status ON public.system_health_status(status);
CREATE INDEX idx_system_health_updated_at ON public.system_health_status(updated_at);

CREATE INDEX idx_cache_statistics_cache_name ON public.cache_statistics(cache_name);
CREATE INDEX idx_cache_statistics_cache_type ON public.cache_statistics(cache_type);
CREATE INDEX idx_cache_statistics_created_at ON public.cache_statistics(created_at);

CREATE INDEX idx_monitoring_alert_rules_user_id ON public.monitoring_alert_rules(user_id);
CREATE INDEX idx_monitoring_alert_rules_team_id ON public.monitoring_alert_rules(team_id);
CREATE INDEX idx_monitoring_alert_rules_is_active ON public.monitoring_alert_rules(is_active);

CREATE INDEX idx_log_entries_user_id ON public.log_entries(user_id);
CREATE INDEX idx_log_entries_team_id ON public.log_entries(team_id);
CREATE INDEX idx_log_entries_level ON public.log_entries(level);
CREATE INDEX idx_log_entries_component ON public.log_entries(component);
CREATE INDEX idx_log_entries_created_at ON public.log_entries(created_at);
CREATE INDEX idx_log_entries_correlation_id ON public.log_entries(correlation_id);

-- Enable Row Level Security
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for error_logs
CREATE POLICY "Users can view their own error logs" ON public.error_logs
  FOR SELECT USING (
    user_id = auth.uid() OR 
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "System can create error logs" ON public.error_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own error logs" ON public.error_logs
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND is_active = true)
  );

-- Create RLS policies for performance_metrics
CREATE POLICY "Users can view their performance metrics" ON public.performance_metrics
  FOR SELECT USING (
    user_id = auth.uid() OR 
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "System can create performance metrics" ON public.performance_metrics
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for audit_logs
CREATE POLICY "Users can view relevant audit logs" ON public.audit_logs
  FOR SELECT USING (
    user_id = auth.uid() OR 
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "System can create audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for system_health_status
CREATE POLICY "Authenticated users can view system health" ON public.system_health_status
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage health status" ON public.system_health_status
  FOR ALL USING (true);

-- Create RLS policies for cache_statistics
CREATE POLICY "Authenticated users can view cache statistics" ON public.cache_statistics
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage cache statistics" ON public.cache_statistics
  FOR ALL USING (true);

-- Create RLS policies for monitoring_alert_rules
CREATE POLICY "Users can manage their alert rules" ON public.monitoring_alert_rules
  FOR ALL USING (
    user_id = auth.uid() OR 
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND is_active = true)
  );

-- Create RLS policies for log_entries
CREATE POLICY "Users can view relevant log entries" ON public.log_entries
  FOR SELECT USING (
    user_id = auth.uid() OR 
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "System can create log entries" ON public.log_entries
  FOR INSERT WITH CHECK (true);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_error_logs_updated_at
  BEFORE UPDATE ON public.error_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_health_status_updated_at
  BEFORE UPDATE ON public.system_health_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monitoring_alert_rules_updated_at
  BEFORE UPDATE ON public.monitoring_alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();