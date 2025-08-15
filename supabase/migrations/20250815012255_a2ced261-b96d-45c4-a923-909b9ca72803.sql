-- CRITICAL SECURITY FIX: Remove public access from sensitive tables
-- Fix 1: Profiles table - restrict to user's own profile only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Fix 2: User sessions - restrict to user's own sessions only  
DROP POLICY IF EXISTS "Users can view all sessions" ON public.user_sessions;
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
  FOR SELECT USING (user_id = auth.uid());

-- Fix 3: Security events - restrict to system admins and affected users
DROP POLICY IF EXISTS "Public can view security events" ON public.security_events;
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

-- Fix 4: Team invitations - restrict to team admins and invited user
DROP POLICY IF EXISTS "Public can view team invitations" ON public.team_invitations;
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

-- Fix 5: Team billing - restrict to team owners and billing managers
DROP POLICY IF EXISTS "Public can view team billing" ON public.team_billing;
CREATE POLICY "Team owners and billing managers can view billing" ON public.team_billing
  FOR SELECT USING (
    team_id IN (
      SELECT t.id FROM teams t WHERE t.owner_id = auth.uid()
    ) OR
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      JOIN user_roles ur ON tm.role_id = ur.id
      WHERE tm.user_id = auth.uid()
      AND tm.is_active = true  
      AND ur.slug IN ('billing_manager', 'admin')
    )
  );

-- Fix 6: User analytics - restrict to user's own analytics
DROP POLICY IF EXISTS "Public can view user analytics" ON public.user_analytics;
CREATE POLICY "Users can view their own analytics" ON public.user_analytics
  FOR SELECT USING (user_id = auth.uid());

-- Fix 7: Team security events - restrict to team security officers
DROP POLICY IF EXISTS "Public can view team security events" ON public.team_security_events;
CREATE POLICY "Team security officers can view team security events" ON public.team_security_events
  FOR SELECT USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      JOIN user_roles ur ON tm.role_id = ur.id
      WHERE tm.user_id = auth.uid()
      AND tm.is_active = true
      AND ur.slug IN ('security_officer', 'admin', 'owner')
    )
  );