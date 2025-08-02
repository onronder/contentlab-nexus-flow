import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser, useSession } from '@/contexts';
import { queryKeys } from '@/lib/queryClient';
import { 
  createProject, 
  updateProject, 
  deleteProject, 
  archiveProject, 
  restoreProject 
} from '@/services/projectService';
import { Project, ProjectCreationInput, ProjectUpdateInput } from '@/types/projects';
import { toast } from 'sonner';
import { devLog, logError } from '@/utils/productionUtils';

/**
 * Hook to create a new project with optimistic updates
 */
export function useCreateProject() {
  const user = useUser();
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectData: ProjectCreationInput) => {
      devLog('Creating project mutation started');
      devLog('User:', !!user?.id, user?.id);
      devLog('Session:', !!session, session?.access_token ? 'has token' : 'no token');
      
      if (!user?.id) throw new Error('User not authenticated');
      if (!session) throw new Error('No session available');
      if (!session.access_token) throw new Error('Session missing access token');
      
      return createProject(user.id, projectData, session);
    },
    onMutate: async (newProject) => {
      if (!user?.id) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.user(user.id),
      });

      // Snapshot previous value
      const previousProjects = queryClient.getQueryData<Project[]>(
        queryKeys.projects.user(user.id)
      );

      // Optimistically update to the new value
      const optimisticProject: Project = {
        id: `temp-${Date.now()}`,
        name: newProject.name,
        description: newProject.description || '',
        industry: newProject.industry,
        projectType: newProject.projectType,
        targetMarket: newProject.targetMarket || '',
        primaryObjectives: newProject.primaryObjectives,
        successMetrics: newProject.successMetrics,
        status: 'planning',
        priority: 'medium',
        startDate: newProject.startDate,
        targetEndDate: newProject.targetEndDate,
        actualEndDate: undefined,
        isPublic: newProject.isPublic,
        allowTeamAccess: newProject.allowTeamAccess,
        autoAnalysisEnabled: newProject.autoAnalysisEnabled,
        notificationSettings: newProject.notificationSettings,
        customFields: newProject.customFields,
        tags: newProject.tags,
        createdBy: user.id,
        organizationId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        competitorCount: 0,
        analysisCount: 0,
        teamMemberCount: 1,
      };

      queryClient.setQueryData<Project[]>(
        queryKeys.projects.user(user.id),
        (old = []) => [optimisticProject, ...old]
      );

      return { previousProjects };
    },
    onError: (err, newProject, context) => {
      // Roll back on error
      if (user?.id && context?.previousProjects) {
        queryClient.setQueryData(
          queryKeys.projects.user(user.id),
          context.previousProjects
        );
      }
      toast.error('Failed to create project. Please try again.');
      logError(err as Error, 'useCreateProject');
    },
    onSuccess: (data) => {
      toast.success('Project created successfully!');
      
      // Invalidate and refetch
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.user(user.id),
        });
      }
    },
  });
}

/**
 * Hook to update a project with optimistic updates
 */
export function useUpdateProject() {
  const user = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, updates }: { projectId: string; updates: Partial<ProjectUpdateInput> }) => {
      return updateProject(projectId, updates);
    },
    onMutate: async ({ projectId, updates }) => {
      if (!user?.id) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.user(user.id),
      });

      // Snapshot previous values
      const previousProject = queryClient.getQueryData<Project>(
        queryKeys.projects.detail(projectId)
      );
      const previousProjects = queryClient.getQueryData<Project[]>(
        queryKeys.projects.user(user.id)
      );

      // Optimistically update project details
      if (previousProject) {
        const updatedProject = { ...previousProject, ...updates, updatedAt: new Date() };
        queryClient.setQueryData(
          queryKeys.projects.detail(projectId),
          updatedProject
        );
      }

      // Optimistically update projects list
      if (previousProjects) {
        const updatedProjects = previousProjects.map(project =>
          project.id === projectId 
            ? { ...project, ...updates, updatedAt: new Date() }
            : project
        );
        queryClient.setQueryData(
          queryKeys.projects.user(user.id),
          updatedProjects
        );
      }

      return { previousProject, previousProjects };
    },
    onError: (err, { projectId }, context) => {
      // Roll back on error
      if (user?.id && context) {
        if (context.previousProject) {
          queryClient.setQueryData(
            queryKeys.projects.detail(projectId),
            context.previousProject
          );
        }
        if (context.previousProjects) {
          queryClient.setQueryData(
            queryKeys.projects.user(user.id),
            context.previousProjects
          );
        }
      }
      toast.error('Failed to update project. Please try again.');
      logError(err as Error, 'useUpdateProject');
    },
    onSuccess: (data, { projectId }) => {
      toast.success('Project updated successfully!');
      
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.user(user.id),
        });
      }
    },
  });
}

/**
 * Hook to delete a project
 */
export function useDeleteProject() {
  const user = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return deleteProject(projectId, user.id);
    },
    onMutate: async (projectId) => {
      if (!user?.id) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.user(user.id),
      });

      // Snapshot previous value
      const previousProjects = queryClient.getQueryData<Project[]>(
        queryKeys.projects.user(user.id)
      );

      // Optimistically remove from list
      queryClient.setQueryData<Project[]>(
        queryKeys.projects.user(user.id),
        (old = []) => old.filter(project => project.id !== projectId)
      );

      return { previousProjects };
    },
    onError: (err, projectId, context) => {
      // Roll back on error
      if (user?.id && context?.previousProjects) {
        queryClient.setQueryData(
          queryKeys.projects.user(user.id),
          context.previousProjects
        );
      }
      toast.error('Failed to delete project. Please try again.');
      logError(err as Error, 'useDeleteProject');
    },
    onSuccess: (_, projectId) => {
      toast.success('Project deleted successfully.');
      
      // Remove specific project query
      queryClient.removeQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
      
      // Invalidate user projects
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.user(user.id),
        });
      }
    },
  });
}

/**
 * Hook to archive a project
 */
export function useArchiveProject() {
  const user = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return archiveProject(projectId, user.id);
    },
    onMutate: async (projectId) => {
      if (!user?.id) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.user(user.id),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });

      // Snapshot previous values
      const previousProjects = queryClient.getQueryData<Project[]>(
        queryKeys.projects.user(user.id)
      );
      const previousProject = queryClient.getQueryData<Project>(
        queryKeys.projects.detail(projectId)
      );

      // Optimistically update status to archived
      if (previousProjects) {
        const updatedProjects = previousProjects.map(project =>
          project.id === projectId 
            ? { ...project, status: 'archived' as const, updatedAt: new Date() }
            : project
        );
        queryClient.setQueryData(
          queryKeys.projects.user(user.id),
          updatedProjects
        );
      }

      if (previousProject) {
        queryClient.setQueryData(
          queryKeys.projects.detail(projectId),
          { ...previousProject, status: 'archived' as const, updatedAt: new Date() }
        );
      }

      return { previousProjects, previousProject };
    },
    onError: (err, projectId, context) => {
      // Roll back on error
      if (user?.id && context) {
        if (context.previousProjects) {
          queryClient.setQueryData(
            queryKeys.projects.user(user.id),
            context.previousProjects
          );
        }
        if (context.previousProject) {
          queryClient.setQueryData(
            queryKeys.projects.detail(projectId),
            context.previousProject
          );
        }
      }
      toast.error('Failed to archive project. Please try again.');
      logError(err as Error, 'useArchiveProject');
    },
    onSuccess: (data) => {
      toast.success('Project archived successfully.');
      
      // Invalidate related queries
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.user(user.id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(data.id),
      });
    },
  });
}

/**
 * Hook to restore an archived project
 */
export function useRestoreProject() {
  const user = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return restoreProject(projectId, user.id);
    },
    onSuccess: (data) => {
      toast.success('Project restored successfully.');
      
      // Invalidate related queries
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.user(user.id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(data.id),
      });
    },
    onError: (err) => {
      toast.error('Failed to restore project. Please try again.');
      logError(err as Error, 'useRestoreProject');
    },
  });
}