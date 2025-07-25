import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts';
import { queryKeys } from '@/lib/queryClient';
import { 
  fetchUserProjects, 
  createProject, 
  updateProject, 
  deleteProject, 
  archiveProject, 
  restoreProject,
  fetchProjectAnalytics,
  fetchProjectTeamMembers,
  fetchProjectCompetitors
} from '@/services/projectService';
import { Project, ProjectCreationInput, ProjectUpdateInput } from '@/types/projects';
import { toast } from 'sonner';

/**
 * Hook to fetch all user projects with real-time updates
 */
export function useProjects() {
  const user = useUser();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.projects.user(user?.id || ''),
    queryFn: () => {
      if (!user?.id) throw new Error('User not authenticated');
      return fetchUserProjects(user.id);
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes for frequently updated data
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
        },
        (payload) => {
          console.log('Projects real-time update:', payload);
          
          // Invalidate and refetch projects when any project changes
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.user(user.id),
          });
          
          // Also invalidate specific project queries
          if (payload.eventType === 'UPDATE' && payload.new?.id) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.projects.detail(payload.new.id),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
}

/**
 * Hook to fetch single project details
 */
export function useProject(projectId: string | null) {
  const user = useUser();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.projects.detail(projectId || ''),
    queryFn: async () => {
      if (!user?.id || !projectId) throw new Error('Missing required parameters');
      
      // Get projects and find the specific one
      const projects = await fetchUserProjects(user.id);
      const project = projects.find(p => p.id === projectId);
      
      if (!project) throw new Error('Project not found');
      return project;
    },
    enabled: !!user?.id && !!projectId,
  });

  // Real-time subscription for specific project
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`project-${projectId}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`,
        },
        (payload) => {
          console.log('Project real-time update:', payload);
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.detail(projectId),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);

  return query;
}

/**
 * Hook to fetch project analytics
 */
export function useProjectAnalytics(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.projects.analytics(projectId || ''),
    queryFn: () => {
      if (!projectId) throw new Error('Project ID required');
      return fetchProjectAnalytics(projectId);
    },
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30 seconds for analytics
  });
}

/**
 * Hook to fetch project team members
 */
export function useProjectTeamMembers(projectId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.projects.teamMembers(projectId || ''),
    queryFn: () => {
      if (!projectId) throw new Error('Project ID required');
      return fetchProjectTeamMembers(projectId);
    },
    enabled: !!projectId,
  });

  // Real-time subscription for team member changes
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`project-${projectId}-team-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_team_members',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          console.log('Team members real-time update:', payload);
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.teamMembers(projectId),
          });
          // Also invalidate project analytics as team member count might change
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.analytics(projectId),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);

  return query;
}

/**
 * Hook to fetch project competitors
 */
export function useProjectCompetitors(projectId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.projects.competitors(projectId || ''),
    queryFn: () => {
      if (!projectId) throw new Error('Project ID required');
      return fetchProjectCompetitors(projectId);
    },
    enabled: !!projectId,
  });

  // Real-time subscription for competitor changes
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`project-${projectId}-competitors-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_competitors',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          console.log('Competitors real-time update:', payload);
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.competitors(projectId),
          });
          // Also invalidate project analytics as competitor count might change
          queryClient.invalidateQueries({
            queryKey: queryKeys.projects.analytics(projectId),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);

  return query;
}