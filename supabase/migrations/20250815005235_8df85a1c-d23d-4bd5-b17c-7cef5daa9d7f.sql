-- CRITICAL SECURITY FIX: Add missing RLS policies for task-related tables
-- These tables currently have no RLS policies, exposing task data

-- Enable RLS on task-related tables if not already enabled
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_label_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_watchers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_assignments
-- Only team members can view/manage task assignments for tasks in their teams
CREATE POLICY "Team members can view task assignments"
ON public.task_assignments
FOR SELECT
USING (
  task_id IN (
    SELECT t.id 
    FROM public.team_tasks t 
    WHERE t.team_id IN (
      SELECT tm.team_id 
      FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  )
);

CREATE POLICY "Team members can create task assignments"
ON public.task_assignments
FOR INSERT
WITH CHECK (
  task_id IN (
    SELECT t.id 
    FROM public.team_tasks t 
    WHERE t.team_id IN (
      SELECT tm.team_id 
      FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  )
);

CREATE POLICY "Team members can update task assignments"
ON public.task_assignments
FOR UPDATE
USING (
  task_id IN (
    SELECT t.id 
    FROM public.team_tasks t 
    WHERE t.team_id IN (
      SELECT tm.team_id 
      FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  )
);

CREATE POLICY "Team members can delete task assignments"
ON public.task_assignments
FOR DELETE
USING (
  task_id IN (
    SELECT t.id 
    FROM public.team_tasks t 
    WHERE t.team_id IN (
      SELECT tm.team_id 
      FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  )
);

-- RLS Policies for task_dependencies  
CREATE POLICY "Team members can view task dependencies"
ON public.task_dependencies
FOR SELECT
USING (
  task_id IN (
    SELECT t.id 
    FROM public.team_tasks t 
    WHERE t.team_id IN (
      SELECT tm.team_id 
      FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  )
);

CREATE POLICY "Team members can create task dependencies"
ON public.task_dependencies
FOR INSERT
WITH CHECK (
  task_id IN (
    SELECT t.id 
    FROM public.team_tasks t 
    WHERE t.team_id IN (
      SELECT tm.team_id 
      FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  )
  AND depends_on_task_id IN (
    SELECT t.id 
    FROM public.team_tasks t 
    WHERE t.team_id IN (
      SELECT tm.team_id 
      FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  )
);

CREATE POLICY "Team members can delete task dependencies"
ON public.task_dependencies
FOR DELETE
USING (
  task_id IN (
    SELECT t.id 
    FROM public.team_tasks t 
    WHERE t.team_id IN (
      SELECT tm.team_id 
      FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  )
);

-- RLS Policies for task_label_assignments
CREATE POLICY "Team members can view task label assignments"
ON public.task_label_assignments
FOR SELECT
USING (
  task_id IN (
    SELECT t.id 
    FROM public.team_tasks t 
    WHERE t.team_id IN (
      SELECT tm.team_id 
      FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  )
);

CREATE POLICY "Team members can create task label assignments"
ON public.task_label_assignments
FOR INSERT
WITH CHECK (
  task_id IN (
    SELECT t.id 
    FROM public.team_tasks t 
    WHERE t.team_id IN (
      SELECT tm.team_id 
      FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  )
);

CREATE POLICY "Team members can delete task label assignments"
ON public.task_label_assignments
FOR DELETE
USING (
  task_id IN (
    SELECT t.id 
    FROM public.team_tasks t 
    WHERE t.team_id IN (
      SELECT tm.team_id 
      FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  )
);

-- RLS Policies for task_watchers
CREATE POLICY "Team members can view task watchers"
ON public.task_watchers
FOR SELECT
USING (
  task_id IN (
    SELECT t.id 
    FROM public.team_tasks t 
    WHERE t.team_id IN (
      SELECT tm.team_id 
      FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  )
);

CREATE POLICY "Team members can create task watchers"
ON public.task_watchers
FOR INSERT
WITH CHECK (
  task_id IN (
    SELECT t.id 
    FROM public.team_tasks t 
    WHERE t.team_id IN (
      SELECT tm.team_id 
      FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  )
);

CREATE POLICY "Team members can delete task watchers"
ON public.task_watchers
FOR DELETE
USING (
  task_id IN (
    SELECT t.id 
    FROM public.team_tasks t 
    WHERE t.team_id IN (
      SELECT tm.team_id 
      FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  )
);

-- Log this critical security fix
INSERT INTO public.audit_logs (
  action_type,
  action_description,
  resource_type,
  metadata
) VALUES (
  'security_fix',
  'CRITICAL: Added missing RLS policies for task-related tables',
  'task_security',
  jsonb_build_object(
    'issue', 'Missing RLS policies exposing task data',
    'severity', 'critical',
    'tables_fixed', ARRAY['task_assignments', 'task_dependencies', 'task_label_assignments', 'task_watchers'],
    'fix_description', 'Added comprehensive RLS policies restricting access to team members only',
    'timestamp', now()
  )
);