-- Comprehensive fix for infinite recursion - handle all cascading dependencies
-- Drop all policies that depend on get_user_teams_safe first

-- Activity logs
DROP POLICY IF EXISTS "Users can view relevant activity logs" ON public.activity_logs;

-- Team tasks and related tables
DROP POLICY IF EXISTS "Team members can view team tasks" ON public.team_tasks;
DROP POLICY IF EXISTS "Team members can create tasks" ON public.team_tasks;
DROP POLICY IF EXISTS "Team members can update tasks" ON public.team_tasks;

-- Task assignments
DROP POLICY IF EXISTS "Team members can view task assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Team members can manage task assignments" ON public.task_assignments;

-- Task dependencies
DROP POLICY IF EXISTS "Team members can view task dependencies" ON public.task_dependencies;
DROP POLICY IF EXISTS "Team members can manage task dependencies" ON public.task_dependencies;

-- Task comments
DROP POLICY IF EXISTS "Team members can view task comments" ON public.task_comments;
DROP POLICY IF EXISTS "Team members can create comments" ON public.task_comments;

-- Task time tracking
DROP POLICY IF EXISTS "Team members can view time tracking" ON public.task_time_tracking;
DROP POLICY IF EXISTS "Users can log their own time" ON public.task_time_tracking;

-- Task labels
DROP POLICY IF EXISTS "Team members can view team labels" ON public.task_labels;
DROP POLICY IF EXISTS "Team members can create labels" ON public.task_labels;

-- Task label assignments
DROP POLICY IF EXISTS "Team members can view label assignments" ON public.task_label_assignments;
DROP POLICY IF EXISTS "Team members can manage label assignments" ON public.task_label_assignments;

-- Task watchers
DROP POLICY IF EXISTS "Team members can view watchers" ON public.task_watchers;
DROP POLICY IF EXISTS "Users can manage their own watching" ON public.task_watchers;

-- Task templates
DROP POLICY IF EXISTS "Team members can view team templates" ON public.task_templates;
DROP POLICY IF EXISTS "Team members can create templates" ON public.task_templates;

-- Task workflows
DROP POLICY IF EXISTS "Team members can view team workflows" ON public.task_workflows;

-- Recurring tasks
DROP POLICY IF EXISTS "Team members can view recurring tasks" ON public.recurring_tasks;

-- Now drop and recreate get_user_teams_safe
DROP FUNCTION IF EXISTS public.get_user_teams_safe(uuid) CASCADE;

-- Create a simpler version that only returns teams where user is owner
-- This avoids the circular dependency entirely
CREATE OR REPLACE FUNCTION public.get_user_teams_safe(p_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Only return teams where user is owner to avoid circular dependency
  SELECT t.id as team_id
  FROM public.teams t
  WHERE t.owner_id = p_user_id
  AND t.is_active = true;
$function$;

-- Recreate simplified team_members policies
CREATE POLICY "Users can view team members"
ON public.team_members
FOR SELECT
USING (
  -- Team owners can see all members
  is_team_owner_safe(team_id, auth.uid())
  OR
  -- Users can see their own membership
  user_id = auth.uid()
);

-- Recreate essential activity logs policy
CREATE POLICY "Users can view relevant activity logs"
ON public.activity_logs
FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  team_id IN (SELECT team_id FROM get_user_teams_safe(auth.uid()))
  OR 
  project_id IN (SELECT project_id FROM get_user_projects_safe(auth.uid()))
);