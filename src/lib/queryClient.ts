import { QueryClient, focusManager } from '@tanstack/react-query';

// Optimize focus manager for better performance
focusManager.setEventListener((handleFocus) => {
  // Only check focus every 100ms instead of every event
  let timeoutId: NodeJS.Timeout;
  
  if (typeof window !== 'undefined' && window.addEventListener) {
    const onFocus = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => handleFocus(true), 100);
    };
    
    const onBlur = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => handleFocus(false), 100);
    };
    
    window.addEventListener('visibilitychange', onFocus, false);
    window.addEventListener('focus', onFocus, false);
    window.addEventListener('blur', onBlur, false);
    
    return () => {
      window.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      clearTimeout(timeoutId);
    };
  }
  
  return () => {};
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Intelligent stale time based on data type
      staleTime: 10 * 60 * 1000, // 10 minutes default
      gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 408, 429
        if (error?.status >= 400 && error?.status < 500 && ![408, 429].includes(error?.status)) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      // Enable background refetching for better UX
      refetchInterval: false,
      refetchIntervalInBackground: false,
      // Reduce network requests with intelligent deduplication
      structuralSharing: true,
      // Enable optimistic updates
      notifyOnChangeProps: 'all',
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations on client errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      // Enable network mode for better offline support
      networkMode: 'online',
    },
  },
});

// Enhanced query keys factory with intelligent caching strategies
export const queryKeys = {
  projects: {
    all: ['projects'] as const,
    user: (userId: string) => ['projects', 'user', userId] as const,
    team: (userId: string, teamId?: string) => ['projects', 'team', userId, teamId] as const,
    list: (userId: string, filters?: Record<string, any>) => 
      ['projects', 'list', userId, filters] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
    analytics: (id: string, timeRange?: string) => 
      ['projects', 'analytics', id, timeRange] as const,
    teamMembers: (id: string) => ['projects', 'teamMembers', id] as const,
    competitors: (id: string) => ['projects', 'competitors', id] as const,
    activities: (id: string, limit?: number) => 
      ['projects', 'activities', id, limit] as const,
  },
  content: {
    all: ['content'] as const,
    team: (projectId: string, teamId?: string) => ['content', 'team', projectId, teamId] as const,
    project: (projectId: string, filters?: any) => ['content', 'project', projectId, filters] as const,
    analytics: (contentId: string) => ['content', 'analytics', contentId] as const,
  },
  teams: {
    all: ['teams'] as const,
    user: (userId: string) => ['teams', 'user', userId] as const,
    detail: (teamId: string) => ['teams', 'detail', teamId] as const,
    members: (teamId: string) => ['teamMembers', teamId] as const,
    stats: (teamId: string) => ['teamStats', teamId] as const,
  },
  competitors: {
    all: ['competitors'] as const,
    list: (projectId: string, filters?: any, sort?: any, page?: number, limit?: number) => 
      ['competitors', 'list', projectId, filters, sort, page, limit] as const,
    detail: (competitorId: string) => ['competitors', 'detail', competitorId] as const,
    analytics: (competitorId: string) => ['competitors', 'analytics', competitorId] as const,
    search: (projectId: string, searchTerm: string, filters?: any) => 
      ['competitors', 'search', projectId, searchTerm, filters] as const,
    forAnalysis: (projectId: string) => ['competitors', 'forAnalysis', projectId] as const,
  },
  // Team switching invalidation patterns
  invalidateTeamData: () => ({ queryKey: ['projects', 'team'] }),
  invalidateTeamContent: () => ({ queryKey: ['content', 'team'] }),
  invalidateTeamInfo: () => ({ queryKey: ['teams'] }),
  // Legacy helpers
  invalidateUserProjects: (userId: string) => ['projects', 'user', userId],
  invalidateProjectDetails: (projectId: string) => ['projects', 'detail', projectId],
  invalidateProjectAnalytics: (projectId: string) => ['projects', 'analytics', projectId],
  invalidateProjectCompetitors: (projectId: string) => ['competitors', 'list', projectId],
};

// Performance monitoring utilities
export const performanceMonitor = {
  startTimer: (label: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${label}-start`);
    }
  },
  
  endTimer: (label: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${label}-end`);
      window.performance.measure(label, `${label}-start`, `${label}-end`);
    }
  },
  
  logMetrics: () => {
    if (typeof window !== 'undefined' && window.performance) {
      const measures = window.performance.getEntriesByType('measure');
      measures.forEach(measure => {
        console.log(`Performance: ${measure.name} took ${measure.duration.toFixed(2)}ms`);
      });
    }
  }
};