import { useQuery } from '@tanstack/react-query';
import { TeamService } from '@/services/teamService';
import { useAuth } from '@/hooks/useAuth';
import type {
  Team,
  TeamMembersResponse,
  UserRole,
  TeamQueryOptions,
  TeamMemberQueryOptions,
  TeamType
} from '@/types/team';

// ============================================================================
// TEAM QUERIES
// ============================================================================

export function useTeams(options?: TeamQueryOptions) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['teams', user?.id, options],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const teams = await TeamService.getTeamsByUser(user.id, options);
        // Fetch complete team data including members for proper access control
        const teamsWithMembers = await Promise.all(
          teams.map(async (team) => {
            try {
              const membersResponse = await TeamService.getTeamMembers(team.id);
              return { ...team, members: membersResponse?.members || [] };
            } catch (error) {
              console.warn(`Failed to fetch members for team ${team.id}:`, error);
              return { ...team, members: [] };
            }
          })
        );
        return teamsWithMembers;
      } catch (error) {
        console.error('Error fetching teams:', error);
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once to avoid infinite loops
  });
}

export function useTeam(teamId: string) {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: () => TeamService.getTeamById(teamId),
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTeamMembers(teamId: string, options?: TeamMemberQueryOptions) {
  return useQuery({
    queryKey: ['teamMembers', teamId, options],
    queryFn: () => TeamService.getTeamMembers(teamId, options),
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000, // 2 minutes - member data changes more frequently
  });
}

export function useUserTeamRoles(userId?: string) {
  const { user } = useAuth();
  const effectiveUserId = userId || user?.id;

  return useQuery({
    queryKey: ['userTeamRoles', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      return TeamService.getUserTeamRoles(effectiveUserId);
    },
    enabled: !!effectiveUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTeamPermissions(teamId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['teamPermissions', teamId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return TeamService.getTeamPermissions(teamId, user.id);
    },
    enabled: !!teamId && !!user?.id,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

export function useTeamStats(teamId: string) {
  return useQuery({
    queryKey: ['teamStats', teamId],
    queryFn: () => TeamService.getTeamStats(teamId),
    enabled: !!teamId,
    staleTime: 10 * 60 * 1000, // 10 minutes - stats don't change often
  });
}

export function useAvailableRoles() {
  return useQuery({
    queryKey: ['availableRoles'],
    queryFn: () => TeamService.getUserRoles(),
    staleTime: 10 * 60 * 1000, // 10 minutes - roles don't change often
  });
}

// Advanced team queries with filtering
export function useTeamsByType(teamType: TeamType) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['teamsByType', teamType, user?.id],
    queryFn: () => TeamService.getTeamsByUser(user!.id, {
      filters: { team_type: teamType }
    }),
    enabled: !!user?.id && !!teamType,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeamMembersByRole(teamId: string, roleSlug: string) {
  return useQuery({
    queryKey: ['teamMembersByRole', teamId, roleSlug],
    queryFn: () => TeamService.getTeamMembers(teamId, {
      filters: { role_slug: roleSlug }
    }),
    enabled: !!teamId && !!roleSlug,
    staleTime: 3 * 60 * 1000,
  });
}

export function useTeamActivity(teamId: string) {
  return useQuery({
    queryKey: ['teamActivity', teamId],
    queryFn: () => TeamService.getTeamActivity(teamId),
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000, // 2 minutes - activity data is more dynamic
  });
}