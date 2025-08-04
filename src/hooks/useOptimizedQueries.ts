import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useConnectionStatus } from './useConnectionStatus';

interface OptimizedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'retry' | 'retryDelay'> {
  enabledOnline?: boolean;
  offlineStaleTime?: number;
}

export function useOptimizedQuery<T>(
  options: OptimizedQueryOptions<T>
) {
  const { isOnline } = useConnectionStatus();
  const { enabledOnline = true, offlineStaleTime = 10 * 60 * 1000, ...queryOptions } = options;

  return useQuery({
    ...queryOptions,
    enabled: enabledOnline ? isOnline && queryOptions.enabled : queryOptions.enabled,
    staleTime: isOnline ? queryOptions.staleTime : offlineStaleTime,
    retry: (failureCount, error: any) => {
      // Don't retry network errors when offline
      if (!isOnline) return false;
      
      // Don't retry rate limit errors
      if (error?.status === 429) return false;
      
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff with jitter
      const baseDelay = 1000;
      const exponentialDelay = baseDelay * Math.pow(2, attemptIndex);
      const jitter = Math.random() * 500;
      return Math.min(exponentialDelay + jitter, 10000);
    },
    refetchOnWindowFocus: isOnline,
    refetchOnReconnect: true,
  });
}