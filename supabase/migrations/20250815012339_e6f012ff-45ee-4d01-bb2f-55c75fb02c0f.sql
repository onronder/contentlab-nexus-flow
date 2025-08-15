-- CRITICAL SECURITY FIX: Remove public access from sensitive tables
-- Only apply policies that don't already exist

-- Fix 2: User sessions - restrict to user's own sessions only (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
    DROP POLICY IF EXISTS "Users can view all sessions" ON public.user_sessions;
    DROP POLICY IF EXISTS "Public can view user sessions" ON public.user_sessions;
    
    -- Only create if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'user_sessions' 
      AND policyname = 'Users can view their own sessions'
    ) THEN
      CREATE POLICY "Users can view their own sessions" ON public.user_sessions
        FOR SELECT USING (user_id = auth.uid());
    END IF;
  END IF;
END $$;

-- Fix 3: Security events - restrict to system admins and affected users (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_events') THEN
    DROP POLICY IF EXISTS "Public can view security events" ON public.security_events;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'security_events' 
      AND policyname = 'Users can view their own security events'
    ) THEN
      CREATE POLICY "Users can view their own security events" ON public.security_events
        FOR SELECT USING (
          user_id = auth.uid() OR 
          EXISTS (
            SELECT 1 FROM team_members tm 
            JOIN user_roles ur ON tm.role_id = ur.id
            WHERE tm.user_id = auth.uid() 
            AND tm.is_active = true 
            AND ur.slug IN ('admin', 'security_officer')
          )
        );
    END IF;
  END IF;
END $$;

-- Fix 4: Team invitations - secure existing policy
DO $$ 
BEGIN
  -- Remove overly permissive policies
  DROP POLICY IF EXISTS "Public can view team invitations" ON public.team_invitations;
  DROP POLICY IF EXISTS "Anyone can view team invitations" ON public.team_invitations;
  
  -- Ensure secure team invitation policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'team_invitations' 
    AND policyname = 'Team admins and invited users can view invitations'
  ) THEN
    CREATE POLICY "Team admins and invited users can view invitations" ON public.team_invitations
      FOR SELECT USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
        team_id IN (
          SELECT tm.team_id FROM team_members tm
          JOIN user_roles ur ON tm.role_id = ur.id  
          WHERE tm.user_id = auth.uid()
          AND tm.is_active = true
          AND ur.hierarchy_level >= 8
        )
      );
  END IF;
END $$;

-- Fix 5: Team billing - restrict to team owners and billing managers (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_billing') THEN
    DROP POLICY IF EXISTS "Public can view team billing" ON public.team_billing;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'team_billing' 
      AND policyname = 'Team owners and billing managers can view billing'
    ) THEN
      CREATE POLICY "Team owners and billing managers can view billing" ON public.team_billing
        FOR SELECT USING (can_access_team_billing(team_id, auth.uid()));
    END IF;
  END IF;
END $$;

-- Fix 6: User analytics - restrict to user's own analytics (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_analytics') THEN
    DROP POLICY IF EXISTS "Public can view user analytics" ON public.user_analytics;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'user_analytics' 
      AND policyname = 'Users can view their own analytics'
    ) THEN
      CREATE POLICY "Users can view their own analytics" ON public.user_analytics
        FOR SELECT USING (user_id = auth.uid());
    END IF;
  END IF;
END $$;