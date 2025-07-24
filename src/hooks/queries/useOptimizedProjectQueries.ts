import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys, performanceMonitor } from '@/lib/queryClient';
import { fetchUserProjects, fetchProjectAnalytics, fetchProjectTeamMembers, fetchProjectCompetitors } from '@/services/projectService';
import { Project } from '@/types/projects';

// Debounce utility for real-time subscriptions
function useDebounce(callback: (...args: any[]) => void, delay: number) {
  const debouncedCallback = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => callback(...args), delay);
    };
  }, [callback, delay]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
    };
  }, []);

  return debouncedCallback;
}

/**
 * Optimized hook to fetch all user projects with intelligent caching
 */
export function useOptimizedProjects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.projects.user(user?.id || ''),
    queryFn: async () => {
      performanceMonitor.startTimer('fetch-user-projects');
      
      if (!user?.id) throw new Error('User not authenticated');
      const projects = await fetchUserProjects(user.id);
      
      performanceMonitor.endTimer('fetch-user-projects');
      return projects;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes for project list
    gcTime: 15 * 60 * 1000, // 15 minutes garbage collection
    // Enable background refetching
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes in background
    refetchIntervalInBackground: true,
  });

  // Optimized real-time subscription with debouncing
  const debouncedInvalidation = useDebounce((payload: any) => {
    console.log('Projects real-time update (debounced):', payload);
    
    // Smart invalidation - only invalidate relevant queries
    if (payload.eventType === 'UPDATE' && payload.new?.id) {
      // Update specific project in cache optimistically
      queryClient.setQueryData(
        queryKeys.projects.detail(payload.new.id),
        (oldData: Project | undefined) => {
          if (oldData) {
            return { ...oldData, ...payload.new, updatedAt: new Date() };
          }
          return oldData;
        }
      );
    }
    
    // Invalidate user projects list
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.user(user?.id || ''),
      exact: false
    });
  }, 300); // 300ms debounce

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('optimized-projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
        },
        debouncedInvalidation
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, debouncedInvalidation]);

  // Prefetch project details for better UX
  const prefetchProjectDetails = useCallback((projectId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.projects.detail(projectId),
      queryFn: async () => {
        const projects = await fetchUserProjects(user?.id || '');
        return projects.find(p => p.id === projectId);
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  }, [queryClient, user?.id]);

  return {
    ...query,
    prefetchProjectDetails,
  };
}

/**
 * Optimized single project hook with smart caching
 */
export function useOptimizedProject(projectId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.projects.detail(projectId || ''),
    queryFn: async () => {
      performanceMonitor.startTimer('fetch-project-detail');
      
      if (!user?.id || !projectId) throw new Error('Missing required parameters');
      
      // Try to get from cache first
      const cachedProjects = queryClient.getQueryData(
        queryKeys.projects.user(user.id)
      ) as Project[] | undefined;
      
      if (cachedProjects) {
        const cachedProject = cachedProjects.find(p => p.id === projectId);
        if (cachedProject) {
          performanceMonitor.endTimer('fetch-project-detail');
          return cachedProject;
        }
      }
      
      // Fallback to fetching
      const projects = await fetchUserProjects(user.id);
      const project = projects.find(p => p.id === projectId);
      
      if (!project) throw new Error('Project not found');
      
      performanceMonitor.endTimer('fetch-project-detail');
      return project;
    },
    enabled: !!user?.id && !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes for single project
  });

  // Optimized real-time subscription for specific project
  const debouncedProjectUpdate = useDebounce((payload: any) => {
    if (payload.new?.id === projectId) {
      queryClient.setQueryData(
        queryKeys.projects.detail(projectId),
        (oldData: Project | undefined) => {
          if (oldData) {
            return { ...oldData, ...payload.new, updatedAt: new Date() };
          }
          return oldData;
        }
      );
    }
  }, 200);

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`optimized-project-${projectId}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`,
        },
        debouncedProjectUpdate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, debouncedProjectUpdate]);

  return query;
}

/**
 * Optimized project analytics with intelligent stale time
 */
export function useOptimizedProjectAnalytics(projectId: string | null, timeRange?: string) {
  return useQuery({
    queryKey: queryKeys.projects.analytics(projectId || '', timeRange),
    queryFn: async () => {
      performanceMonitor.startTimer('fetch-project-analytics');
      
      if (!projectId) throw new Error('Project ID required');
      const analytics = await fetchProjectAnalytics(projectId);
      
      performanceMonitor.endTimer('fetch-project-analytics');
      return analytics;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes for analytics (more dynamic)
    gcTime: 10 * 60 * 1000,
    // Background refetch for live analytics
    refetchInterval: 60 * 1000, // 1 minute
    refetchIntervalInBackground: true,
  });
}

/**
 * Optimized team members with real-time updates
 */
export function useOptimizedProjectTeamMembers(projectId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.projects.teamMembers(projectId || ''),
    queryFn: async () => {
      performanceMonitor.startTimer('fetch-team-members');
      
      if (!projectId) throw new Error('Project ID required');
      const members = await fetchProjectTeamMembers(projectId);
      
      performanceMonitor.endTimer('fetch-team-members');
      return members;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Optimized real-time subscription
  const debouncedTeamUpdate = useDebounce(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.teamMembers(projectId || ''),
    });
    // Also invalidate analytics as team count affects it
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.analytics(projectId || ''),
    });
  }, 500);

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`optimized-team-${projectId}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_team_members',
          filter: `project_id=eq.${projectId}`,
        },
        debouncedTeamUpdate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, debouncedTeamUpdate]);

  return query;
}

/**
 * Optimized competitors with background sync
 */
export function useOptimizedProjectCompetitors(projectId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.projects.competitors(projectId || ''),
    queryFn: async () => {
      performanceMonitor.startTimer('fetch-competitors');
      
      if (!projectId) throw new Error('Project ID required');
      const competitors = await fetchProjectCompetitors(projectId);
      
      performanceMonitor.endTimer('fetch-competitors');
      return competitors;
    },
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes for competitors
    // Background refetch
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    refetchIntervalInBackground: false,
  });

  // Optimized real-time subscription
  const debouncedCompetitorUpdate = useDebounce(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.competitors(projectId || ''),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.analytics(projectId || ''),
    });
  }, 1000); // 1 second debounce for competitors

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`optimized-competitors-${projectId}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_competitors',
          filter: `project_id=eq.${projectId}`,
        },
        debouncedCompetitorUpdate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, debouncedCompetitorUpdate]);

  return query;
}

/**
 * Infinite query for large project lists with virtual scrolling support
 */
export function useInfiniteProjects(pageSize = 20) {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['projects', 'infinite', user?.id, pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      performanceMonitor.startTimer('fetch-infinite-projects');
      
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .or(`created_by.eq.${user.id},project_team_members.user_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })
        .range(pageParam * pageSize, (pageParam + 1) * pageSize - 1);

      if (error) throw error;
      
      performanceMonitor.endTimer('fetch-infinite-projects');
      return {
        projects: data || [],
        nextPage: data && data.length === pageSize ? pageParam + 1 : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}