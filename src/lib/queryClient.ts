import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 408, 429
        if (error?.status >= 400 && error?.status < 500 && ![408, 429].includes(error?.status)) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations on client errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

// Query keys factory for consistent naming
export const queryKeys = {
  projects: {
    all: ['projects'] as const,
    user: (userId: string) => ['projects', 'user', userId] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
    analytics: (id: string) => ['projects', 'analytics', id] as const,
    teamMembers: (id: string) => ['projects', 'teamMembers', id] as const,
    competitors: (id: string) => ['projects', 'competitors', id] as const,
  },
};