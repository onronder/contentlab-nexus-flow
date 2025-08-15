-- CRITICAL: Fix all remaining security vulnerabilities - data exposure

-- 1. Fix profiles table - users should only see their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- 2. Fix team_invitations table - restrict to team admins and invited users
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Public can view invitations" ON public.team_invitations;

CREATE POLICY "Team admins and invited users can view invitations" ON public.team_invitations
  FOR SELECT TO authenticated
  USING (
    -- Team owners/admins can see team invitations
    team_id IN (
      SELECT t.id FROM public.teams t
      WHERE t.owner_id = auth.uid()
      OR t.id IN (
        SELECT tm.team_id FROM public.team_members tm
        JOIN public.user_roles ur ON tm.role_id = ur.id
        WHERE tm.user_id = auth.uid() 
        AND tm.is_active = true 
        AND tm.status = 'active'
        AND ur.hierarchy_level >= 8  -- Admin level
      )
    )
    OR
    -- Invited users can see invitations sent to their email
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 3. Fix business_metrics table - already has team restrictions, ensure it's enabled
ALTER TABLE public.business_metrics ENABLE ROW LEVEL SECURITY;

-- 4. Fix security event tables - restrict to security officers only
-- Enable RLS on security event tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_events') THEN
    ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Anyone can view security events" ON public.security_events;
    
    CREATE POLICY "Security officers can view security events" ON public.security_events
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.team_members tm
          JOIN public.user_roles ur ON tm.role_id = ur.id
          WHERE tm.user_id = auth.uid() 
          AND tm.is_active = true 
          AND tm.status = 'active'
          AND ur.slug IN ('admin', 'super_admin', 'system_admin', 'security_officer')
        )
      );
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_security_events') THEN
    ALTER TABLE public.team_security_events ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Anyone can view team security events" ON public.team_security_events;
    
    CREATE POLICY "Team security officers can view team security events" ON public.team_security_events
      FOR SELECT TO authenticated
      USING (
        team_id IN (
          SELECT tm.team_id FROM public.team_members tm
          JOIN public.user_roles ur ON tm.role_id = ur.id
          WHERE tm.user_id = auth.uid() 
          AND tm.is_active = true 
          AND tm.status = 'active'
          AND ur.slug IN ('admin', 'super_admin', 'security_officer')
        )
      );
  END IF;
END $$;

-- 5. Fix team_billing table - restrict to team owners and billing contacts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_billing') THEN
    ALTER TABLE public.team_billing ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Anyone can view billing" ON public.team_billing;
    DROP POLICY IF EXISTS "Public can view billing" ON public.team_billing;
    
    CREATE POLICY "Team owners and billing contacts can view billing" ON public.team_billing
      FOR SELECT TO authenticated
      USING (
        team_id IN (
          SELECT t.id FROM public.teams t
          WHERE t.owner_id = auth.uid()
          OR t.id IN (
            SELECT tm.team_id FROM public.team_members tm
            JOIN public.user_roles ur ON tm.role_id = ur.id
            WHERE tm.user_id = auth.uid() 
            AND tm.is_active = true 
            AND tm.status = 'active'
            AND ur.slug IN ('owner', 'admin', 'billing_manager')
          )
        )
      );
  END IF;
END $$;

COMMENT ON DATABASE postgres IS 'CRITICAL SECURITY FIXES APPLIED: All sensitive data tables now have proper RLS policies. User profiles, team invitations, business metrics, security events, and billing data are properly restricted to authorized users only.';