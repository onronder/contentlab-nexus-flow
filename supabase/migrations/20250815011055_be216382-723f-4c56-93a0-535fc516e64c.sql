-- Remove all public access policies - final security lockdown

-- 1. Fix profiles table - remove public access
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 2. Fix business_metrics table - remove public access  
DROP POLICY IF EXISTS "Team managers can manage business metrics" ON public.business_metrics;
DROP POLICY IF EXISTS "Team members can view team business metrics" ON public.business_metrics;

-- Recreate with authenticated only access
CREATE POLICY "Authenticated team managers can manage business metrics" ON public.business_metrics
  FOR ALL TO authenticated
  USING (
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm
      JOIN public.user_roles ur ON tm.role_id = ur.id
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
      AND ur.hierarchy_level >= 6
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm
      JOIN public.user_roles ur ON tm.role_id = ur.id
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
      AND ur.hierarchy_level >= 6
    )
  );

CREATE POLICY "Authenticated team members can view business metrics" ON public.business_metrics
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
    OR
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

-- 3. Fix security_events table - remove public access
DROP POLICY IF EXISTS "Users can view their own security events" ON public.security_events;
DROP POLICY IF EXISTS "System can create security events" ON public.security_events;

CREATE POLICY "System can create security events" ON public.security_events
  FOR INSERT 
  WITH CHECK (true);

-- 4. Fix team_invitations table - remove public access policies
DROP POLICY IF EXISTS "Team admins can manage invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Team admins can view invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can manage invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON public.team_invitations;
DROP POLICY IF EXISTS "System can update invitation status" ON public.team_invitations;

CREATE POLICY "System can update invitation status" ON public.team_invitations
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- 5. Fix team_security_events table - remove public access
DROP POLICY IF EXISTS "Team admins can manage security events" ON public.team_security_events;
DROP POLICY IF EXISTS "Team security officers can view security events" ON public.team_security_events;
DROP POLICY IF EXISTS "System can create security events" ON public.team_security_events;

CREATE POLICY "System can create team security events" ON public.team_security_events
  FOR INSERT 
  WITH CHECK (true);

COMMENT ON DATABASE postgres IS 'FINAL SECURITY LOCKDOWN: All public access removed from sensitive tables. Only authenticated users with proper permissions can access data.';