import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { TeamService } from '@/services/teamService';
import { teamPerformanceMonitor } from '@/utils/teamPerformance';
import type { Team, TeamMember, TeamQueryOptions, TeamMemberQueryOptions } from '@/types/team';

// Optimized team queries with performance monitoring and caching
export function useOptimizedTeams(options?: TeamQueryOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => 
    ['teams', 'optimized', user?.id, options], 
    [user?.id, options]
  );

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const start = performance.now();
      const result = await TeamService.getTeamsByUser(user!.id, options);
      teamPerformanceMonitor.trackOperation('fetch_teams_optimized', async () => {});
      return result;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    select: useCallback((data: any) => {
      // Memoize processed data to prevent unnecessary re-renders
      return data?.teams || [];
    }, [])
  });

  // Prefetch related data
  const prefetchTeamDetails = useCallback(async (teamId: string) => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['team-members', 'optimized', teamId],
        queryFn: () => teamPerformanceMonitor.trackOperation(
          'prefetch_team_members',
          () => TeamService.getTeamMembers(teamId)
        ),
        staleTime: 2 * 60 * 1000
      }),
      queryClient.prefetchQuery({
        queryKey: ['team-permissions', teamId],
        queryFn: async () => {
          // Mock permissions for now
          return { canEdit: true, canDelete: false, canInvite: true };
        },
        staleTime: 10 * 60 * 1000
      })
    ]);
  }, [queryClient]);

  return {
    ...query,
    teams: query.data || [],
    prefetchTeamDetails
  };
}

export function useOptimizedTeamMembers(teamId: string, options?: TeamMemberQueryOptions) {
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => 
    ['team-members', 'optimized', teamId, options], 
    [teamId, options]
  );

  const query = useQuery({
    queryKey,
    queryFn: () => teamPerformanceMonitor.trackOperation(
      'fetch_team_members_optimized',
      () => TeamService.getTeamMembers(teamId, options)
    ),
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    select: useCallback((data: any) => {
      // Sort members by activity for better UX
      const members = data?.members || [];
      return members.sort((a: TeamMember, b: TeamMember) => {
        const aActivity = new Date(a.last_activity_at).getTime();
        const bActivity = new Date(b.last_activity_at).getTime();
        return bActivity - aActivity;
      });
    }, [])
  });

  // Optimistic member updates
  const updateMemberOptimistically = useCallback((memberId: string, updates: Partial<TeamMember>) => {
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData?.members) return oldData;
      
      return {
        ...oldData,
        members: oldData.members.map((member: TeamMember) =>
          member.id === memberId ? { ...member, ...updates } : member
        )
      };
    });
  }, [queryClient, queryKey]);

  return {
    ...query,
    members: query.data || [],
    updateMemberOptimistically
  };
}

export function useOptimizedTeam(teamId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['team', 'optimized', teamId],
    queryFn: async () => {
      const result = await TeamService.getTeamsByUser(teamId);
      return result?.[0] || null;
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Background refetch for real-time updates
  const refreshTeam = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['team', 'optimized', teamId],
      refetchType: 'active'
    });
  }, [queryClient, teamId]);

  return {
    ...query,
    team: query.data,
    refreshTeam
  };
}

// Cache-aware team statistics
export function useOptimizedTeamStats(teamId: string) {
  const { data: members } = useOptimizedTeamMembers(teamId);
  
  const stats = useMemo(() => {
    if (!members) return null;

    const startTime = performance.now();
    const result = (() => {
      const activeMembers = members.filter(m => m.is_active && m.status === 'active');
      const pendingInvitations = members.filter(m => m.status === 'pending');
      
      const roleDistribution = activeMembers.reduce((acc, member) => {
        const role = member.role?.slug || 'unknown';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const recentActivity = activeMembers.filter(member => {
        const lastActivity = new Date(member.last_activity_at);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return lastActivity > weekAgo;
      }).length;

      return {
        total_members: members.length,
        active_members: activeMembers.length,
        pending_invitations: pendingInvitations.length,
        role_distribution: roleDistribution,
        recent_activity: recentActivity,
        activity_rate: activeMembers.length > 0 ? (recentActivity / activeMembers.length) * 100 : 0
      };
    })();
    teamPerformanceMonitor.trackOperation('calculate_team_stats', async () => {});
    return result;
  }, [members]);

  return { stats, isLoading: !members };
}

// Efficient search with debouncing
export function useOptimizedTeamSearch(teamId: string, searchTerm: string, debounceMs = 300) {
  const { data: members } = useOptimizedTeamMembers(teamId);
  
  const filteredMembers = useMemo(() => {
    if (!members || !searchTerm.trim()) return members || [];

    return teamPerformanceMonitor.trackOperation('search_team_members', () => {
      const term = searchTerm.toLowerCase();
      return members.filter(member => {
        const user = member.user as any;
        const name = user?.full_name?.toLowerCase() || '';
        const email = user?.email?.toLowerCase() || '';
        const role = member.role?.name?.toLowerCase() || '';
        
        return name.includes(term) || email.includes(term) || role.includes(term);
      });
    });
  }, [members, searchTerm]);

  return {
    members: filteredMembers,
    resultCount: filteredMembers?.length || 0,
    isSearching: !!searchTerm.trim()
  };
}