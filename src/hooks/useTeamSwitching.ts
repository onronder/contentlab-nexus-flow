import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';

/**
 * Hook for managing team switching with proper cache invalidation
 */
export function useTeamSwitching() {
  const queryClient = useQueryClient();

  const invalidateTeamQueries = useCallback(async () => {
    // Invalidate all team-dependent data patterns
    await Promise.all([
      queryClient.invalidateQueries(queryKeys.invalidateTeamData()),
      queryClient.invalidateQueries(queryKeys.invalidateTeamContent()),
      queryClient.invalidateQueries(queryKeys.invalidateTeamInfo()),
      
      // Also invalidate specific team-related queries
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] }),
      queryClient.invalidateQueries({ queryKey: ['teamStats'] }),
      queryClient.invalidateQueries({ queryKey: ['teamPermissions'] }),
      queryClient.invalidateQueries({ queryKey: ['teamActivity'] }),
    ]);
  }, [queryClient]);

  const resetComponentQueries = useCallback(async () => {
    // Remove all cached data to force fresh fetches
    await queryClient.clear();
  }, [queryClient]);

  const optimisticTeamSwitch = useCallback(async (newTeamId: string) => {
    // Set loading states for team-dependent queries
    queryClient.setQueryData(['projects', 'team'], undefined);
    queryClient.setQueryData(['content', 'team'], undefined);
    
    // Invalidate queries to trigger refetches
    await invalidateTeamQueries();
  }, [queryClient, invalidateTeamQueries]);

  return {
    invalidateTeamQueries,
    resetComponentQueries,
    optimisticTeamSwitch,
  };
}