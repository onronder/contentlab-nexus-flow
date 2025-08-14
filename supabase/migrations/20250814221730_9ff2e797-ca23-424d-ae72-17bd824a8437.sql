-- Create security-related database tables for Step 4: Advanced Security & Audit Logging

-- Table for storing user sessions with advanced tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    device_info JSONB DEFAULT '{}',
    location_info JSONB DEFAULT '{}',
    security_flags JSONB DEFAULT '{}',
    user_agent TEXT,
    ip_address INET,
    is_current BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for security events and threat monitoring
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for permission audit logs (compliance)
CREATE TABLE IF NOT EXISTS public.permission_audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    permission_slug TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('granted', 'denied')),
    resource_type TEXT,
    resource_id UUID,
    team_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for team activity logs
CREATE TABLE IF NOT EXISTS public.team_activity_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    team_id UUID NOT NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for security policy configurations
CREATE TABLE IF NOT EXISTS public.security_policies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_name TEXT NOT NULL,
    policy_type TEXT NOT NULL,
    policy_rules JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    team_id UUID,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_sessions
CREATE POLICY "Users can manage their own sessions"
    ON public.user_sessions FOR ALL
    USING (user_id = auth.uid());

-- RLS Policies for security_events
CREATE POLICY "Users can view their own security events"
    ON public.security_events FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "System can create security events"
    ON public.security_events FOR INSERT
    WITH CHECK (true);

-- RLS Policies for permission_audit_logs
CREATE POLICY "Users can view their permission logs"
    ON public.permission_audit_logs FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "System can create permission logs"
    ON public.permission_audit_logs FOR INSERT
    WITH CHECK (true);

-- RLS Policies for team_activity_logs
CREATE POLICY "Team members can view team activity logs"
    ON public.team_activity_logs FOR SELECT
    USING (team_id IN (
        SELECT tm.team_id FROM team_members tm
        WHERE tm.user_id = auth.uid() AND tm.is_active = true
    ));

CREATE POLICY "System can create team activity logs"
    ON public.team_activity_logs FOR INSERT
    WITH CHECK (true);

-- RLS Policies for security_policies
CREATE POLICY "Team members can view security policies"
    ON public.security_policies FOR SELECT
    USING (team_id IN (
        SELECT tm.team_id FROM team_members tm
        WHERE tm.user_id = auth.uid() AND tm.is_active = true
    ));

CREATE POLICY "Team admins can manage security policies"
    ON public.security_policies FOR ALL
    USING (team_id IN (
        SELECT tm.team_id FROM team_members tm
        JOIN user_roles ur ON tm.role_id = ur.id
        WHERE tm.user_id = auth.uid() 
        AND tm.is_active = true 
        AND ur.hierarchy_level >= 8
    ));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_user_id ON public.permission_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_logs_team_id ON public.team_activity_logs(team_id);

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.user_sessions 
    WHERE expires_at < now() - interval '1 day';
END;
$$;

-- Function to detect suspicious activity
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    concurrent_sessions INTEGER;
    recent_logins INTEGER;
BEGIN
    -- Check for multiple concurrent sessions
    SELECT COUNT(*) INTO concurrent_sessions
    FROM public.user_sessions 
    WHERE user_id = NEW.user_id 
    AND expires_at > now()
    AND id != NEW.id;
    
    -- Flag if more than 3 concurrent sessions
    IF concurrent_sessions > 3 THEN
        NEW.security_flags = NEW.security_flags || '{"suspicious": true, "reason": "multiple_sessions"}'::jsonb;
    END IF;
    
    -- Check for rapid logins (more than 5 in 10 minutes)
    SELECT COUNT(*) INTO recent_logins
    FROM public.user_sessions
    WHERE user_id = NEW.user_id
    AND created_at > now() - interval '10 minutes';
    
    IF recent_logins > 5 THEN
        NEW.security_flags = NEW.security_flags || '{"suspicious": true, "reason": "rapid_logins"}'::jsonb;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger for suspicious activity detection
CREATE TRIGGER detect_suspicious_activity_trigger
    BEFORE INSERT ON public.user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.detect_suspicious_activity();

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON public.user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_security_policies_updated_at
    BEFORE UPDATE ON public.security_policies
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();