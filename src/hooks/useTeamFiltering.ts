import { useMemo } from 'react';
import { useTeamContext } from '@/contexts/TeamContext';

/**
 * Hook to filter data based on current team context
 * Provides team-based filtering utilities for all modules
 */
export function useTeamFiltering() {
  const { currentTeam, hasTeamAccess, isTeamMember } = useTeamContext();

  const teamFilters = useMemo(() => {
    if (!currentTeam) return null;

    return {
      // For projects: filter by team members or team-accessible projects
      projectFilters: {
        team_id: currentTeam.id,
        // Include projects where current team members are involved
        team_members: currentTeam.members?.map(m => m.user_id) || []
      },

      // For competitors: filter by projects that belong to team
      competitorFilters: {
        team_id: currentTeam.id
      },

      // For content: filter by team projects and team members
      contentFilters: {
        team_id: currentTeam.id,
        team_members: currentTeam.members?.map(m => m.user_id) || []
      },

      // For analytics: filter by team-related data
      analyticsFilters: {
        team_id: currentTeam.id
      }
    };
  }, [currentTeam]);

  const applyTeamFilter = <T extends Record<string, any>>(
    items: T[], 
    filterType: 'project' | 'competitor' | 'content' | 'analytics'
  ): T[] => {
    if (!currentTeam || !teamFilters) return items;

    switch (filterType) {
      case 'project':
        return items.filter(item => {
          // Include if user is owner
          if (item.created_by && teamFilters.projectFilters.team_members.includes(item.created_by)) {
            return true;
          }
          // Include if any team member is part of project
          if (item.team_members) {
            return item.team_members.some((memberId: string) => 
              teamFilters.projectFilters.team_members.includes(memberId)
            );
          }
          return false;
        });

      case 'competitor':
        return items.filter(item => {
          // Filter by project ownership through team
          if (item.project_id) {
            return true; // Will be filtered at project level
          }
          return false;
        });

      case 'content':
        return items.filter(item => {
          // Include if created by team member
          if (item.user_id && teamFilters.contentFilters.team_members.includes(item.user_id)) {
            return true;
          }
          // Include if project belongs to team
          if (item.project_id) {
            return true; // Will be filtered at project level
          }
          return false;
        });

      case 'analytics':
        return items.filter(item => {
          // Filter based on team access to underlying resources
          return true; // Will be filtered at resource level
        });

      default:
        return items;
    }
  };

  const getTeamBasedQuery = (baseQuery: any, queryType: 'project' | 'competitor' | 'content' | 'analytics') => {
    if (!currentTeam || !teamFilters) return baseQuery;

    switch (queryType) {
      case 'project':
        // Add team member filtering to project queries
        return baseQuery.or(
          `created_by.in.(${teamFilters.projectFilters.team_members.join(',')}),` +
          `project_team_members.user_id.in.(${teamFilters.projectFilters.team_members.join(',')})`
        );

      case 'competitor':
        // Filter competitors by team-accessible projects
        return baseQuery.in('project_id', ['team_projects_subquery']);

      case 'content':
        // Filter content by team members and team projects
        return baseQuery.or(
          `user_id.in.(${teamFilters.contentFilters.team_members.join(',')}),` +
          `project_id.in.(team_projects_subquery)`
        );

      case 'analytics':
        // Filter analytics by team-accessible resources
        return baseQuery;

      default:
        return baseQuery;
    }
  };

  const getTeamMemberIds = (): string[] => {
    return currentTeam?.members?.map(m => m.user_id) || [];
  };

  const isTeamResource = (resource: any, resourceType: 'project' | 'competitor' | 'content'): boolean => {
    if (!currentTeam) return false;

    const teamMemberIds = getTeamMemberIds();

    switch (resourceType) {
      case 'project':
        return resource.created_by && teamMemberIds.includes(resource.created_by);
      
      case 'competitor':
        return resource.added_by && teamMemberIds.includes(resource.added_by);
      
      case 'content':
        return resource.user_id && teamMemberIds.includes(resource.user_id);
      
      default:
        return false;
    }
  };

  return {
    currentTeam,
    teamFilters,
    hasTeamAccess,
    isTeamMember,
    applyTeamFilter,
    getTeamBasedQuery,
    getTeamMemberIds,
    isTeamResource,
  };
}