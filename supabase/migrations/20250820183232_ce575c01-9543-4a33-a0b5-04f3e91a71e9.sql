-- Fix critical security issues: Restrict access to sensitive user data
-- This migration addresses ERROR-level security findings by ensuring all sensitive
-- tables require authentication and proper authorization

-- 1. Fix profiles table - restrict to authenticated users only
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Create secure policies for profiles (authenticated users only)
CREATE POLICY "Authenticated users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Authenticated users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can delete own profile" ON public.profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = id);

-- 2. Fix user_sessions table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_sessions') THEN
    -- Enable RLS if not already enabled
    ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
    
    -- Drop any existing permissive policies
    DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;
    DROP POLICY IF EXISTS "Users can manage own sessions" ON public.user_sessions;
    
    -- Create secure policies
    CREATE POLICY "Users can view own sessions" ON public.user_sessions
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
      
    CREATE POLICY "Users can manage own sessions" ON public.user_sessions
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 3. Fix user_analytics table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_analytics') THEN
    -- Enable RLS if not already enabled
    ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
    
    -- Drop any existing permissive policies
    DROP POLICY IF EXISTS "Users can view own analytics" ON public.user_analytics;
    DROP POLICY IF EXISTS "System can create analytics" ON public.user_analytics;
    
    -- Create secure policies
    CREATE POLICY "Users can view own analytics" ON public.user_analytics
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
      
    CREATE POLICY "System can create analytics" ON public.user_analytics
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 4. Fix user_settings table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_settings') THEN
    -- Enable RLS if not already enabled
    ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
    
    -- Drop any existing permissive policies
    DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
    
    -- Create secure policies
    CREATE POLICY "Users can manage own settings" ON public.user_settings
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 5. Fix security_events table - restrict public access, keep system functionality
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'security_events') THEN
    -- Drop overly permissive policies
    DROP POLICY IF EXISTS "Users can view their own security events" ON public.security_events;
    
    -- Keep system creation policy but make it more restrictive
    -- Only authenticated users or system should be able to create security events
    CREATE POLICY "Authenticated users can view own security events" ON public.security_events
      FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM team_members tm
        JOIN user_roles ur ON tm.role_id = ur.id
        WHERE tm.user_id = auth.uid() 
        AND tm.is_active = true 
        AND ur.slug IN ('admin', 'security_officer', 'system_admin')
      ));
  END IF;
END $$;

-- 6. Fix team-related tables - ensure proper team membership verification
-- Fix team_members table
DROP POLICY IF EXISTS "member_select_own_only" ON public.team_members;
CREATE POLICY "Authenticated members can view own membership" ON public.team_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR team_id IN (
    SELECT tm.team_id FROM team_members tm 
    WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
  ));

-- Fix teams table - restrict to team members only
DROP POLICY IF EXISTS "Teams are viewable by members" ON public.teams;
CREATE POLICY "Teams are viewable by authenticated members" ON public.teams
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR id IN (
    SELECT tm.team_id FROM team_members tm 
    WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
  ));

-- 7. Fix team_billing table - remove public access
DROP POLICY IF EXISTS "Team owners and billing managers can view billing" ON public.team_billing;
CREATE POLICY "Authenticated billing managers can view billing" ON public.team_billing
  FOR SELECT TO authenticated
  USING (can_access_team_billing(team_id, auth.uid()));

-- Create comment for tracking this security fix
COMMENT ON TABLE public.profiles IS 'SECURITY: Fixed RLS policies to restrict access to authenticated users only - addresses critical security vulnerability where customer PII was publicly accessible';

-- Log this security fix using a valid activity_type
INSERT INTO public.activity_logs (
  activity_type, 
  action, 
  description, 
  metadata,
  user_id
) VALUES (
  'authentication',
  'rls_policy_hardened', 
  'Fixed critical security vulnerability: Customer PII and sensitive data access restricted to authenticated users only',
  jsonb_build_object(
    'affected_tables', array['profiles', 'user_sessions', 'user_analytics', 'user_settings', 'security_events', 'team_members', 'teams', 'team_billing'],
    'security_level', 'CRITICAL',
    'vulnerability_type', 'PUBLIC_DATA_ACCESS',
    'fix_type', 'RLS_POLICY_RESTRICTION'
  ),
  auth.uid()
) ON CONFLICT DO NOTHING;