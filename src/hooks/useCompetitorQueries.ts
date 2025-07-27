import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { 
  Competitor, 
  CompetitorAnalytics,
  CompetitorSearchResult,
  CompetitorFilters,
  CompetitorSortOptions
} from '@/types/competitors';
import { 
  getCompetitorById,
  getCompetitorsByProject,
  getCompetitorAnalytics,
  searchCompetitors,
  getCompetitorsForAnalysis
} from '@/services/competitorService';
import { queryKeys } from '@/lib/queryClient';

// ==================== COMPETITOR QUERY HOOKS ====================

export function useCompetitors(
  projectId: string,
  filters?: CompetitorFilters,
  sort?: CompetitorSortOptions,
  page: number = 1,
  limit: number = 50,
  enabled: boolean = true
): UseQueryResult<CompetitorSearchResult, Error> {
  return useQuery({
    queryKey: queryKeys.competitors.list(projectId, filters, sort, page, limit),
    queryFn: () => getCompetitorsByProject(projectId, filters, sort, page, limit),
    enabled: enabled && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

export function useCompetitor(
  competitorId: string,
  enabled: boolean = true
): UseQueryResult<Competitor | null, Error> {
  return useQuery({
    queryKey: queryKeys.competitors.detail(competitorId),
    queryFn: () => getCompetitorById(competitorId),
    enabled: enabled && !!competitorId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });
}

export function useCompetitorAnalytics(
  competitorId: string,
  enabled: boolean = true
): UseQueryResult<CompetitorAnalytics | null, Error> {
  return useQuery({
    queryKey: queryKeys.competitors.analytics(competitorId),
    queryFn: () => getCompetitorAnalytics(competitorId),
    enabled: enabled && !!competitorId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });
}

export function useCompetitorSearch(
  projectId: string,
  searchTerm: string,
  filters?: CompetitorFilters,
  enabled: boolean = true
): UseQueryResult<CompetitorSearchResult, Error> {
  return useQuery({
    queryKey: queryKeys.competitors.search(projectId, searchTerm, filters),
    queryFn: () => searchCompetitors(projectId, searchTerm, filters),
    enabled: enabled && !!projectId && !!searchTerm.trim(),
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useCompetitorsForAnalysis(
  projectId: string,
  enabled: boolean = true
): UseQueryResult<Competitor[], Error> {
  return useQuery({
    queryKey: queryKeys.competitors.forAnalysis(projectId),
    queryFn: () => getCompetitorsForAnalysis(projectId),
    enabled: enabled && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// ==================== HELPER HOOKS ====================

export function useCompetitorCount(projectId: string, filters?: CompetitorFilters) {
  const { data } = useCompetitors(projectId, filters, undefined, 1, 1);
  return data?.total || 0;
}

export function useActiveCompetitors(projectId: string) {
  return useCompetitors(projectId, { status: 'active' });
}

export function useMonitoredCompetitors(projectId: string) {
  return useCompetitors(projectId, { monitoring_enabled: true, status: 'active' });
}

export function useCompetitorsByThreatLevel(projectId: string, threatLevel: string) {
  return useCompetitors(projectId, { threat_level: threatLevel, status: 'active' });
}

export function useCompetitorsByIndustry(projectId: string, industry: string) {
  return useCompetitors(projectId, { industry, status: 'active' });
}

// ==================== QUERY KEY EXTENSIONS ====================

// Extend the existing queryKeys from queryClient with competitor-specific keys
declare module '@/lib/queryClient' {
  interface QueryKeys {
    competitors: {
      all: readonly ['competitors'];
      list: (projectId: string, filters?: CompetitorFilters, sort?: CompetitorSortOptions, page?: number, limit?: number) => readonly ['competitors', 'list', string, CompetitorFilters?, CompetitorSortOptions?, number?, number?];
      detail: (competitorId: string) => readonly ['competitors', 'detail', string];
      analytics: (competitorId: string) => readonly ['competitors', 'analytics', string];
      search: (projectId: string, searchTerm: string, filters?: CompetitorFilters) => readonly ['competitors', 'search', string, string, CompetitorFilters?];
      forAnalysis: (projectId: string) => readonly ['competitors', 'forAnalysis', string];
    };
  }
}

// Add competitor query keys to the existing queryKeys object
export const competitorQueryKeys = {
  all: ['competitors'] as const,
  list: (projectId: string, filters?: CompetitorFilters, sort?: CompetitorSortOptions, page?: number, limit?: number) => 
    ['competitors', 'list', projectId, filters, sort, page, limit] as const,
  detail: (competitorId: string) => ['competitors', 'detail', competitorId] as const,
  analytics: (competitorId: string) => ['competitors', 'analytics', competitorId] as const,
  search: (projectId: string, searchTerm: string, filters?: CompetitorFilters) => 
    ['competitors', 'search', projectId, searchTerm, filters] as const,
  forAnalysis: (projectId: string) => ['competitors', 'forAnalysis', projectId] as const,
};