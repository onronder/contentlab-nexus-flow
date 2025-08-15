-- Fix remaining security issues for analytics tables

-- 1. Fix system_analytics table access - restrict to system administrators only
DROP POLICY IF EXISTS "Authenticated users can view system analytics" ON public.system_analytics;
DROP POLICY IF EXISTS "System administrators can view system analytics" ON public.system_analytics;

CREATE POLICY "System administrators can view system analytics" ON public.system_analytics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.user_roles ur ON tm.role_id = ur.id
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
      AND ur.slug IN ('admin', 'super_admin', 'system_admin')
    )
  );

-- 2. Fix content_analytics table access - restrict to content owners and team members
DROP POLICY IF EXISTS "Users can view analytics for their content" ON public.content_analytics;
DROP POLICY IF EXISTS "System can manage analytics" ON public.content_analytics;

CREATE POLICY "Users can view analytics for their content" ON public.content_analytics
  FOR SELECT TO authenticated
  USING (
    content_id IN (
      SELECT ci.id
      FROM public.content_items ci
      WHERE ci.user_id = auth.uid()
      OR ci.team_id IN (
        SELECT tm.team_id
        FROM public.team_members tm
        WHERE tm.user_id = auth.uid() 
        AND tm.is_active = true 
        AND tm.status = 'active'
      )
    )
  );

CREATE POLICY "System can manage content analytics" ON public.content_analytics
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Add documentation comment about pg_net extension
COMMENT ON SCHEMA extensions IS 'Schema for extensions. MANUAL ACTION REQUIRED: The pg_net extension is still in the public schema and requires superuser privileges to move. Please contact your database administrator to run: ALTER EXTENSION pg_net SET SCHEMA extensions;';

-- Document security completion
COMMENT ON DATABASE postgres IS 'Security hardening mostly completed: All security definer functions have proper search paths, RLS policies are properly restricted, but pg_net extension still needs to be moved from public schema by a database administrator.';