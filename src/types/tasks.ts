export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'feature' | 'bug' | 'improvement' | 'research' | 'maintenance';
export type AssignmentStatus = 'assigned' | 'accepted' | 'declined' | 'completed';

// Core Task interfaces
export interface Task {
  id: string;
  team_id: string;
  project_id?: string;
  title: string;
  description?: string;
  task_type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  created_by: string;
  assignee_id?: string;
  parent_task_id?: string;
  estimated_hours?: number;
  actual_hours: number;
  story_points?: number;
  tags: string[];
  custom_fields: Record<string, any>;
  due_date?: string;
  start_date?: string;
  completed_at?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  assignments?: TaskAssignment[];
  dependencies?: TaskDependency[];
  comments?: TaskComment[];
  time_logs?: TaskTimeLog[];
  labels?: TaskLabel[];
  watchers?: TaskWatcher[];
  assignee?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
  created_by_user?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  assigned_by: string;
  role: string;
  status: AssignmentStatus;
  assigned_at: string;
  accepted_at?: string;
  completed_at?: string;
  
  // Relations
  user?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
  assigned_by_user?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: string;
  created_by: string;
  created_at: string;
  
  // Relations
  depends_on_task?: {
    id: string;
    title: string;
    status: TaskStatus;
  };
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  parent_comment_id?: string;
  comment_type: string;
  mentions: any[];
  attachments: any[];
  created_at: string;
  updated_at: string;
  
  // Relations
  user?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
  replies?: TaskComment[];
}

export interface TaskTimeLog {
  id: string;
  task_id: string;
  user_id: string;
  description?: string;
  hours_logged: number;
  logged_date: string;
  started_at?: string;
  ended_at?: string;
  is_billable: boolean;
  created_at: string;
  
  // Relations
  user?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

export interface TaskLabel {
  id: string;
  team_id: string;
  name: string;
  color: string;
  description?: string;
  created_by: string;
  created_at: string;
}

export interface TaskLabelAssignment {
  id: string;
  task_id: string;
  label_id: string;
  assigned_by: string;
  assigned_at: string;
  
  // Relations
  label?: TaskLabel;
}

export interface TaskWatcher {
  id: string;
  task_id: string;
  user_id: string;
  notification_preferences: {
    status_changes: boolean;
    comments: boolean;
    assignments: boolean;
  };
  created_at: string;
  
  // Relations
  user?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

export interface TaskTemplate {
  id: string;
  team_id: string;
  name: string;
  description?: string;
  task_type: TaskType;
  priority: TaskPriority;
  estimated_hours?: number;
  story_points?: number;
  tags: string[];
  checklist: any[];
  custom_fields: Record<string, any>;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TaskWorkflow {
  id: string;
  team_id: string;
  name: string;
  description?: string;
  statuses: WorkflowStatus[];
  is_default: boolean;
  task_types: TaskType[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  transitions: string[];
  is_initial?: boolean;
  is_final?: boolean;
}

export interface RecurringTask {
  id: string;
  team_id: string;
  template_id: string;
  name: string;
  description?: string;
  recurrence_pattern: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    days_of_week?: number[];
    day_of_month?: number;
    month?: number;
  };
  is_active: boolean;
  last_created_at?: string;
  next_due_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  template?: TaskTemplate;
}

// Input/Update interfaces
export interface TaskCreateInput {
  team_id: string;
  project_id?: string;
  title: string;
  description?: string;
  task_type?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string;
  parent_task_id?: string;
  estimated_hours?: number;
  story_points?: number;
  tags?: string[];
  custom_fields?: Record<string, any>;
  due_date?: string;
  start_date?: string;
}

export interface TaskUpdateInput {
  title?: string;
  description?: string;
  task_type?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string;
  estimated_hours?: number;
  actual_hours?: number;
  story_points?: number;
  tags?: string[];
  custom_fields?: Record<string, any>;
  due_date?: string;
  start_date?: string;
}

export interface TaskAssignmentInput {
  task_id: string;
  user_id: string;
  role?: string;
}

export interface TaskCommentInput {
  task_id: string;
  content: string;
  parent_comment_id?: string;
  comment_type?: string;
  mentions?: any[];
}

export interface TaskTimeLogInput {
  task_id: string;
  description?: string;
  hours_logged: number;
  logged_date?: string;
  started_at?: string;
  ended_at?: string;
  is_billable?: boolean;
}

export interface TaskLabelInput {
  team_id: string;
  name: string;
  color?: string;
  description?: string;
}

// Query and filter interfaces
export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  task_type?: TaskType[];
  assignee_id?: string[];
  created_by?: string[];
  labels?: string[];
  due_date_from?: string;
  due_date_to?: string;
  created_from?: string;
  created_to?: string;
  search?: string;
  project_id?: string;
  parent_task_id?: string;
  has_dependencies?: boolean;
  is_overdue?: boolean;
}

export interface TaskSortOptions {
  field: 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'status' | 'title';
  direction: 'asc' | 'desc';
}

export interface TaskQueryOptions {
  filters?: TaskFilters;
  sort?: TaskSortOptions;
  limit?: number;
  offset?: number;
  include_relations?: boolean;
}

// Analytics and reporting interfaces
export interface TaskAnalytics {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  average_completion_time: number;
  tasks_by_status: Record<TaskStatus, number>;
  tasks_by_priority: Record<TaskPriority, number>;
  tasks_by_type: Record<TaskType, number>;
  tasks_by_assignee: Record<string, number>;
  total_time_logged: number;
  productivity_score: number;
}

export interface UserTaskMetrics {
  user_id: string;
  assigned_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  average_completion_time: number;
  total_time_logged: number;
  productivity_score: number;
}

// Board and view interfaces
export interface TaskBoard {
  columns: TaskBoardColumn[];
  tasks: Task[];
  filters: TaskFilters;
}

export interface TaskBoardColumn {
  id: string;
  title: string;
  status: TaskStatus;
  color: string;
  order: number;
  task_count: number;
  wip_limit?: number;
}

// Notification interfaces
export interface TaskNotification {
  id: string;
  task_id: string;
  user_id: string;
  notification_type: 'task_assigned' | 'task_updated' | 'task_commented' | 'task_due' | 'task_completed';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  
  // Relations
  task?: {
    id: string;
    title: string;
    status: TaskStatus;
  };
}

// Error handling
export interface TaskError {
  code: string;
  message: string;
  field?: string;
}

export interface TaskValidationError extends TaskError {
  field: string;
  value: any;
}

// API Response interfaces
export interface TasksResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface TaskResponse {
  task: Task;
}

export interface TaskAnalyticsResponse {
  analytics: TaskAnalytics;
  user_metrics: UserTaskMetrics[];
}

// Real-time event interfaces
export interface TaskEvent {
  type: 'task_created' | 'task_updated' | 'task_deleted' | 'task_assigned' | 'task_commented';
  task_id: string;
  user_id: string;
  data: any;
  timestamp: string;
}

export interface TaskSubscription {
  team_id: string;
  task_ids?: string[];
  event_types?: TaskEvent['type'][];
  callback: (event: TaskEvent) => void;
}