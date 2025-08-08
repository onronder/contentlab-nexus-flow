import { useMutation, useQueryClient } from '@tanstack/react-query';
import { aiAnalysisService, AnalysisRequest } from '@/services/aiAnalysisService';
import { analysisQueryKeys } from './useAnalysisQueries';
import { competitorQueryKeys } from './useCompetitorQueries';
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook to start a new competitor analysis
 */
export function useStartAnalysis() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      competitorId, 
      analysisType = 'positioning' 
    }: { 
      competitorId: string; 
      analysisType?: AnalysisRequest['analysisType'];
    }) => {
      return await aiAnalysisService.analyzeCompetitor(competitorId, analysisType);
    },
    onSuccess: (data, { competitorId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: analysisQueryKeys.competitorAnalysis(competitorId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: analysisQueryKeys.competitorHistory(competitorId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: competitorQueryKeys.detail(competitorId) 
      });

      toast({
        title: "Analysis Started",
        description: "Competitive analysis is now running. You'll receive updates as it progresses.",
      });
    },
    onError: (error: Error) => {
      console.error('Analysis start failed:', error);
      
      // Enhanced error handling with specific guidance
      let title = "Analysis Failed";
      let description = error.message || "Failed to start competitive analysis. Please try again.";
      let actionText = "";
      
      if (error.message?.includes('temporarily unavailable')) {
        title = "Service Temporarily Unavailable";
        description = "The AI analysis service is currently unavailable due to high demand or API issues.";
        actionText = "The service will automatically recover. You can monitor the status in the API health indicator.";
      } else if (error.message?.includes('circuit breaker') || error.message?.includes('repeated failures')) {
        title = "Service Protection Activated";
        description = "The analysis service has been temporarily disabled due to repeated API failures.";
        actionText = "This protects against further issues. Service will automatically resume when the API is healthy.";
      } else if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        title = "Rate Limit Reached";
        description = "API rate limit has been reached. Your request has been queued for automatic retry.";
        actionText = "No action needed - the system will automatically process your request when quota is available.";
      } else if (error.message?.includes('queue is full')) {
        title = "Queue at Capacity";
        description = "The analysis queue is currently full due to high demand.";
        actionText = "Please try again in a few minutes, or cancel some pending analyses to free up queue space.";
      } else if (error.message?.includes('API key') || error.message?.includes('unauthorized')) {
        title = "API Configuration Issue";
        description = "There's an issue with the OpenAI API configuration.";
        actionText = "Please contact support or check your API key configuration.";
      } else if (error.message?.includes('Competitor not found')) {
        title = "Invalid Competitor";
        description = "The selected competitor data could not be found or is invalid.";
        actionText = "Please refresh the page and try selecting the competitor again.";
      }

      toast({
        title,
        description: `${description}${actionText ? ` ${actionText}` : ''} You can also review live status in the API Usage dashboard (Admin > API Usage).`,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to refresh an existing analysis
 */
export function useRefreshAnalysis() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      competitorId, 
      analysisType = 'positioning' 
    }: { 
      competitorId: string; 
      analysisType?: AnalysisRequest['analysisType'];
    }) => {
      return await aiAnalysisService.analyzeCompetitor(competitorId, analysisType);
    },
    onSuccess: (data, { competitorId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: analysisQueryKeys.competitorAnalysis(competitorId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: analysisQueryKeys.competitorHistory(competitorId) 
      });
      
      toast({
        title: "Analysis Refreshed",
        description: "Competitive analysis has been updated with the latest data.",
      });
    },
    onError: (error: Error) => {
      console.error('Analysis refresh failed:', error);
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh analysis. Please try again.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to run bulk analysis on multiple competitors
 */
export function useBulkAnalysis() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      competitorIds, 
      analysisType = 'positioning' 
    }: { 
      competitorIds: string[]; 
      analysisType?: AnalysisRequest['analysisType'];
    }) => {
      return await aiAnalysisService.bulkAnalyzeCompetitors(competitorIds, analysisType);
    },
    onSuccess: (results, { competitorIds }) => {
      // Invalidate queries for all analyzed competitors
      competitorIds.forEach(competitorId => {
        queryClient.invalidateQueries({ 
          queryKey: analysisQueryKeys.competitorAnalysis(competitorId) 
        });
        queryClient.invalidateQueries({ 
          queryKey: analysisQueryKeys.competitorHistory(competitorId) 
        });
        queryClient.invalidateQueries({ 
          queryKey: competitorQueryKeys.detail(competitorId) 
        });
      });

      const successCount = results.length;
      const totalCount = competitorIds.length;

      toast({
        title: "Bulk Analysis Complete",
        description: `Successfully analyzed ${successCount} of ${totalCount} competitors.`,
      });
    },
    onError: (error: Error) => {
      console.error('Bulk analysis failed:', error);
      toast({
        title: "Bulk Analysis Failed",
        description: error.message || "Failed to complete bulk analysis. Some analyses may have succeeded.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to cancel a running analysis
 */
export function useCancelAnalysis() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ analysisId }: { analysisId: string }) => {
      return await aiAnalysisService.cancelAnalysis(analysisId);
    },
    onSuccess: (success, { analysisId }) => {
      if (success) {
        // Invalidate progress query
        queryClient.invalidateQueries({ 
          queryKey: analysisQueryKeys.analysisProgress(analysisId) 
        });

        toast({
          title: "Analysis Cancelled",
          description: "The analysis has been successfully cancelled.",
        });
      } else {
        toast({
          title: "Cancellation Failed",
          description: "Could not cancel the analysis. It may have already completed.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      console.error('Analysis cancellation failed:', error);
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel analysis.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to generate project-wide insights
 */
export function useGenerateProjectInsights() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId }: { projectId: string }) => {
      return await aiAnalysisService.generateCompetitiveInsights(projectId);
    },
    onSuccess: (data, { projectId }) => {
      // Invalidate project insights
      queryClient.invalidateQueries({ 
        queryKey: analysisQueryKeys.projectInsights(projectId) 
      });

      toast({
        title: "Insights Generated",
        description: "Project-wide competitive insights have been successfully generated.",
      });
    },
    onError: (error: Error) => {
      console.error('Project insights generation failed:', error);
      toast({
        title: "Insights Generation Failed",
        description: error.message || "Failed to generate project insights. Please try again.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to analyze market position
 */
export function useAnalyzeMarketPosition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      competitorId, 
      projectId 
    }: { 
      competitorId: string; 
      projectId: string;
    }) => {
      return await aiAnalysisService.analyzeMarketPosition(competitorId, projectId);
    },
    onSuccess: (data, { competitorId }) => {
      queryClient.invalidateQueries({ 
        queryKey: analysisQueryKeys.competitorAnalysis(competitorId) 
      });

      toast({
        title: "Market Position Analyzed",
        description: "Market positioning analysis has been completed.",
      });
    },
    onError: (error: Error) => {
      console.error('Market position analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze market position.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to identify content gaps
 */
export function useIdentifyContentGaps() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      competitorId, 
      projectId 
    }: { 
      competitorId: string; 
      projectId: string;
    }) => {
      return await aiAnalysisService.identifyContentGaps(competitorId, projectId);
    },
    onSuccess: (data, { competitorId }) => {
      queryClient.invalidateQueries({ 
        queryKey: analysisQueryKeys.competitorAnalysis(competitorId) 
      });

      toast({
        title: "Content Gaps Identified",
        description: "Content gap analysis has been completed.",
      });
    },
    onError: (error: Error) => {
      console.error('Content gap analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to identify content gaps.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to get analysis cost estimate
 */
export function useAnalysisCostEstimate() {
  return useMutation({
    mutationFn: async ({ 
      competitorCount, 
      analysisType = 'positioning' 
    }: { 
      competitorCount: number; 
      analysisType?: AnalysisRequest['analysisType'];
    }) => {
      return aiAnalysisService.getAnalysisCostEstimate(competitorCount, analysisType);
    },
  });
}