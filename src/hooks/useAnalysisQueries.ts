import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { aiAnalysisService, AnalysisResult, ProjectInsights } from '@/services/aiAnalysisService';
import { CompetitorAnalysisMetadata } from '@/types/competitors';
import { supabase } from '@/integrations/supabase/client';

// Query keys for analysis-related queries
export const analysisQueryKeys = {
  all: ['analysis'] as const,
  competitor: (competitorId: string) => [...analysisQueryKeys.all, 'competitor', competitorId] as const,
  competitorAnalysis: (competitorId: string) => [...analysisQueryKeys.competitor(competitorId), 'analysis'] as const,
  competitorHistory: (competitorId: string) => [...analysisQueryKeys.competitor(competitorId), 'history'] as const,
  project: (projectId: string) => [...analysisQueryKeys.all, 'project', projectId] as const,
  projectInsights: (projectId: string) => [...analysisQueryKeys.project(projectId), 'insights'] as const,
  analysisProgress: (analysisId: string) => [...analysisQueryKeys.all, 'progress', analysisId] as const,
};

/**
 * Hook to get the latest analysis result for a competitor
 */
export function useCompetitorAnalysis(
  competitorId: string,
  enabled = true
) {
  return useQuery({
    queryKey: analysisQueryKeys.competitorAnalysis(competitorId),
    queryFn: async (): Promise<CompetitorAnalysisMetadata | null> => {
      const { data, error } = await supabase
        .from('competitor_analysis_metadata')
        .select('*')
        .eq('competitor_id', competitorId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch competitor analysis: ${error.message}`);
      }

      return data;
    },
    enabled: enabled && !!competitorId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to get analysis history for a competitor
 */
export function useAnalysisHistory(
  competitorId: string,
  enabled = true
) {
  return useQuery({
    queryKey: analysisQueryKeys.competitorHistory(competitorId),
    queryFn: () => aiAnalysisService.getAnalysisHistory(competitorId),
    enabled: enabled && !!competitorId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Hook to get project-wide competitive insights
 */
export function useProjectInsights(
  projectId: string,
  enabled = true
) {
  return useQuery({
    queryKey: analysisQueryKeys.projectInsights(projectId),
    queryFn: async (): Promise<ProjectInsights | null> => {
      try {
        return await aiAnalysisService.generateCompetitiveInsights(projectId);
      } catch (error) {
        console.error('Failed to generate project insights:', error);
        return null;
      }
    },
    enabled: enabled && !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 1, // Only retry once for expensive operations
  });
}

/**
 * Hook to track analysis progress
 */
export function useAnalysisProgress(
  analysisId: string,
  enabled = true
) {
  return useQuery({
    queryKey: analysisQueryKeys.analysisProgress(analysisId),
    queryFn: async (): Promise<CompetitorAnalysisMetadata | null> => {
      const { data, error } = await supabase
        .from('competitor_analysis_metadata')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch analysis progress: ${error.message}`);
      }

      return data;
    },
    enabled: enabled && !!analysisId,
    refetchInterval: (query) => {
      // Refetch every 2 seconds if analysis is still pending or processing
      return query.state.data?.status === 'pending' || query.state.data?.status === 'running' ? 2000 : false;
    },
    staleTime: 0, // Always consider stale for real-time updates
  });
}

/**
 * Hook to get all analyses for a project
 */
export function useProjectAnalyses(
  projectId: string,
  enabled = true
) {
  return useQuery({
    queryKey: [...analysisQueryKeys.project(projectId), 'all-analyses'],
    queryFn: async (): Promise<CompetitorAnalysisMetadata[]> => {
      const { data, error } = await supabase
        .from('competitor_analysis_metadata')
        .select(`
          *,
          project_competitors!inner(
            project_id,
            company_name,
            domain
          )
        `)
        .eq('project_competitors.project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch project analyses: ${error.message}`);
      }

      return data || [];
    },
    enabled: enabled && !!projectId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
  });
}

/**
 * Hook to get recent analysis activity across all projects
 */
export function useRecentAnalysisActivity(
  limit = 10,
  enabled = true
) {
  return useQuery({
    queryKey: [...analysisQueryKeys.all, 'recent-activity', limit],
    queryFn: async (): Promise<CompetitorAnalysisMetadata[]> => {
      const { data, error } = await supabase
        .from('competitor_analysis_metadata')
        .select(`
          *,
          project_competitors!inner(
            company_name,
            domain,
            projects!inner(
              name
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch recent analysis activity: ${error.message}`);
      }

      return data || [];
    },
    enabled,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get analysis statistics for a project
 */
export function useAnalysisStats(
  projectId: string,
  enabled = true
) {
  return useQuery({
    queryKey: [...analysisQueryKeys.project(projectId), 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitor_analysis_metadata')
        .select(`
          status,
          analysis_type,
          confidence_score,
          created_at,
          project_competitors!inner(project_id)
        `)
        .eq('project_competitors.project_id', projectId);

      if (error) {
        throw new Error(`Failed to fetch analysis stats: ${error.message}`);
      }

      const analyses = data || [];
      
      return {
        totalAnalyses: analyses.length,
        completedAnalyses: analyses.filter(a => a.status === 'completed').length,
        pendingAnalyses: analyses.filter(a => a.status === 'pending').length,
        failedAnalyses: analyses.filter(a => a.status === 'failed').length,
        averageConfidence: analyses
          .filter(a => a.confidence_score)
          .reduce((acc, a) => acc + (a.confidence_score || 0), 0) / 
          analyses.filter(a => a.confidence_score).length || 0,
        analysesByType: analyses.reduce((acc, a) => {
          acc[a.analysis_type] = (acc[a.analysis_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        recentAnalyses: analyses
          .filter(a => a.created_at > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .length
      };
    },
    enabled: enabled && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook for real-time analysis updates
 */
export function useRealtimeAnalysisUpdates(projectId: string, enabled = true) {
  return useQuery({
    queryKey: [...analysisQueryKeys.project(projectId), 'realtime'],
    queryFn: () => Promise.resolve(null), // Initial empty data
    enabled: enabled && !!projectId,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
}