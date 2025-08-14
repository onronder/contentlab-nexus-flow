-- Phase 1: Fix Critical Database Security Issues

-- 1. Add missing RLS policies for tables without policies
-- First, let's check which tables need RLS policies by enabling RLS where missing

-- Enable RLS on tables that should have it
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings_validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_messages ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for profiles table
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Create RLS policies for notifications table
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Create RLS policies for project_activities table
CREATE POLICY "Users can view activities for accessible projects" ON public.project_activities
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p 
      WHERE p.created_by = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM public.project_team_members ptm 
        WHERE ptm.project_id = p.id 
        AND ptm.user_id = auth.uid() 
        AND ptm.invitation_status = 'active'
      )
    )
  );

CREATE POLICY "System can create project activities" ON public.project_activities
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for user_sessions table
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions" ON public.user_sessions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own sessions" ON public.user_sessions
  FOR DELETE USING (user_id = auth.uid());

-- Create RLS policies for security_events table
CREATE POLICY "Users can view their own security events" ON public.security_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create security events" ON public.security_events
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for team_channels table
CREATE POLICY "Team members can view team channels" ON public.team_channels
  FOR SELECT USING (
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  );

CREATE POLICY "Team members can create channels" ON public.team_channels
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  );

-- Create RLS policies for team_messages table
CREATE POLICY "Team members can view team messages" ON public.team_messages
  FOR SELECT USING (
    channel_id IN (
      SELECT tc.id FROM public.team_channels tc
      JOIN public.team_members tm ON tc.team_id = tm.team_id
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  );

CREATE POLICY "Team members can create messages" ON public.team_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    channel_id IN (
      SELECT tc.id FROM public.team_channels tc
      JOIN public.team_members tm ON tc.team_id = tm.team_id
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  );

-- Create RLS policies for settings tables
CREATE POLICY "Users can view their own settings audit logs" ON public.settings_audit_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create settings audit logs" ON public.settings_audit_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can manage their own project settings" ON public.project_settings
  FOR ALL USING (user_id = auth.uid());

-- Create RLS policies for scheduled reports
CREATE POLICY "Users can manage their own scheduled reports" ON public.scheduled_reports
  FOR ALL USING (created_by = auth.uid());

-- Create RLS policies for report templates  
CREATE POLICY "Users can view report templates" ON public.report_templates
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own report templates" ON public.report_templates
  FOR ALL USING (created_by = auth.uid());

-- 2. Fix database function search paths (Critical Security Issue)
-- Update all functions to use secure search paths

-- Fix function search paths for critical functions
CREATE OR REPLACE FUNCTION public.test_auth_uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$function$;

-- 3. Create security validation functions
CREATE OR REPLACE FUNCTION public.validate_user_access(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate that the user exists and is active
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = p_user_id 
    AND raw_app_meta_data->>'provider' IS NOT NULL
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_user_id uuid DEFAULT NULL,
  p_severity text DEFAULT 'info',
  p_details jsonb DEFAULT '{}'
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.security_events (
    event_type, user_id, severity, event_data, created_at
  ) VALUES (
    p_event_type, 
    COALESCE(p_user_id, auth.uid()), 
    p_severity::severity_level, 
    p_details, 
    now()
  );
END;
$function$;