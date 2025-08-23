import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { queryOptimizationService } from '@/services/queryOptimizationService';
import { useCallback, useMemo } from 'react';

// Phase 3: Enhanced React Query Hook for Frontend Performance
interface OptimizedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryFn'> {
  table: string;
  columns: string[];
  filters?: Record<string, any>;
  limit?: number;
  orderBy?: { column: string; ascending?: boolean };
  cacheTtl?: number;
  enableOptimisticUpdates?: boolean;
}

export function useOptimizedQuery<T = any>({
  table,
  columns,
  filters,
  limit,
  orderBy,
  cacheTtl,
  enableOptimisticUpdates = false,
  ...queryOptions
}: OptimizedQueryOptions<T[]>) {
  const queryKey = useMemo(
    () => ['optimized', table, columns, filters, limit, orderBy],
    [table, columns, filters, limit, orderBy]
  );

  return useQuery<T[], Error>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await queryOptimizationService.selectiveQuery<T>(
        table,
        columns,
        filters,
        { limit, orderBy, cacheTtl }
      );

      if (error) throw new Error(error.message);
      return data || [];
    },
    staleTime: cacheTtl || 5 * 60 * 1000, // 5 minutes default
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: 'always',
    retry: (failureCount, error: any) => {
      if (error?.code === 'PGRST116') return false; // Row level security
      return failureCount < 3;
    },
    ...queryOptions,
  });
}

// Optimized paginated query hook
export function useOptimizedPaginatedQuery<T = any>({
  table,
  columns,
  filters,
  pageSize = 20,
  ...queryOptions
}: Omit<OptimizedQueryOptions<T>, 'limit'> & { pageSize?: number }) {
  type PaginatedResult = {
    data: T[];
    count: number | null;
    hasMore: boolean;
    nextPage?: number;
  };

  return useQuery<PaginatedResult>({
    queryKey: ['paginated', table, columns, filters, pageSize],
    queryFn: async () => {
      const page = 1;
      const { data, error, count, hasMore } = await queryOptimizationService.paginatedQuery<T>(
        table,
        columns,
        page,
        pageSize,
        filters
      );

      if (error) throw new Error(error.message);
      
      return {
        data: data || [],
        count,
        hasMore,
        nextPage: hasMore ? page + 1 : undefined
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// Optimistic mutation hook
export function useOptimisticMutation<T = any, V = any>({
  table,
  columns,
  onMutate,
  onSuccess,
  onError,
  ...mutationOptions
}: {
  table: string;
  columns?: string[];
  onMutate?: (variables: V) => Promise<T> | T;
  onSuccess?: (data: T, variables: V, context?: any) => void;
  onError?: (error: Error, variables: V, context?: any) => void;
} & any) {
  const queryClient = useQueryClient();

  const optimisticUpdate = useCallback(
    (variables: V, updateType: 'create' | 'update' | 'delete') => {
      const queryKey = ['optimized', table];
      
      queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData<T[]>(queryKey);
      
      if (previousData) {
        queryClient.setQueryData<T[]>(queryKey, (old = []) => {
          switch (updateType) {
            case 'create':
              return [...old, variables as unknown as T];
            case 'update':
              return old.map(item => 
                (item as any).id === (variables as any).id 
                  ? { ...item, ...variables } 
                  : item
              );
            case 'delete':
              return old.filter(item => (item as any).id !== (variables as any).id);
            default:
              return old;
          }
        });
      }
      
      return { previousData };
    },
    [table, queryClient]
  );

  return useMutation({
    onMutate: async (variables: V) => {
      const context = await onMutate?.(variables);
      return { ...context, optimistic: optimisticUpdate(variables, 'update') };
    },
    onSuccess: (data: T, variables: V, context?: any) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ 
        queryKey: ['optimized', table],
        refetchType: 'active'
      });
      onSuccess?.(data, variables, context);
    },
    onError: (error: Error, variables: V, context?: any) => {
      // Rollback optimistic update
      if (context?.optimistic?.previousData) {
        queryClient.setQueryData(
          ['optimized', table],
          context.optimistic.previousData
        );
      }
      onError?.(error, variables, context);
    },
    ...mutationOptions,
  });
}

// Background sync hook for real-time data
export function useBackgroundSync(
  table: string,
  filters?: Record<string, any>,
  interval: number = 30000 // 30 seconds
) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['background-sync', table, filters],
    queryFn: async () => {
      // This runs in the background to keep data fresh
      const queryKey = ['optimized', table];
      await queryClient.refetchQueries({ queryKey });
      return Date.now();
    },
    refetchInterval: interval,
    refetchIntervalInBackground: true,
    staleTime: Infinity,
    enabled: true,
  });
}

// Cache warming hook
export function useCacheWarming() {
  const queryClient = useQueryClient();

  const warmCache = useCallback(
    async (queries: Array<{
      table: string;
      columns: string[];
      filters?: Record<string, any>;
    }>) => {
      const promises = queries.map(({ table, columns, filters }) =>
        queryClient.prefetchQuery({
          queryKey: ['optimized', table, columns, filters],
          queryFn: () => queryOptimizationService.selectiveQuery(table, columns, filters),
          staleTime: 10 * 60 * 1000, // 10 minutes for prefetched data
        })
      );

      await Promise.all(promises);
    },
    [queryClient]
  );

  return { warmCache };
}

// Performance monitoring hook
export function useQueryPerformance() {
  const queryClient = useQueryClient();

  const getPerformanceMetrics = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      cachedQueries: queries.filter(q => q.state.data !== undefined).length,
      errorQueries: queries.filter(q => q.state.error !== null).length,
      cacheSize: queries.reduce((size, query) => {
        return size + JSON.stringify(query.state.data || {}).length;
      }, 0)
    };
  }, [queryClient]);

  return { getPerformanceMetrics };
}
