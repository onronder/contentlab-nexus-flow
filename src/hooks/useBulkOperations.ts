import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts';
import { queryKeys } from '@/lib/queryClient';
import { Project } from '@/types/projects';
import { updateProject, archiveProject, deleteProject } from '@/services/projectService';
import { exportProjects } from '@/utils/exportUtils';
import { toast } from 'sonner';

/**
 * Hook for bulk operations on projects
 */
export function useBulkOperations() {
  const user = useUser();
  const queryClient = useQueryClient();

  // Bulk archive mutation
  const bulkArchiveMutation = useMutation({
    mutationFn: async (projectIds: string[]) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const results = await Promise.allSettled(
        projectIds.map(id => archiveProject(id, user.id))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      return { successful, failed, total: projectIds.length };
    },
    onSuccess: (results) => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.user(user.id),
        });
      }
      
      if (results.failed > 0) {
        toast.warning(`Archived ${results.successful} projects. ${results.failed} failed.`);
      } else {
        toast.success(`Successfully archived ${results.successful} projects.`);
      }
    },
    onError: () => {
      toast.error('Failed to archive projects. Please try again.');
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (projectIds: string[]) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const results = await Promise.allSettled(
        projectIds.map(id => deleteProject(id, user.id))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      return { successful, failed, total: projectIds.length };
    },
    onSuccess: (results) => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.user(user.id),
        });
      }
      
      if (results.failed > 0) {
        toast.warning(`Deleted ${results.successful} projects. ${results.failed} failed.`);
      } else {
        toast.success(`Successfully deleted ${results.successful} projects.`);
      }
    },
    onError: () => {
      toast.error('Failed to delete projects. Please try again.');
    },
  });

  // Bulk status change mutation
  const bulkStatusChangeMutation = useMutation({
    mutationFn: async ({ projectIds, status }: { projectIds: string[]; status: Project['status'] }) => {
      const results = await Promise.allSettled(
        projectIds.map(id => updateProject(id, { status }))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      return { successful, failed, total: projectIds.length, status };
    },
    onSuccess: (results) => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.user(user.id),
        });
      }
      
      if (results.failed > 0) {
        toast.warning(`Updated ${results.successful} projects to ${results.status}. ${results.failed} failed.`);
      } else {
        toast.success(`Successfully updated ${results.successful} projects to ${results.status}.`);
      }
    },
    onError: () => {
      toast.error('Failed to update project status. Please try again.');
    },
  });

  // Bulk operations handlers
  const handleBulkArchive = useCallback(
    (projectIds: string[]) => {
      if (projectIds.length === 0) return;
      bulkArchiveMutation.mutate(projectIds);
    },
    [bulkArchiveMutation]
  );

  const handleBulkDelete = useCallback(
    (projectIds: string[]) => {
      if (projectIds.length === 0) return;
      
      const confirmDelete = confirm(
        `Are you sure you want to delete ${projectIds.length} project(s)? This action cannot be undone.`
      );
      
      if (confirmDelete) {
        bulkDeleteMutation.mutate(projectIds);
      }
    },
    [bulkDeleteMutation]
  );

  const handleBulkStatusChange = useCallback(
    (projectIds: string[], status: Project['status']) => {
      if (projectIds.length === 0) return;
      bulkStatusChangeMutation.mutate({ projectIds, status });
    },
    [bulkStatusChangeMutation]
  );

  const handleBulkExport = useCallback(
    (projects: Project[]) => {
      if (projects.length === 0) return;
      
      try {
        exportProjects(projects, { format: 'csv' });
        toast.success(`Exported ${projects.length} projects successfully.`);
      } catch (error) {
        toast.error('Failed to export projects. Please try again.');
        console.error('Export error:', error);
      }
    },
    []
  );

  return {
    handleBulkArchive,
    handleBulkDelete,
    handleBulkStatusChange,
    handleBulkExport,
    isArchiving: bulkArchiveMutation.isPending,
    isDeleting: bulkDeleteMutation.isPending,
    isUpdatingStatus: bulkStatusChangeMutation.isPending,
  };
}