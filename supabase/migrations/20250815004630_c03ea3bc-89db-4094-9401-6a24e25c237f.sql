-- URGENT: Remove conflicting and overly permissive policies from team_billing
-- These policies are creating security vulnerabilities

-- Drop all the problematic policies that allow broad access to financial data
DROP POLICY IF EXISTS "System can manage billing" ON public.team_billing;
DROP POLICY IF EXISTS "Team members can view billing info" ON public.team_billing;
DROP POLICY IF EXISTS "Team admins can manage billing" ON public.team_billing;

-- Also remove any other overly permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.team_billing;
DROP POLICY IF EXISTS "Public read access" ON public.team_billing;
DROP POLICY IF EXISTS "Allow public read access" ON public.team_billing;

-- Verify our secure policies are still in place and working correctly
-- The following policies should remain (these are the secure ones we created):
-- 1. "Authorized team members can view billing data" (uses can_access_team_billing function)
-- 2. "Authorized team members can create billing data" (uses can_access_team_billing function) 
-- 3. "Authorized team members can update billing data" (uses can_access_team_billing function)
-- 4. "Team owners can delete billing data" (only team owners)

-- Log this critical security fix
INSERT INTO public.audit_logs (
  action_type,
  action_description,
  resource_type,
  metadata
) VALUES (
  'security_fix',
  'CRITICAL: Removed conflicting overly permissive RLS policies from team_billing table',
  'team_billing',
  jsonb_build_object(
    'issue', 'Conflicting RLS policies exposing financial data',
    'severity', 'critical',
    'policies_removed', ARRAY['System can manage billing', 'Team members can view billing info', 'Team admins can manage billing'],
    'fix_description', 'Removed policies that allowed public and broad team member access to financial data',
    'remaining_policies', 'Only secure, function-based access control policies remain',
    'timestamp', now()
  )
);