-- Add RLS policies for task-related tables that have RLS enabled but no policies

-- Task assignments policies
CREATE POLICY "Users can view task assignments for accessible projects"
  ON public.task_assignments
  FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.project_team_members ptm
        WHERE ptm.project_id = p.id 
        AND ptm.user_id = auth.uid() 
        AND ptm.invitation_status = 'active'
      )
    )
  );

CREATE POLICY "Users can manage task assignments for accessible projects"
  ON public.task_assignments
  FOR ALL
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.project_team_members ptm
        WHERE ptm.project_id = p.id 
        AND ptm.user_id = auth.uid() 
        AND ptm.role IN ('admin', 'manager', 'editor')
        AND ptm.invitation_status = 'active'
      )
    )
  );

-- Task dependencies policies
CREATE POLICY "Users can view task dependencies for accessible projects"
  ON public.task_dependencies
  FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.project_team_members ptm
        WHERE ptm.project_id = p.id 
        AND ptm.user_id = auth.uid() 
        AND ptm.invitation_status = 'active'
      )
    )
  );

CREATE POLICY "Users can manage task dependencies for accessible projects"
  ON public.task_dependencies
  FOR ALL
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.project_team_members ptm
        WHERE ptm.project_id = p.id 
        AND ptm.user_id = auth.uid() 
        AND ptm.role IN ('admin', 'manager', 'editor')
        AND ptm.invitation_status = 'active'
      )
    )
  );

-- Task label assignments policies
CREATE POLICY "Users can view task label assignments for accessible projects"
  ON public.task_label_assignments
  FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.project_team_members ptm
        WHERE ptm.project_id = p.id 
        AND ptm.user_id = auth.uid() 
        AND ptm.invitation_status = 'active'
      )
    )
  );

CREATE POLICY "Users can manage task label assignments for accessible projects"
  ON public.task_label_assignments
  FOR ALL
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.project_team_members ptm
        WHERE ptm.project_id = p.id 
        AND ptm.user_id = auth.uid() 
        AND ptm.role IN ('admin', 'manager', 'editor')
        AND ptm.invitation_status = 'active'
      )
    )
  );

-- Task watchers policies
CREATE POLICY "Users can view task watchers for accessible projects"
  ON public.task_watchers
  FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.project_team_members ptm
        WHERE ptm.project_id = p.id 
        AND ptm.user_id = auth.uid() 
        AND ptm.invitation_status = 'active'
      )
    )
  );

CREATE POLICY "Users can manage task watchers for accessible projects"
  ON public.task_watchers
  FOR ALL
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.project_team_members ptm
        WHERE ptm.project_id = p.id 
        AND ptm.user_id = auth.uid() 
        AND ptm.role IN ('admin', 'manager', 'editor')
        AND ptm.invitation_status = 'active'
      )
    )
  );