import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaskManagementService } from '@/services/taskManagementService';
import type { Task, TaskCreateInput, TaskUpdateInput, TaskQueryOptions, TaskFilters } from '@/types/tasks';
import { useToast } from '@/hooks/use-toast';

export function useTaskManagement(teamId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Queries
  const useTasks = (options?: TaskQueryOptions) => 
    useQuery({
      queryKey: ['tasks', teamId, options],
      queryFn: () => TaskManagementService.getTasks({ ...options, filters: { ...options?.filters, team_id: teamId } }),
      enabled: !!teamId
    });

  const useTask = (taskId: string) =>
    useQuery({
      queryKey: ['task', taskId],
      queryFn: () => TaskManagementService.getTask(taskId),
      enabled: !!taskId
    });

  const useTaskAnalytics = (filters?: TaskFilters) =>
    useQuery({
      queryKey: ['task-analytics', teamId, filters],
      queryFn: () => TaskManagementService.getTaskAnalytics(teamId, filters),
      enabled: !!teamId
    });

  // Mutations
  const createTask = useMutation({
    mutationFn: (input: TaskCreateInput) => TaskManagementService.createTask({ ...input, team_id: teamId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', teamId] });
      toast({ title: 'Task created successfully' });
    },
    onError: () => toast({ title: 'Failed to create task', variant: 'destructive' })
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: TaskUpdateInput }) => 
      TaskManagementService.updateTask(taskId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', teamId] });
      toast({ title: 'Task updated successfully' });
    },
    onError: () => toast({ title: 'Failed to update task', variant: 'destructive' })
  });

  const deleteTask = useMutation({
    mutationFn: (taskId: string) => TaskManagementService.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', teamId] });
      toast({ title: 'Task deleted successfully' });
    },
    onError: () => toast({ title: 'Failed to delete task', variant: 'destructive' })
  });

  return {
    useTasks,
    useTask,
    useTaskAnalytics,
    createTask,
    updateTask,
    deleteTask
  };
}