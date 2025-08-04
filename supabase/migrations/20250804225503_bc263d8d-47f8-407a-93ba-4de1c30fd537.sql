-- Create task status enum
CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled');

-- Create task priority enum  
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create task type enum
CREATE TYPE task_type AS ENUM ('feature', 'bug', 'improvement', 'research', 'maintenance');

-- Create assignment status enum
CREATE TYPE assignment_status AS ENUM ('assigned', 'accepted', 'declined', 'completed');

-- Core team_tasks table
CREATE TABLE public.team_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  project_id UUID NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type task_type NOT NULL DEFAULT 'feature',
  status task_status NOT NULL DEFAULT 'backlog',
  priority task_priority NOT NULL DEFAULT 'medium',
  created_by UUID NOT NULL,
  assignee_id UUID NULL,
  parent_task_id UUID NULL,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2) DEFAULT 0,
  story_points INTEGER,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  due_date TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Task assignments for multiple assignees
CREATE TABLE public.task_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  role TEXT DEFAULT 'assignee', -- assignee, reviewer, watcher
  status assignment_status NOT NULL DEFAULT 'assigned',
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(task_id, user_id, role)
);

-- Task dependencies
CREATE TABLE public.task_dependencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  depends_on_task_id UUID NOT NULL,
  dependency_type TEXT NOT NULL DEFAULT 'blocks', -- blocks, subtask, related
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, depends_on_task_id)
);

-- Task comments and activity
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID NULL,
  comment_type TEXT NOT NULL DEFAULT 'comment', -- comment, activity, system
  mentions JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Task time tracking
CREATE TABLE public.task_time_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  description TEXT,
  hours_logged DECIMAL(5,2) NOT NULL,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  is_billable BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Task labels for dynamic categorization
CREATE TABLE public.task_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, name)
);

-- Task label assignments
CREATE TABLE public.task_label_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  label_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, label_id)
);

-- Task watchers for notifications
CREATE TABLE public.task_watchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  notification_preferences JSONB DEFAULT '{"status_changes": true, "comments": true, "assignments": true}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Task templates for reusable tasks
CREATE TABLE public.task_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  task_type task_type NOT NULL DEFAULT 'feature',
  priority task_priority NOT NULL DEFAULT 'medium',
  estimated_hours DECIMAL(5,2),
  story_points INTEGER,
  tags TEXT[] DEFAULT '{}',
  checklist JSONB DEFAULT '[]',
  custom_fields JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Task workflows for custom status flows
CREATE TABLE public.task_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  statuses JSONB NOT NULL, -- array of status objects with transitions
  is_default BOOLEAN DEFAULT false,
  task_types task_type[] DEFAULT '{}', -- which task types use this workflow
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recurring tasks for automation
CREATE TABLE public.recurring_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  template_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  recurrence_pattern JSONB NOT NULL, -- cron-like pattern
  is_active BOOLEAN DEFAULT true,
  last_created_at TIMESTAMP WITH TIME ZONE,
  next_due_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.team_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_time_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_label_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_tasks
CREATE POLICY "Team members can view team tasks" 
ON public.team_tasks FOR SELECT 
USING (team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid())));

CREATE POLICY "Team members can create tasks" 
ON public.team_tasks FOR INSERT 
WITH CHECK (
  team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid())) 
  AND created_by = auth.uid()
);

CREATE POLICY "Team members can update tasks" 
ON public.team_tasks FOR UPDATE 
USING (team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid())));

CREATE POLICY "Task creators and team admins can delete tasks" 
ON public.team_tasks FOR DELETE 
USING (
  created_by = auth.uid() 
  OR (team_id IN (
    SELECT tm.team_id FROM team_members tm 
    JOIN user_roles ur ON tm.role_id = ur.id 
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active' 
    AND ur.hierarchy_level >= 8
  ))
);

-- RLS Policies for task_assignments
CREATE POLICY "Team members can view task assignments" 
ON public.task_assignments FOR SELECT 
USING (task_id IN (SELECT id FROM team_tasks WHERE team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid()))));

CREATE POLICY "Team members can manage task assignments" 
ON public.task_assignments FOR ALL 
USING (task_id IN (SELECT id FROM team_tasks WHERE team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid()))));

-- RLS Policies for task_dependencies
CREATE POLICY "Team members can view task dependencies" 
ON public.task_dependencies FOR SELECT 
USING (task_id IN (SELECT id FROM team_tasks WHERE team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid()))));

CREATE POLICY "Team members can manage task dependencies" 
ON public.task_dependencies FOR ALL 
USING (task_id IN (SELECT id FROM team_tasks WHERE team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid()))));

-- RLS Policies for task_comments
CREATE POLICY "Team members can view task comments" 
ON public.task_comments FOR SELECT 
USING (task_id IN (SELECT id FROM team_tasks WHERE team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid()))));

CREATE POLICY "Team members can create comments" 
ON public.task_comments FOR INSERT 
WITH CHECK (
  task_id IN (SELECT id FROM team_tasks WHERE team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid())))
  AND user_id = auth.uid()
);

CREATE POLICY "Comment authors can update their comments" 
ON public.task_comments FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Comment authors and team admins can delete comments" 
ON public.task_comments FOR DELETE 
USING (
  user_id = auth.uid() 
  OR task_id IN (
    SELECT tt.id FROM team_tasks tt 
    JOIN team_members tm ON tt.team_id = tm.team_id 
    JOIN user_roles ur ON tm.role_id = ur.id 
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active' 
    AND ur.hierarchy_level >= 8
  )
);

-- RLS Policies for task_time_tracking
CREATE POLICY "Team members can view time tracking" 
ON public.task_time_tracking FOR SELECT 
USING (task_id IN (SELECT id FROM team_tasks WHERE team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid()))));

CREATE POLICY "Users can log their own time" 
ON public.task_time_tracking FOR INSERT 
WITH CHECK (
  task_id IN (SELECT id FROM team_tasks WHERE team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid())))
  AND user_id = auth.uid()
);

CREATE POLICY "Users can update their own time logs" 
ON public.task_time_tracking FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own time logs" 
ON public.task_time_tracking FOR DELETE 
USING (user_id = auth.uid());

-- RLS Policies for task_labels
CREATE POLICY "Team members can view team labels" 
ON public.task_labels FOR SELECT 
USING (team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid())));

CREATE POLICY "Team members can create labels" 
ON public.task_labels FOR INSERT 
WITH CHECK (
  team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid()))
  AND created_by = auth.uid()
);

CREATE POLICY "Label creators and team admins can manage labels" 
ON public.task_labels FOR ALL 
USING (
  created_by = auth.uid() 
  OR team_id IN (
    SELECT tm.team_id FROM team_members tm 
    JOIN user_roles ur ON tm.role_id = ur.id 
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active' 
    AND ur.hierarchy_level >= 8
  )
);

-- RLS Policies for task_label_assignments
CREATE POLICY "Team members can view label assignments" 
ON public.task_label_assignments FOR SELECT 
USING (task_id IN (SELECT id FROM team_tasks WHERE team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid()))));

CREATE POLICY "Team members can manage label assignments" 
ON public.task_label_assignments FOR ALL 
USING (task_id IN (SELECT id FROM team_tasks WHERE team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid()))));

-- RLS Policies for task_watchers
CREATE POLICY "Team members can view watchers" 
ON public.task_watchers FOR SELECT 
USING (task_id IN (SELECT id FROM team_tasks WHERE team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid()))));

CREATE POLICY "Users can manage their own watching" 
ON public.task_watchers FOR ALL 
USING (
  user_id = auth.uid() 
  AND task_id IN (SELECT id FROM team_tasks WHERE team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid())))
);

-- RLS Policies for task_templates
CREATE POLICY "Team members can view team templates" 
ON public.task_templates FOR SELECT 
USING (team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid())) OR is_public = true);

CREATE POLICY "Team members can create templates" 
ON public.task_templates FOR INSERT 
WITH CHECK (
  team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid()))
  AND created_by = auth.uid()
);

CREATE POLICY "Template creators and team admins can manage templates" 
ON public.task_templates FOR ALL 
USING (
  created_by = auth.uid() 
  OR team_id IN (
    SELECT tm.team_id FROM team_members tm 
    JOIN user_roles ur ON tm.role_id = ur.id 
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active' 
    AND ur.hierarchy_level >= 8
  )
);

-- RLS Policies for task_workflows
CREATE POLICY "Team members can view team workflows" 
ON public.task_workflows FOR SELECT 
USING (team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid())));

CREATE POLICY "Team admins can manage workflows" 
ON public.task_workflows FOR ALL 
USING (
  team_id IN (
    SELECT tm.team_id FROM team_members tm 
    JOIN user_roles ur ON tm.role_id = ur.id 
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active' 
    AND ur.hierarchy_level >= 8
  )
);

-- RLS Policies for recurring_tasks
CREATE POLICY "Team members can view recurring tasks" 
ON public.recurring_tasks FOR SELECT 
USING (team_id IN (SELECT get_user_teams_safe.team_id FROM get_user_teams_safe(auth.uid())));

CREATE POLICY "Team admins can manage recurring tasks" 
ON public.recurring_tasks FOR ALL 
USING (
  team_id IN (
    SELECT tm.team_id FROM team_members tm 
    JOIN user_roles ur ON tm.role_id = ur.id 
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active' 
    AND ur.hierarchy_level >= 8
  )
);

-- Add foreign key constraints
ALTER TABLE public.task_assignments 
ADD CONSTRAINT fk_task_assignments_task FOREIGN KEY (task_id) REFERENCES public.team_tasks(id) ON DELETE CASCADE;

ALTER TABLE public.task_dependencies 
ADD CONSTRAINT fk_task_dependencies_task FOREIGN KEY (task_id) REFERENCES public.team_tasks(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_task_dependencies_depends_on FOREIGN KEY (depends_on_task_id) REFERENCES public.team_tasks(id) ON DELETE CASCADE;

ALTER TABLE public.task_comments 
ADD CONSTRAINT fk_task_comments_task FOREIGN KEY (task_id) REFERENCES public.team_tasks(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_task_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES public.task_comments(id) ON DELETE CASCADE;

ALTER TABLE public.task_time_tracking 
ADD CONSTRAINT fk_task_time_tracking_task FOREIGN KEY (task_id) REFERENCES public.team_tasks(id) ON DELETE CASCADE;

ALTER TABLE public.task_label_assignments 
ADD CONSTRAINT fk_task_label_assignments_task FOREIGN KEY (task_id) REFERENCES public.team_tasks(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_task_label_assignments_label FOREIGN KEY (label_id) REFERENCES public.task_labels(id) ON DELETE CASCADE;

ALTER TABLE public.task_watchers 
ADD CONSTRAINT fk_task_watchers_task FOREIGN KEY (task_id) REFERENCES public.team_tasks(id) ON DELETE CASCADE;

ALTER TABLE public.recurring_tasks 
ADD CONSTRAINT fk_recurring_tasks_template FOREIGN KEY (template_id) REFERENCES public.task_templates(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX idx_team_tasks_team_id ON public.team_tasks(team_id);
CREATE INDEX idx_team_tasks_status ON public.team_tasks(status);
CREATE INDEX idx_team_tasks_assignee ON public.team_tasks(assignee_id);
CREATE INDEX idx_team_tasks_created_by ON public.team_tasks(created_by);
CREATE INDEX idx_team_tasks_due_date ON public.team_tasks(due_date);
CREATE INDEX idx_team_tasks_project_id ON public.team_tasks(project_id);

CREATE INDEX idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX idx_task_assignments_user_id ON public.task_assignments(user_id);

CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON public.task_comments(user_id);

CREATE INDEX idx_task_time_tracking_task_id ON public.task_time_tracking(task_id);
CREATE INDEX idx_task_time_tracking_user_id ON public.task_time_tracking(user_id);
CREATE INDEX idx_task_time_tracking_date ON public.task_time_tracking(logged_date);

-- Add triggers for updated_at
CREATE TRIGGER update_team_tasks_updated_at 
BEFORE UPDATE ON public.team_tasks 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at 
BEFORE UPDATE ON public.task_comments 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_templates_updated_at 
BEFORE UPDATE ON public.task_templates 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_workflows_updated_at 
BEFORE UPDATE ON public.task_workflows 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recurring_tasks_updated_at 
BEFORE UPDATE ON public.recurring_tasks 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();