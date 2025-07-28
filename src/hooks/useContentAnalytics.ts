import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ContentService } from '@/services/contentService';
import { AnalyticsUpdateInput } from '@/types/content';
import { useToast } from '@/hooks/use-toast';

const contentService = ContentService.getInstance();

// ==================== ANALYTICS QUERIES ====================

export function useContentAnalytics(contentId: string) {
  return useQuery({
    queryKey: ['content', 'analytics', contentId],
    queryFn: () => contentService.getAnalytics(contentId),
    enabled: !!contentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useContentPerformanceScore(contentId: string) {
  return useQuery({
    queryKey: ['content', 'performance', contentId],
    queryFn: async () => {
      const analytics = await contentService.getAnalytics(contentId);
      if (!analytics.length) return 0;
      
      const latest = analytics[0];
      return calculatePerformanceScore(latest);
    },
    enabled: !!contentId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useContentEngagementTrends(contentId: string, days: number = 30) {
  return useQuery({
    queryKey: ['content', 'engagement-trends', contentId, days],
    queryFn: async () => {
      const analytics = await contentService.getAnalytics(contentId);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      return analytics
        .filter(item => new Date(item.analytics_date) >= cutoffDate)
        .map(item => ({
          date: item.analytics_date,
          views: item.views || 0,
          likes: item.likes || 0,
          shares: item.shares || 0,
          comments: item.comments || 0,
          engagement_rate: item.engagement_rate || 0,
          performance_score: item.performance_score || 0,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    enabled: !!contentId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAggregatedAnalytics(projectId: string) {
  return useQuery({
    queryKey: ['content', 'aggregated-analytics', projectId],
    queryFn: async () => {
      const content = await contentService.getContentByProject(projectId);
      
      let totalViews = 0;
      let totalLikes = 0;
      let totalShares = 0;
      let totalComments = 0;
      let totalEngagement = 0;
      let avgPerformanceScore = 0;
      
      for (const item of content) {
        if (item.content_analytics && item.content_analytics.length > 0) {
          const analytics = item.content_analytics[0]; // Latest analytics
          totalViews += analytics.views || 0;
          totalLikes += analytics.likes || 0;
          totalShares += analytics.shares || 0;
          totalComments += analytics.comments || 0;
          totalEngagement += analytics.engagement_rate || 0;
          avgPerformanceScore += analytics.performance_score || 0;
        }
      }
      
      const contentCount = content.length;
      
      return {
        totalViews,
        totalLikes,
        totalShares,
        totalComments,
        totalEngagement,
        avgEngagementRate: contentCount > 0 ? totalEngagement / contentCount : 0,
        avgPerformanceScore: contentCount > 0 ? avgPerformanceScore / contentCount : 0,
        contentCount,
        topPerformingContent: content
          .filter(item => item.content_analytics && item.content_analytics.length > 0)
          .sort((a, b) => {
            const aScore = a.content_analytics![0]?.performance_score || 0;
            const bScore = b.content_analytics![0]?.performance_score || 0;
            return bScore - aScore;
          })
          .slice(0, 5),
      };
    },
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ==================== ANALYTICS MUTATIONS ====================

export function useUpdateAnalytics() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ contentId, analytics }: { contentId: string; analytics: AnalyticsUpdateInput }) => 
      contentService.updateAnalytics(contentId, analytics),
    onSuccess: (_, { contentId }) => {
      queryClient.invalidateQueries({ queryKey: ['content', 'analytics', contentId] });
      queryClient.invalidateQueries({ queryKey: ['content', 'performance', contentId] });
      queryClient.invalidateQueries({ queryKey: ['content', 'engagement-trends', contentId] });
      queryClient.invalidateQueries({ queryKey: ['content', 'aggregated-analytics'] });
      toast({
        title: 'Analytics updated',
        description: 'Content analytics have been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update analytics',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}

// ==================== UTILITY FUNCTIONS ====================

function calculatePerformanceScore(analytics: any): number {
  const { views, likes, shares, comments, click_through_rate, conversion_rate, reach, impressions } = analytics;
  
  // Engagement score (40% weight)
  const engagementScore = views > 0 
    ? Math.min(((likes + shares * 2 + comments * 1.5) / views) * 100, 40)
    : 0;
  
  // Reach score (30% weight)
  const reachScore = impressions > 0 
    ? Math.min((reach / impressions) * 100 * 0.3, 30)
    : 0;
  
  // Quality score (30% weight)
  const qualityScore = Math.min(
    ((click_through_rate || 0) + (conversion_rate || 0)) * 15,
    30
  );
  
  return Math.round(engagementScore + reachScore + qualityScore);
}

// ==================== COMPOSITE HOOKS ====================

export function useContentAnalyticsHooks() {
  return {
    useContentAnalytics,
    useContentPerformanceScore,
    useContentEngagementTrends,
    useAggregatedAnalytics,
    useUpdateAnalytics,
  };
}