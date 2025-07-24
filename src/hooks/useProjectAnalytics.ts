import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { analyticsService, ProjectAnalyticsData, AnalyticsServiceError } from '@/services/analyticsService';
import { useCurrentUserId } from '@/hooks';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/queryClient';

const ANALYTICS_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const ANALYTICS_CACHE_TIME = 10 * 60 * 1000; // 10 minutes

export function useProjectAnalytics() {
  const currentUserId = useCurrentUserId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.projects.analytics(currentUserId || 'anonymous'),
    queryFn: async (): Promise<ProjectAnalyticsData> => {
      if (!currentUserId) {
        throw new AnalyticsServiceError('NO_USER', 'User not authenticated');
      }
      
      try {
        return await analyticsService.fetchComprehensiveAnalytics(currentUserId);
      } catch (error) {
        if (error instanceof AnalyticsServiceError) {
          // Log specific analytics errors for debugging
          console.error(`Analytics Error [${error.code}]:`, error.message, error.details);
          
          // Only show toasts for critical errors, not empty data states
          switch (error.code) {
            case 'NO_DATA':
              // Don't show toast for no data - handle this gracefully in UI
              console.log('No analytics data available - user has no projects yet');
              break;
            case 'QUERY_ERROR':
              toast({
                title: "Data Loading Error",
                description: "Failed to load analytics data. Please try again.",
                variant: "destructive"
              });
              break;
            default:
              toast({
                title: "Analytics Error",
                description: "An error occurred while loading analytics. Please refresh the page.",
                variant: "destructive"
              });
          }
        }
        throw error;
      }
    },
    enabled: !!currentUserId,
    staleTime: ANALYTICS_STALE_TIME,
    gcTime: ANALYTICS_CACHE_TIME,
    retry: (failureCount, error) => {
      // Don't retry on authentication or no data errors
      if (error instanceof AnalyticsServiceError && ['NO_USER', 'NO_DATA'].includes(error.code)) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    meta: {
      errorMessage: 'Failed to load project analytics'
    }
  });

  // Manual refresh function with user feedback
  const refreshAnalytics = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projects.analytics(currentUserId || 'anonymous')
      });
      
      toast({
        title: "Analytics Refreshed",
        description: "Analytics data has been updated with the latest information.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error refreshing analytics:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh analytics data. Please try again.",
        variant: "destructive"
      });
    }
  }, [currentUserId, queryClient, toast]);

  // Check if data is stale and needs refresh
  const isDataStale = useCallback(() => {
    const queryState = queryClient.getQueryState(
      queryKeys.projects.analytics(currentUserId || 'anonymous')
    );
    
    if (!queryState?.dataUpdatedAt) return true;
    
    const now = Date.now();
    return (now - queryState.dataUpdatedAt) > ANALYTICS_STALE_TIME;
  }, [currentUserId, queryClient]);

  // Get last updated time
  const getLastUpdated = useCallback(() => {
    const queryState = queryClient.getQueryState(
      queryKeys.projects.analytics(currentUserId || 'anonymous')
    );
    
    return queryState?.dataUpdatedAt ? new Date(queryState.dataUpdatedAt) : null;
  }, [currentUserId, queryClient]);

  // Error handling utilities
  const getErrorMessage = useCallback((error: unknown): string => {
    if (error instanceof AnalyticsServiceError) {
      switch (error.code) {
        case 'NO_USER':
          return 'Please sign in to view analytics';
        case 'NO_DATA':
          return 'No projects found. Create your first project to see analytics.';
        case 'QUERY_ERROR':
          return 'Failed to load analytics data. Please check your connection and try again.';
        default:
          return 'An unexpected error occurred while loading analytics.';
      }
    }
    
    return 'Failed to load analytics data. Please try again.';
  }, []);

  const hasError = !!query.error;
  const errorMessage = query.error ? getErrorMessage(query.error) : null;

  // Analytics data with safe defaults for missing data
  const analytics: ProjectAnalyticsData | null = query.data || null;
  
  // Safe accessors for analytics data
  const safeAnalytics = {
    totalProjects: analytics?.totalProjects ?? 0,
    activeProjects: analytics?.activeProjects ?? 0,
    completedProjects: analytics?.completedProjects ?? 0,
    teamMembers: analytics?.teamMembers ?? 0,
    averageDuration: analytics?.averageDuration ?? 0,
    completionRate: analytics?.completionRate ?? 0,
    teamProductivity: analytics?.teamProductivity ?? 0,
    successScore: analytics?.successScore ?? 0,
    projectsByStatus: analytics?.projectsByStatus ?? [],
    projectsByPriority: analytics?.projectsByPriority ?? [],
    projectsByIndustry: analytics?.projectsByIndustry ?? [],
    projectTimeline: analytics?.projectTimeline ?? [],
    trendsData: analytics?.trendsData ?? [],
    lastUpdated: analytics?.lastUpdated || getLastUpdated()
  };

  return {
    // Query state
    analytics: safeAnalytics,
    isLoading: query.isLoading,
    isError: hasError,
    error: query.error,
    errorMessage,
    isFetching: query.isFetching,
    isSuccess: query.isSuccess,
    
    // Data status
    hasData: !!analytics && safeAnalytics.totalProjects > 0,
    isEmpty: !query.isLoading && (!analytics || safeAnalytics.totalProjects === 0),
    lastUpdated: getLastUpdated(),
    isDataStale: isDataStale(),
    
    // Actions
    refreshAnalytics,
    retry: query.refetch
  };
}

// Hook for real-time analytics updates
export function useAnalyticsRealtime() {
  const queryClient = useQueryClient();
  const currentUserId = useCurrentUserId();

  // Invalidate analytics when projects change
  const invalidateAnalytics = useCallback(() => {
    if (currentUserId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.analytics(currentUserId)
      });
    }
  }, [currentUserId, queryClient]);

  return {
    invalidateAnalytics
  };
}