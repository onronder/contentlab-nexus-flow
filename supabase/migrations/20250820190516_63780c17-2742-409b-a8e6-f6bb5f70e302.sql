-- PHASE 1: Fix RLS Policy Infinite Recursion (CRITICAL) - Drop and Recreate Functions
-- This addresses the "infinite recursion detected in policy for relation team_members" error

-- Drop existing functions that may have different parameter names
DROP FUNCTION IF EXISTS public.is_team_member_safe(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_user_accessible_teams(uuid);
DROP FUNCTION IF EXISTS public.is_team_owner_safe(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_user_team_role_level_safe(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_manage_team_resources(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_user_teams_safe(uuid);
DROP FUNCTION IF EXISTS public.get_user_projects_safe(uuid);

-- Also drop functions that might exist with different names
DROP FUNCTION IF EXISTS public.is_team_member_safe(team_id_param uuid, user_id_param uuid);
DROP FUNCTION IF EXISTS public.get_user_teams(uuid);

-- Create security definer functions to avoid circular dependencies in RLS policies
-- These functions bypass RLS when checking permissions, preventing infinite recursion

-- Function to safely check if user is a team member (avoids recursion)
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

-- Function to safely get user's accessible teams (avoids recursion)
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

-- Function to safely check if user is team owner
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

-- Function to safely get user's role level in team
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

-- Function to check if user can manage team resources
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