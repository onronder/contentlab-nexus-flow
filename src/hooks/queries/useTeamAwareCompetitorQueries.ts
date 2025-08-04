import { useQuery } from '@tanstack/react-query';
import { getCompetitorsByProject } from '@/services/competitorService';
import { useTeamContext } from '@/contexts/TeamContext';
import { CompetitorFilters, CompetitorSortOptions } from '@/types/competitors';

/**
 * Team-aware competitor queries that automatically filter by current team context
 */

export function useTeamCompetitors(
  projectId: string,
  filters?: CompetitorFilters,
  sort?: CompetitorSortOptions,
  page: number = 1,
  limit: number = 50
) {
  const { currentTeam } = useTeamContext();

  return useQuery({
    queryKey: ['competitors', 'team', projectId, currentTeam?.id, filters, sort, page, limit],
    queryFn: () => getCompetitorsByProject(projectId, filters, sort, page, limit, currentTeam?.id),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useTeamCompetitorStats(projectId: string) {
  const { data, isLoading } = useTeamCompetitors(projectId);

  const stats = {
    total: data?.total || 0,
    active: data?.competitors.filter(c => c.status === 'active').length || 0,
    inactive: data?.competitors.filter(c => c.status === 'inactive').length || 0,
    monitoring: data?.competitors.filter(c => c.monitoring_enabled).length || 0,
    directTier: data?.competitors.filter(c => c.competitive_tier === 'direct').length || 0,
    indirectTier: data?.competitors.filter(c => c.competitive_tier === 'indirect').length || 0,
    substituteTier: data?.competitors.filter(c => c.competitive_tier === 'substitute').length || 0,
    highThreat: data?.competitors.filter(c => c.threat_level === 'high').length || 0,
    mediumThreat: data?.competitors.filter(c => c.threat_level === 'medium').length || 0,
    lowThreat: data?.competitors.filter(c => c.threat_level === 'low').length || 0,
  };

  return {
    stats,
    competitors: data?.competitors || [],
    isLoading,
  };
}

export function useTeamCompetitorsByTier(projectId: string, tier: string) {
  const { data, isLoading } = useTeamCompetitors(projectId, {
    competitive_tier: tier as any
  });

  return {
    competitors: data?.competitors || [],
    isLoading,
    count: data?.competitors.length || 0,
  };
}

export function useTeamCompetitorsByThreat(projectId: string, threatLevel: string) {
  const { data, isLoading } = useTeamCompetitors(projectId, {
    threat_level: threatLevel as any
  });

  return {
    competitors: data?.competitors || [],
    isLoading,
    count: data?.competitors.length || 0,
  };
}

export function useTeamCompetitorSearch(projectId: string, searchTerm: string) {
  const { data, isLoading } = useTeamCompetitors(projectId, {
    search: searchTerm
  });

  return {
    competitors: data?.competitors || [],
    isLoading,
    count: data?.competitors.length || 0,
  };
}