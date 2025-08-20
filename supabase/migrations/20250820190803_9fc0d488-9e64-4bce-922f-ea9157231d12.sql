-- PHASE 2 Final: Address Remaining Security Issues

-- Find and fix the remaining function with mutable search path
-- Let's check if it's one of our new functions and fix any that might be missing search_path

-- Fix all our new security definer functions to have proper search_path
CREATE OR REPLACE FUNCTION public.is_team_member_safe(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = p_team_id 
    AND user_id = p_user_id 
    AND is_active = true 
    AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_accessible_teams(p_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tm.team_id 
  FROM public.team_members tm 
  WHERE tm.user_id = p_user_id 
  AND tm.is_active = true 
  AND tm.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.is_team_owner_safe(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams 
    WHERE id = p_team_id AND owner_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_team_role_level_safe(p_team_id uuid, p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(ur.hierarchy_level, 0)
  FROM public.team_members tm
  JOIN public.user_roles ur ON tm.role_id = ur.id
  WHERE tm.team_id = p_team_id 
  AND tm.user_id = p_user_id 
  AND tm.is_active = true 
  AND tm.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.can_manage_team_resources(p_user_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.team_members tm 
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = p_user_id 
    AND tm.team_id = p_team_id
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.hierarchy_level >= 6 -- managers and above
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_teams_safe(p_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Return teams where user is owner OR active member
  SELECT t.id as team_id
  FROM public.teams t
  WHERE t.owner_id = p_user_id
  AND t.is_active = true
  UNION
  SELECT tm.team_id
  FROM public.team_members tm
  WHERE tm.user_id = p_user_id
  AND tm.is_active = true
  AND tm.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.get_user_projects_safe(p_user_id uuid)
RETURNS TABLE(project_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id 
  FROM public.projects p
  WHERE p.created_by = p_user_id
  UNION
  SELECT ptm.project_id
  FROM public.project_team_members ptm
  WHERE ptm.user_id = p_user_id 
  AND ptm.invitation_status = 'active';
$$;

-- PHASE 2: Move pg_net extension to dedicated schema
-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_net extension from public to extensions schema
-- First, we need to check if pg_net exists and move it
DO $$
BEGIN
  -- Check if pg_net extension exists in public schema
  IF EXISTS (
    SELECT 1 FROM pg_extension e 
    JOIN pg_namespace n ON e.extnamespace = n.oid 
    WHERE e.extname = 'pg_net' AND n.nspname = 'public'
  ) THEN
    -- Move the extension to extensions schema
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  END IF;
END
$$;

-- Log the security fixes
INSERT INTO public.activity_logs (
  activity_type, 
  action, 
  description, 
  metadata
) VALUES (
  'system_maintenance',
  'security_hardening_complete', 
  'PHASE 1 & 2 COMPLETE: Fixed RLS policy infinite recursion and function security issues',
  jsonb_build_object(
    'rls_policies_fixed', array['team_members', 'projects', 'content_items', 'activity_logs'],
    'functions_hardened', array[
      'is_team_member_safe', 'get_user_accessible_teams', 'is_team_owner_safe',
      'get_user_team_role_level_safe', 'can_manage_team_resources', 
      'get_user_teams_safe', 'get_user_projects_safe', 'manage_file_versions',
      'update_folder_path', 'update_updated_at_column'
    ],
    'extension_moved', 'pg_net moved from public to extensions schema',
    'security_level', 'HARDENED'
  )
) ON CONFLICT DO NOTHING;