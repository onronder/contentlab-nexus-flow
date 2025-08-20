-- Fix critical security issue: Restrict system infrastructure data access to administrators only
-- This addresses the ERROR-level finding where sensitive system health data was exposed to all authenticated users

-- Remove the overly permissive policy that allows all authenticated users to view system health data
DROP POLICY IF EXISTS "Authenticated users can view system health" ON public.system_health_status;

-- Ensure only the restrictive policy remains for system administrators
-- The following policy should already exist, but let's recreate it to be certain
DROP POLICY IF EXISTS "System administrators can view health status" ON public.system_health_status;

-- Create a secure policy that restricts access to system administrators only
CREATE POLICY "System administrators can view health status" ON public.system_health_status
  FOR SELECT TO authenticated
  USING (
    -- Only allow system administrators to view infrastructure data
    EXISTS (
      SELECT 1 
      FROM team_members tm 
      JOIN user_roles ur ON tm.role_id = ur.id
      WHERE tm.user_id = auth.uid() 
        AND tm.is_active = true 
        AND tm.status = 'active'
        AND ur.slug IN ('admin', 'super_admin', 'system_admin', 'infrastructure_admin')
        AND ur.is_active = true
    ) 
    OR 
    -- Fallback check using the system admin function
    is_user_system_admin(auth.uid())
  );

-- Ensure system operations can still manage health status data
-- Keep the existing system management policy
CREATE POLICY "System can manage health status" ON public.system_health_status
  FOR ALL TO authenticated
  USING (
    -- Allow system operations (background processes, health checks, etc.)
    current_setting('role') = 'service_role'
    OR
    -- Allow system administrators to manage health data
    EXISTS (
      SELECT 1 
      FROM team_members tm 
      JOIN user_roles ur ON tm.role_id = ur.id
      WHERE tm.user_id = auth.uid() 
        AND tm.is_active = true 
        AND tm.status = 'active'
        AND ur.slug IN ('admin', 'super_admin', 'system_admin', 'infrastructure_admin')
        AND ur.is_active = true
    )
  )
  WITH CHECK (
    -- Same conditions for write operations
    current_setting('role') = 'service_role'
    OR
    EXISTS (
      SELECT 1 
      FROM team_members tm 
      JOIN user_roles ur ON tm.role_id = ur.id
      WHERE tm.user_id = auth.uid() 
        AND tm.is_active = true 
        AND tm.status = 'active'
        AND ur.slug IN ('admin', 'super_admin', 'system_admin', 'infrastructure_admin')
        AND ur.is_active = true
    )
  );

-- Add security comment to track this fix
COMMENT ON TABLE public.system_health_status IS 'SECURITY: Restricted access to system administrators only - prevents exposure of sensitive infrastructure data (CPU, memory, network latency, service versions) to unauthorized users';

-- Log this critical security fix
INSERT INTO public.activity_logs (
  activity_type, 
  action, 
  description, 
  metadata,
  user_id
) VALUES (
  'authentication',
  'infrastructure_access_restricted', 
  'CRITICAL: Fixed system infrastructure data exposure - restricted system_health_status table access to administrators only',
  jsonb_build_object(
    'affected_table', 'system_health_status',
    'security_level', 'CRITICAL',
    'vulnerability_type', 'INFRASTRUCTURE_DATA_EXPOSURE',
    'fix_type', 'RLS_POLICY_RESTRICTION',
    'sensitive_data_protected', array[
      'cpu_usage', 'memory_usage', 'disk_usage', 
      'network_latency_ms', 'active_connections', 
      'service_version', 'health_details', 'metadata'
    ]
  ),
  auth.uid()
) ON CONFLICT DO NOTHING;