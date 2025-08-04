import { supabase } from '@/integrations/supabase/client';
import type { 
  Task, 
  TaskCreateInput, 
  TaskUpdateInput, 
  TaskFilters, 
  TaskSortOptions, 
  TaskQueryOptions,
  TasksResponse,
  TaskAnalytics,
  TaskAssignment,
  TaskAssignmentInput,
  TaskComment,
  TaskCommentInput,
  TaskTimeLog,
  TaskTimeLogInput,
  TaskLabel,
  TaskLabelInput
} from '@/types/tasks';

// Simple logger for task management
const logger = {
  info: (message: string, meta?: any) => console.log(`[TaskService] ${message}`, meta),
  error: (message: string, meta?: any) => console.error(`[TaskService] ${message}`, meta),
  warn: (message: string, meta?: any) => console.warn(`[TaskService] ${message}`, meta),
};

export class TaskManagementService {
  // Core task CRUD operations
  static async createTask(input: TaskCreateInput): Promise<Task> {
    try {
      const user = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('team_tasks')
        .insert({
          ...input,
          created_by: user.data.user?.id
        })
        .select('*')
        .single();

      if (error) {
        logger.error('Failed to create task', { error, input });
        throw new Error(`Failed to create task: ${error.message}`);
      }

      logger.info('Task created successfully', { taskId: data.id, title: data.title });
      return data as unknown as Task;
    } catch (error) {
      logger.error('Error in createTask', { error, input });
      throw error;
    }
  }

  static async getTask(taskId: string): Promise<Task | null> {
    try {
      const { data, error } = await supabase
        .from('team_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Failed to fetch task', { error, taskId });
        throw new Error(`Failed to fetch task: ${error.message}`);
      }

      return data as unknown as Task || null;
    } catch (error) {
      logger.error('Error in getTask', { error, taskId });
      throw error;
    }
  }

  static async updateTask(taskId: string, input: TaskUpdateInput): Promise<Task> {
    try {
      const { data, error } = await supabase
        .from('team_tasks')
        .update(input)
        .eq('id', taskId)
        .select('*')
        .single();

      if (error) {
        logger.error('Failed to update task', { error, taskId, input });
        throw new Error(`Failed to update task: ${error.message}`);
      }

      logger.info('Task updated successfully', { taskId, updates: Object.keys(input) });
      return data as unknown as Task;
    } catch (error) {
      logger.error('Error in updateTask', { error, taskId, input });
      throw error;
    }
  }

  static async deleteTask(taskId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('team_tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        logger.error('Failed to delete task', { error, taskId });
        throw new Error(`Failed to delete task: ${error.message}`);
      }

      logger.info('Task deleted successfully', { taskId });
    } catch (error) {
      logger.error('Error in deleteTask', { error, taskId });
      throw error;
    }
  }

  static async getTasks(options: TaskQueryOptions = {}): Promise<TasksResponse> {
    try {
      const { filters = {}, sort = { field: 'created_at', direction: 'desc' }, limit = 50, offset = 0 } = options;

      let query = supabase
        .from('team_tasks')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }
      
      if (filters.priority?.length) {
        query = query.in('priority', filters.priority);
      }
      
      if (filters.task_type?.length) {
        query = query.in('task_type', filters.task_type);
      }
      
      if (filters.assignee_id?.length) {
        query = query.in('assignee_id', filters.assignee_id);
      }
      
      if (filters.created_by?.length) {
        query = query.in('created_by', filters.created_by);
      }
      
      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      
      if (filters.parent_task_id) {
        query = query.eq('parent_task_id', filters.parent_task_id);
      }
      
      if (filters.due_date_from) {
        query = query.gte('due_date', filters.due_date_from);
      }
      
      if (filters.due_date_to) {
        query = query.lte('due_date', filters.due_date_to);
      }
      
      if (filters.created_from) {
        query = query.gte('created_at', filters.created_from);
      }
      
      if (filters.created_to) {
        query = query.lte('created_at', filters.created_to);
      }
      
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      
      if (filters.is_overdue) {
        query = query.lt('due_date', new Date().toISOString())
                     .neq('status', 'done')
                     .neq('status', 'cancelled');
      }

      // Filter out archived tasks by default
      query = query.is('archived_at', null);

      // Apply sorting
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to fetch tasks', { error, options });
        throw new Error(`Failed to fetch tasks: ${error.message}`);
      }

      const total = count || 0;
      const page = Math.floor(offset / limit) + 1;

      return {
        tasks: (data as unknown as Task[]) || [],
        total,
        page,
        limit,
        has_more: offset + limit < total
      };
    } catch (error) {
      logger.error('Error in getTasks', { error, options });
      throw error;
    }
  }

  // Task assignments
  static async assignTask(input: TaskAssignmentInput): Promise<TaskAssignment> {
    try {
      const user = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('task_assignments')
        .insert({
          ...input,
          assigned_by: user.data.user?.id
        })
        .select('*')
        .single();

      if (error) {
        logger.error('Failed to assign task', { error, input });
        throw new Error(`Failed to assign task: ${error.message}`);
      }

      logger.info('Task assigned successfully', { taskId: input.task_id, userId: input.user_id });
      return data as unknown as TaskAssignment;
    } catch (error) {
      logger.error('Error in assignTask', { error, input });
      throw error;
    }
  }

  static async unassignTask(taskId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to unassign task', { error, taskId, userId });
        throw new Error(`Failed to unassign task: ${error.message}`);
      }

      logger.info('Task unassigned successfully', { taskId, userId });
    } catch (error) {
      logger.error('Error in unassignTask', { error, taskId, userId });
      throw error;
    }
  }

  // Task comments
  static async addComment(input: TaskCommentInput): Promise<TaskComment> {
    try {
      const user = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          ...input,
          user_id: user.data.user?.id
        })
        .select('*')
        .single();

      if (error) {
        logger.error('Failed to add comment', { error, input });
        throw new Error(`Failed to add comment: ${error.message}`);
      }

      logger.info('Comment added successfully', { taskId: input.task_id, commentId: data.id });
      return data as unknown as TaskComment;
    } catch (error) {
      logger.error('Error in addComment', { error, input });
      throw error;
    }
  }

  static async updateComment(commentId: string, content: string): Promise<TaskComment> {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .update({ content })
        .eq('id', commentId)
        .select('*')
        .single();

      if (error) {
        logger.error('Failed to update comment', { error, commentId });
        throw new Error(`Failed to update comment: ${error.message}`);
      }

      logger.info('Comment updated successfully', { commentId });
      return data as unknown as TaskComment;
    } catch (error) {
      logger.error('Error in updateComment', { error, commentId });
      throw error;
    }
  }

  static async deleteComment(commentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        logger.error('Failed to delete comment', { error, commentId });
        throw new Error(`Failed to delete comment: ${error.message}`);
      }

      logger.info('Comment deleted successfully', { commentId });
    } catch (error) {
      logger.error('Error in deleteComment', { error, commentId });
      throw error;
    }
  }

  // Time tracking
  static async logTime(input: TaskTimeLogInput): Promise<TaskTimeLog> {
    try {
      const user = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('task_time_tracking')
        .insert({
          ...input,
          user_id: user.data.user?.id
        })
        .select('*')
        .single();

      if (error) {
        logger.error('Failed to log time', { error, input });
        throw new Error(`Failed to log time: ${error.message}`);
      }

      // Update task actual hours
      await this.updateTaskActualHours(input.task_id);

      logger.info('Time logged successfully', { taskId: input.task_id, hours: input.hours_logged });
      return data as unknown as TaskTimeLog;
    } catch (error) {
      logger.error('Error in logTime', { error, input });
      throw error;
    }
  }

  // Task labels
  static async createLabel(input: TaskLabelInput): Promise<TaskLabel> {
    try {
      const user = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('task_labels')
        .insert({
          ...input,
          created_by: user.data.user?.id
        })
        .select('*')
        .single();

      if (error) {
        logger.error('Failed to create label', { error, input });
        throw new Error(`Failed to create label: ${error.message}`);
      }

      logger.info('Label created successfully', { labelId: data.id, name: data.name });
      return data as unknown as TaskLabel;
    } catch (error) {
      logger.error('Error in createLabel', { error, input });
      throw error;
    }
  }

  static async getTeamLabels(teamId: string): Promise<TaskLabel[]> {
    try {
      const { data, error } = await supabase
        .from('task_labels')
        .select('*')
        .eq('team_id', teamId)
        .order('name');

      if (error) {
        logger.error('Failed to fetch team labels', { error, teamId });
        throw new Error(`Failed to fetch team labels: ${error.message}`);
      }

      return (data as unknown as TaskLabel[]) || [];
    } catch (error) {
      logger.error('Error in getTeamLabels', { error, teamId });
      throw error;
    }
  }

  static async assignLabelToTask(taskId: string, labelId: string): Promise<void> {
    try {
      const user = await supabase.auth.getUser();
      const { error } = await supabase
        .from('task_label_assignments')
        .insert({
          task_id: taskId,
          label_id: labelId,
          assigned_by: user.data.user?.id
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        logger.error('Failed to assign label to task', { error, taskId, labelId });
        throw new Error(`Failed to assign label to task: ${error.message}`);
      }

      logger.info('Label assigned to task successfully', { taskId, labelId });
    } catch (error) {
      logger.error('Error in assignLabelToTask', { error, taskId, labelId });
      throw error;
    }
  }

  static async removeLabelFromTask(taskId: string, labelId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('task_label_assignments')
        .delete()
        .eq('task_id', taskId)
        .eq('label_id', labelId);

      if (error) {
        logger.error('Failed to remove label from task', { error, taskId, labelId });
        throw new Error(`Failed to remove label from task: ${error.message}`);
      }

      logger.info('Label removed from task successfully', { taskId, labelId });
    } catch (error) {
      logger.error('Error in removeLabelFromTask', { error, taskId, labelId });
      throw error;
    }
  }

  // Task watchers
  static async addWatcher(taskId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('task_watchers')
        .insert({
          task_id: taskId,
          user_id: userId
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        logger.error('Failed to add watcher', { error, taskId, userId });
        throw new Error(`Failed to add watcher: ${error.message}`);
      }

      logger.info('Watcher added successfully', { taskId, userId });
    } catch (error) {
      logger.error('Error in addWatcher', { error, taskId, userId });
      throw error;
    }
  }

  static async removeWatcher(taskId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('task_watchers')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to remove watcher', { error, taskId, userId });
        throw new Error(`Failed to remove watcher: ${error.message}`);
      }

      logger.info('Watcher removed successfully', { taskId, userId });
    } catch (error) {
      logger.error('Error in removeWatcher', { error, taskId, userId });
      throw error;
    }
  }

  // Analytics
  static async getTaskAnalytics(teamId: string, filters?: TaskFilters): Promise<TaskAnalytics> {
    try {
      let query = supabase
        .from('team_tasks')
        .select('*')
        .eq('team_id', teamId)
        .is('archived_at', null);

      // Apply filters if provided
      if (filters) {
        if (filters.project_id) {
          query = query.eq('project_id', filters.project_id);
        }
        if (filters.created_from) {
          query = query.gte('created_at', filters.created_from);
        }
        if (filters.created_to) {
          query = query.lte('created_at', filters.created_to);
        }
      }

      const { data: tasks, error } = await query;

      if (error) {
        logger.error('Failed to fetch task analytics', { error, teamId });
        throw new Error(`Failed to fetch task analytics: ${error.message}`);
      }

      // Calculate analytics
      const totalTasks = tasks?.length || 0;
      const completedTasks = tasks?.filter(t => t.status === 'done').length || 0;
      const inProgressTasks = tasks?.filter(t => t.status === 'in_progress').length || 0;
      const overdueTasks = tasks?.filter(t => 
        t.due_date && 
        new Date(t.due_date) < new Date() && 
        t.status !== 'done' && 
        t.status !== 'cancelled'
      ).length || 0;

      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Calculate average completion time
      const completedTasksWithDates = tasks?.filter(t => 
        t.status === 'done' && t.completed_at && t.created_at
      ) || [];
      
      const averageCompletionTime = completedTasksWithDates.length > 0
        ? completedTasksWithDates.reduce((acc, task) => {
            const created = new Date(task.created_at).getTime();
            const completed = new Date(task.completed_at!).getTime();
            return acc + (completed - created) / (1000 * 60 * 60 * 24); // days
          }, 0) / completedTasksWithDates.length
        : 0;

      // Group by status, priority, type, assignee
      const tasksByStatus = tasks?.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const tasksByPriority = tasks?.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const tasksByType = tasks?.reduce((acc, task) => {
        acc[task.task_type] = (acc[task.task_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const tasksByAssignee = tasks?.reduce((acc, task) => {
        if (task.assignee_id) {
          acc[task.assignee_id] = (acc[task.assignee_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      // Get total time logged
      const { data: timeLogs } = await supabase
        .from('task_time_tracking')
        .select('hours_logged')
        .in('task_id', tasks?.map(t => t.id) || []);

      const totalTimeLogged = timeLogs?.reduce((acc, log) => acc + log.hours_logged, 0) || 0;

      // Calculate productivity score (simplified)
      const productivityScore = Math.min(100, Math.round(
        (completionRate * 0.4) + 
        ((totalTasks - overdueTasks) / Math.max(totalTasks, 1) * 100 * 0.3) +
        (Math.min(averageCompletionTime > 0 ? 10 / averageCompletionTime : 10, 10) * 3) // faster completion = higher score
      ));

      return {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        in_progress_tasks: inProgressTasks,
        overdue_tasks: overdueTasks,
        completion_rate: completionRate,
        average_completion_time: averageCompletionTime,
        tasks_by_status: tasksByStatus as any,
        tasks_by_priority: tasksByPriority as any,
        tasks_by_type: tasksByType as any,
        tasks_by_assignee: tasksByAssignee,
        total_time_logged: totalTimeLogged,
        productivity_score: productivityScore
      };
    } catch (error) {
      logger.error('Error in getTaskAnalytics', { error, teamId });
      throw error;
    }
  }

  // Helper methods
  private static async updateTaskActualHours(taskId: string): Promise<void> {
    try {
      const { data: timeLogs } = await supabase
        .from('task_time_tracking')
        .select('hours_logged')
        .eq('task_id', taskId);

      const totalHours = timeLogs?.reduce((acc, log) => acc + log.hours_logged, 0) || 0;

      await supabase
        .from('team_tasks')
        .update({ actual_hours: totalHours })
        .eq('id', taskId);
    } catch (error) {
      logger.error('Error updating task actual hours', { error, taskId });
    }
  }

  static async bulkUpdateTasks(taskIds: string[], updates: Partial<TaskUpdateInput>): Promise<void> {
    try {
      const { error } = await supabase
        .from('team_tasks')
        .update(updates)
        .in('id', taskIds);

      if (error) {
        logger.error('Failed to bulk update tasks', { error, taskIds, updates });
        throw new Error(`Failed to bulk update tasks: ${error.message}`);
      }

      logger.info('Tasks bulk updated successfully', { count: taskIds.length, updates: Object.keys(updates) });
    } catch (error) {
      logger.error('Error in bulkUpdateTasks', { error, taskIds, updates });
      throw error;
    }
  }

  static async duplicateTask(taskId: string, overrides: Partial<TaskCreateInput> = {}): Promise<Task> {
    try {
      const originalTask = await this.getTask(taskId);
      if (!originalTask) {
        throw new Error('Task not found');
      }

      const { id, created_at, updated_at, completed_at, archived_at, actual_hours, ...taskData } = originalTask;
      
      const duplicatedTask = await this.createTask({
        ...taskData,
        title: `${taskData.title} (Copy)`,
        status: 'backlog',
        assignee_id: undefined,
        ...overrides
      });

      logger.info('Task duplicated successfully', { originalId: taskId, newId: duplicatedTask.id });
      return duplicatedTask;
    } catch (error) {
      logger.error('Error in duplicateTask', { error, taskId });
      throw error;
    }
  }
}