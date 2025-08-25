-- Fix function conflict and complete security hardening
DROP FUNCTION IF EXISTS public.cleanup_expired_sessions();

-- Additional security hardening for production readiness

-- Create audit log table for tracking security events
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  event_type TEXT NOT NULL,
  event_description TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on security audit logs
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only system admins can read security logs
CREATE POLICY "System admins can view security logs"
ON public.security_audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid()
    AND ur.slug IN ('admin', 'system_admin')
    AND tm.is_active = true
  )
);

-- Create session security table
CREATE TABLE IF NOT EXISTS public.user_sessions_security (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_token TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on session security
ALTER TABLE public.user_sessions_security ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions_security
FOR SELECT
USING (auth.uid() = user_id);

-- Users can manage their own sessions
CREATE POLICY "Users can manage their own sessions"
ON public.user_sessions_security
FOR ALL
USING (auth.uid() = user_id);

-- Create encrypted data storage for sensitive fields
CREATE TABLE IF NOT EXISTS public.encrypted_user_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data_type TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on encrypted data
ALTER TABLE public.encrypted_user_data ENABLE ROW LEVEL SECURITY;

-- Users can only access their own encrypted data
CREATE POLICY "Users can access their own encrypted data"
ON public.encrypted_user_data
FOR ALL
USING (auth.uid() = user_id);

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_description TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_logs (
    user_id, event_type, event_description, ip_address, 
    user_agent, success, metadata
  ) VALUES (
    auth.uid(), p_event_type, p_description, p_ip_address,
    p_user_agent, p_success, p_metadata
  );
END;
$$;

-- Function to clean expired sessions (with correct return type)
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.user_sessions_security
  WHERE expires_at < now() OR last_activity < now() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup event
  PERFORM public.log_security_event(
    'session_cleanup',
    'Cleaned up ' || deleted_count || ' expired sessions',
    NULL, NULL, true,
    jsonb_build_object('deleted_count', deleted_count)
  );
  
  RETURN deleted_count;
END;
$$;