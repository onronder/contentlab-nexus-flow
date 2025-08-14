import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Type definitions
export interface ContentAnalyticsItem {
  id: string;
  content_id: string;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  downloads: number;
  performance_score: number;
  engagement_rate: number;
  analytics_date: string;
}

export interface ContentItem {
  id: string;
  title: string;
  content_type: string;
  created_at: string;
  user_id: string;
  team_id?: string;
  file_size?: number;
}

export interface UserAnalyticsItem {
  id: string;
  user_id: string;
  session_id: string;
  event_type: string;
  event_name: string;
  page_path?: string;
  event_properties: Record<string, any>;
  created_at: string;
}

export interface OptimizationRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  category: string;
  estimatedImprovement: string;
}

export interface PredictiveInsight {
  id: string;
  title: string;
  description: string;
  confidence: number;
  impact: string;
  category: string;
  timeframe: string;
  recommendations: string[];
}

// Helper functions
function calculateAverageTimeSpent(analytics: UserAnalyticsItem[]): string {
  const sessionEvents = analytics.filter(event => event.event_type === 'session');
  if (sessionEvents.length === 0) return '0:00';
  
  const totalTime = sessionEvents.reduce((sum, event) => {
    return sum + (event.event_properties?.duration_ms || 0);
  }, 0);
  
  const avgMs = totalTime / sessionEvents.length;
  const minutes = Math.floor(avgMs / 60000);
  const seconds = Math.floor((avgMs % 60000) / 1000);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function calculateConversionRate(analytics: ContentAnalyticsItem[]): number {
  const totalViews = analytics.reduce((sum, item) => sum + (item.views || 0), 0);
  const totalDownloads = analytics.reduce((sum, item) => sum + (item.downloads || 0), 0);
  
  return totalViews > 0 ? (totalDownloads / totalViews) * 100 : 0;
}

function calculateViewsTrend(analytics: ContentAnalyticsItem[]): number {
  if (analytics.length < 7) return 0;
  
  const recent = analytics.filter(item => 
    new Date(item.analytics_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  const older = analytics.filter(item => 
    new Date(item.analytics_date) <= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );

  const recentViews = recent.reduce((sum, item) => sum + (item.views || 0), 0);
  const olderViews = older.reduce((sum, item) => sum + (item.views || 0), 0);
  
  return olderViews > 0 ? ((recentViews - olderViews) / olderViews) * 100 : 0;
}

function generateMockPredictions(baseData: any): PredictiveInsight[] {
  return [
    {
      id: '1',
      title: 'Content Performance Forecast',
      description: `Based on current trends, your content engagement is expected to ${baseData.trend > 0 ? 'increase' : 'decrease'} by ${Math.abs(baseData.trend).toFixed(1)}% next month`,
      confidence: 85,
      impact: baseData.trend > 0 ? 'positive' : 'negative',
      category: 'engagement',
      timeframe: '30 days',
      recommendations: baseData.trend > 0 
        ? ['Continue current content strategy', 'Increase posting frequency by 20%']
        : ['Revise content strategy', 'Focus on high-performing content types']
    },
    {
      id: '2',
      title: 'Seasonal Content Opportunity',
      description: 'Historical data suggests potential for increased engagement in the coming weeks',
      confidence: 72,
      impact: 'positive',
      category: 'trend',
      timeframe: '14 days',
      recommendations: ['Prepare seasonal content', 'Schedule promotional campaigns']
    }
  ];
}

// Main interface
export interface ContentAnalyticsData {
  performanceMetrics: {
    totalViews: number;
    totalEngagement: number;
    averageTimeSpent: string;
    conversionRate: number;
    roi: number;
    trends: {
      views: number;
      engagement: number;
      timeSpent: number;
      conversion: number;
    };
  };
  usagePatterns: {
    totalSessions: number;
    uniqueUsers: number;
    averageSessionDuration: string;
    bounceRate: number;
    pageViews: number;
    searchQueries: number;
  };
  optimizationRecommendations: OptimizationRecommendation[];
  predictiveInsights: {
    performanceForecasts: PredictiveInsight[];
    contentDemandPrediction: any[];
  };
}

export const useAdvancedContentAnalytics = (projectId: string) => {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  const {
    data: analyticsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['advanced-content-analytics', projectId, userId],
    queryFn: async (): Promise<ContentAnalyticsData> => {
      if (!userId) throw new Error('User not authenticated');

      // Fetch real content analytics data
      const { data: contentAnalytics = [], error: analyticsError } = await supabase
        .from('content_analytics')
        .select(`
          *,
          content_items!inner(
            id,
            title,
            content_type,
            created_at,
            user_id,
            team_id
          )
        `)
        .eq('content_items.project_id', projectId)
        .eq('content_items.user_id', userId)
        .gte('analytics_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (analyticsError) throw analyticsError;

      // Fetch user analytics for engagement data
      const { data: userAnalytics = [], error: userError } = await supabase
        .from('user_analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (userError) throw userError;

      // Calculate performance metrics from real data
      const totalViews = contentAnalytics.reduce((sum, item) => sum + (item.views || 0), 0);
      const totalEngagements = contentAnalytics.reduce((sum, item) => 
        sum + (item.likes || 0) + (item.shares || 0) + (item.comments || 0), 0);
      const totalDownloads = contentAnalytics.reduce((sum, item) => sum + (item.downloads || 0), 0);
      
      const conversionRate = calculateConversionRate(contentAnalytics);
      const viewsTrend = calculateViewsTrend(contentAnalytics);
      const averageTimeSpent = calculateAverageTimeSpent(userAnalytics as UserAnalyticsItem[]);

      // Calculate usage patterns
      const uniqueSessions = new Set(userAnalytics.map(event => event.session_id)).size;
      const uniqueUsers = new Set(userAnalytics.map(event => event.user_id)).size;
      const pageViewEvents = userAnalytics.filter(event => event.event_type === 'page_view');
      const searchEvents = userAnalytics.filter(event => event.event_name?.includes('search'));

      // Calculate bounce rate
      const sessionGroups = userAnalytics.reduce((acc: any, event) => {
        if (!acc[event.session_id]) acc[event.session_id] = [];
        acc[event.session_id].push(event);
        return acc;
      }, {});

      const singlePageSessions = Object.values(sessionGroups).filter(
        (session: any) => session.filter((e: any) => e.event_type === 'page_view').length <= 1
      ).length;

      const bounceRate = uniqueSessions > 0 ? (singlePageSessions / uniqueSessions) * 100 : 0;

      // Generate optimization recommendations based on real data
      const optimizationRecommendations: OptimizationRecommendation[] = [];

      const engagementRate = totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;

      if (engagementRate < 2) {
        optimizationRecommendations.push({
          id: '1',
          title: 'Improve Content Engagement',
          description: 'Your content engagement rate is below 2%. Consider adding more interactive elements.',
          priority: 'high',
          impact: 'high',
          effort: 'medium',
          category: 'engagement',
          estimatedImprovement: '150%'
        });
      }

      if (conversionRate < 5) {
        optimizationRecommendations.push({
          id: '2',
          title: 'Optimize Conversion Funnel',
          description: 'Low conversion rate detected. Review your content CTAs and user journey.',
          priority: 'medium',
          impact: 'high',
          effort: 'low',
          category: 'conversion',
          estimatedImprovement: '75%'
        });
      }

      if (viewsTrend < 0) {
        optimizationRecommendations.push({
          id: '3',
          title: 'Reverse Declining Trend',
          description: 'Your content views are declining. Focus on content quality and promotion.',
          priority: 'high',
          impact: 'high',
          effort: 'high',
          category: 'growth',
          estimatedImprovement: '200%'
        });
      }

      if (bounceRate > 70) {
        optimizationRecommendations.push({
          id: '4',
          title: 'Reduce Bounce Rate',
          description: 'High bounce rate detected. Improve content relevance and user experience.',
          priority: 'medium',
          impact: 'medium',
          effort: 'medium',
          category: 'retention',
          estimatedImprovement: '40%'
        });
      }

      // Generate predictions based on real data trends
      const predictions = generateMockPredictions({
        trend: viewsTrend,
        engagement: engagementRate,
        conversion: conversionRate
      });

      return {
        performanceMetrics: {
          totalViews,
          totalEngagement: totalEngagements,
          averageTimeSpent,
          conversionRate: Math.round(conversionRate * 100) / 100,
          roi: Math.round((totalDownloads * 10 - totalViews * 0.1) * 100) / 100, // Mock ROI calculation
          trends: {
            views: Math.round(viewsTrend * 100) / 100,
            engagement: Math.round(engagementRate * 100) / 100,
            timeSpent: 0, // Would calculate from session data
            conversion: Math.round(conversionRate * 100) / 100
          }
        },
        usagePatterns: {
          totalSessions: uniqueSessions,
          uniqueUsers,
          averageSessionDuration: averageTimeSpent,
          bounceRate: Math.round(bounceRate * 100) / 100,
          pageViews: pageViewEvents.length,
          searchQueries: searchEvents.length
        },
        optimizationRecommendations,
        predictiveInsights: {
          performanceForecasts: predictions,
          contentDemandPrediction: [] // Would be populated with trend analysis
        }
      };
    },
    enabled: !!projectId && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Optimize content mutation
  const optimizeContentMutation = useMutation({
    mutationFn: async (contentId: string) => {
      if (!userId) throw new Error('User not authenticated');

      // Track optimization event
      const { error } = await supabase.functions.invoke('analytics-processor', {
        body: {
          event: 'custom_event',
          data: {
            projectId,
            userId,
            eventName: 'content_optimization_requested',
            eventCategory: 'optimization',
            entityType: 'content',
            entityId: contentId
          }
        }
      });

      if (error) throw error;
      return { success: true, contentId };
    },
    onSuccess: () => {
      toast({
        title: "Content optimization started",
        description: "Your content is being analyzed and optimized.",
      });
    },
    onError: (error) => {
      console.error('Optimization error:', error);
      toast({
        title: "Optimization failed",
        description: "Unable to start content optimization. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Generate predictive report mutation
  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('scheduled-analytics-aggregator');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Report generated",
        description: "Your predictive analytics report has been generated.",
      });
      // Refetch analytics data to get updated insights
      queryClient.invalidateQueries({ queryKey: ['advanced-content-analytics'] });
    },
    onError: (error) => {
      console.error('Report generation error:', error);
      toast({
        title: "Report generation failed",
        description: "Unable to generate report. Please try again.",
        variant: "destructive",
      });
    }
  });

  return {
    analyticsData,
    isLoading,
    error,
    refetch,
    optimizeContent: optimizeContentMutation.mutateAsync,
    generatePredictiveReport: generateReportMutation.mutateAsync,
    isOptimizing: optimizeContentMutation.isPending,
    isGeneratingReport: generateReportMutation.isPending
  };
};

export const useContentPerformanceOptimization = (projectId: string) => {
  const userId = useCurrentUserId();

  const { data: optimizationSuggestions = [], isLoading } = useQuery({
    queryKey: ['content-performance-optimization', projectId, userId],
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated');

      const { data: contentItems, error } = await supabase
        .from('content_items')
        .select(`
          *,
          content_analytics(*)
        `)
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) throw error;

      return contentItems?.map(item => {
        const analytics = item.content_analytics?.[0];
        const suggestions = [];

        if (!analytics || analytics.views < 10) {
          suggestions.push('Increase content visibility through better SEO and promotion');
        }

        if (analytics && analytics.engagement_rate < 2) {
          suggestions.push('Add interactive elements to boost engagement');
        }

        if (analytics && analytics.performance_score < 50) {
          suggestions.push('Review and improve content quality');
        }

        return {
          contentId: item.id,
          title: item.title,
          suggestions,
          priority: suggestions.length > 2 ? 'high' : suggestions.length > 0 ? 'medium' : 'low'
        };
      }).filter(item => item.suggestions.length > 0) || [];
    },
    enabled: !!projectId && !!userId,
    staleTime: 10 * 60 * 1000
  });

  return {
    optimizationSuggestions,
    totalItems: optimizationSuggestions.length,
    itemsNeedingOptimization: optimizationSuggestions.filter(item => item.priority === 'high').length,
    isLoading
  };
};