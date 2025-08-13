-- Add RLS policies for task-related tables

-- For task_assignments table
CREATE POLICY "Team members can view task assignments"
  ON public.task_assignments
  FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.project_team_members ptm
          WHERE ptm.project_id = p.id 
          AND ptm.user_id = auth.uid() 
          AND ptm.invitation_status = 'active'
        )
    )
  );

CREATE POLICY "Team members can manage task assignments"
  ON public.task_assignments
  FOR ALL
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.project_team_members ptm
          WHERE ptm.project_id = p.id 
          AND ptm.user_id = auth.uid() 
          AND ptm.role IN ('admin', 'manager')
          AND ptm.invitation_status = 'active'
        )
    )
  );

-- For task_dependencies table
CREATE POLICY "Team members can view task dependencies"
  ON public.task_dependencies
  FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.project_team_members ptm
          WHERE ptm.project_id = p.id 
          AND ptm.user_id = auth.uid() 
          AND ptm.invitation_status = 'active'
        )
    )
  );

CREATE POLICY "Team members can manage task dependencies"
  ON public.task_dependencies
  FOR ALL
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.project_team_members ptm
          WHERE ptm.project_id = p.id 
          AND ptm.user_id = auth.uid() 
          AND ptm.role IN ('admin', 'manager', 'analyst')
          AND ptm.invitation_status = 'active'
        )
    )
  );

-- For task_label_assignments table
CREATE POLICY "Team members can view task label assignments"
  ON public.task_label_assignments
  FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.project_team_members ptm
          WHERE ptm.project_id = p.id 
          AND ptm.user_id = auth.uid() 
          AND ptm.invitation_status = 'active'
        )
    )
  );

CREATE POLICY "Team members can manage task label assignments"
  ON public.task_label_assignments
  FOR ALL
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.project_team_members ptm
          WHERE ptm.project_id = p.id 
          AND ptm.user_id = auth.uid() 
          AND ptm.role IN ('admin', 'manager', 'analyst')
          AND ptm.invitation_status = 'active'
        )
    )
  );

-- For task_watchers table
CREATE POLICY "Team members can view task watchers"
  ON public.task_watchers
  FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.project_team_members ptm
          WHERE ptm.project_id = p.id 
          AND ptm.user_id = auth.uid() 
          AND ptm.invitation_status = 'active'
        )
    )
  );

CREATE POLICY "Users can watch tasks"
  ON public.task_watchers
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.project_team_members ptm
          WHERE ptm.project_id = p.id 
          AND ptm.user_id = auth.uid() 
          AND ptm.invitation_status = 'active'
        )
    )
  );

CREATE POLICY "Users can unwatch tasks"
  ON public.task_watchers
  FOR DELETE
  USING (user_id = auth.uid());