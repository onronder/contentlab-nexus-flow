-- Fix database security warnings by adding search_path to mutable functions
CREATE OR REPLACE FUNCTION public.update_user_presence()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_competitor_analysis_updated_at()
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

-- Create missing database infrastructure for security systems
CREATE TABLE IF NOT EXISTS public.rate_limit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  user_tier TEXT DEFAULT 'free',
  threat_level TEXT DEFAULT 'low',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(identifier, endpoint, window_start)
);

CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_security_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  lock_type TEXT NOT NULL CHECK (lock_type IN ('temporary', 'suspicious_activity', 'brute_force', 'manual')),
  reason TEXT NOT NULL,
  locked_by UUID REFERENCES auth.users(id),
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  unlock_at TIMESTAMP WITH TIME ZONE,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  unlocked_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ip_blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL UNIQUE,
  block_type TEXT NOT NULL CHECK (block_type IN ('temporary', 'permanent', 'suspicious')),
  reason TEXT NOT NULL,
  blocked_by UUID REFERENCES auth.users(id),
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  unblock_at TIMESTAMP WITH TIME ZONE,
  unblocked_at TIMESTAMP WITH TIME ZONE,
  unblocked_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enhanced_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  monitoring_type TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  team_id UUID,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rate_limit_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  override_type TEXT NOT NULL CHECK (override_type IN ('increase', 'decrease', 'block')),
  multiplier DECIMAL(5,2) DEFAULT 1.0,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(identifier, endpoint)
);

CREATE TABLE IF NOT EXISTS public.real_time_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  source_system TEXT NOT NULL,
  affected_users JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.behavioral_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  behavior_type TEXT NOT NULL,
  behavior_data JSONB NOT NULL DEFAULT '{}',
  risk_score DECIMAL(5,2) DEFAULT 0.0,
  anomaly_detected BOOLEAN DEFAULT false,
  baseline_deviation DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.threat_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_type TEXT NOT NULL,
  source TEXT NOT NULL,
  indicator_type TEXT NOT NULL CHECK (indicator_type IN ('ip', 'domain', 'user_agent', 'pattern')),
  indicator_value TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  confidence_score DECIMAL(5,2) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(indicator_type, indicator_value)
);

-- Enable RLS on new tables
ALTER TABLE public.rate_limit_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_security_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_blocklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enhanced_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_time_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavioral_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threat_intelligence ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for system access
CREATE POLICY "System can manage rate limit usage" ON public.rate_limit_usage FOR ALL USING (true);
CREATE POLICY "System can manage security incidents" ON public.security_incidents FOR ALL USING (true);
CREATE POLICY "System can manage security locks" ON public.user_security_locks FOR ALL USING (true);
CREATE POLICY "System can manage IP blocklist" ON public.ip_blocklist FOR ALL USING (true);
CREATE POLICY "System can manage enhanced monitoring" ON public.enhanced_monitoring FOR ALL USING (true);
CREATE POLICY "Users can view their security alerts" ON public.security_alerts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can manage rate limit overrides" ON public.rate_limit_overrides FOR ALL USING (true);
CREATE POLICY "Admins can view real time alerts" ON public.real_time_alerts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    JOIN user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.slug IN ('admin', 'super_admin', 'system_admin')
    AND ur.is_active = true
  )
);
CREATE POLICY "System can manage behavioral analytics" ON public.behavioral_analytics FOR ALL USING (true);
CREATE POLICY "System can manage threat intelligence" ON public.threat_intelligence FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_usage_identifier ON public.rate_limit_usage(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_security_incidents_user_id ON public.security_incidents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_security_locks_user_id ON public.user_security_locks(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ip_blocklist_ip ON public.ip_blocklist(ip_address, is_active);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON public.security_alerts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavioral_analytics_user_session ON public.behavioral_analytics(user_id, session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_threat_intelligence_indicator ON public.threat_intelligence(indicator_type, indicator_value, is_active);
CREATE INDEX IF NOT EXISTS idx_behavioral_analytics_risk ON public.behavioral_analytics(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_behavioral_analytics_behavior ON public.behavioral_analytics(behavior_type, created_at);