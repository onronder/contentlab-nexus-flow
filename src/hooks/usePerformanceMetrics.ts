import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from './useCurrentUserId';

export interface PerformanceMetrics {
  contentPerformance: number;
  contentPerformanceChange: number;
  marketCoverage: number;
  marketCoverageChange: number;
  competitiveScore: number;
  competitiveScoreChange: number;
}

const fetchPerformanceMetrics = async (userId: string): Promise<PerformanceMetrics> => {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

  // Get user's projects
  const { data: userProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('created_by', userId);

  const projectIds = userProjects?.map(p => p.id) || [];

  if (projectIds.length === 0) {
    return {
      contentPerformance: 0,
      contentPerformanceChange: 0,
      marketCoverage: 0,
      marketCoverageChange: 0,
      competitiveScore: 0,
      competitiveScoreChange: 0
    };
  }

  // Fetch content analytics for performance calculation
  const { data: contentAnalytics, error: contentError } = await supabase
    .from('content_analytics')
    .select(`
      performance_score,
      views,
      likes,
      shares,
      engagement_rate,
      analytics_date,
      content_items!inner(project_id)
    `)
    .in('content_items.project_id', projectIds)
    .gte('analytics_date', lastMonth.toISOString().split('T')[0]);

  if (contentError) throw contentError;

  // Calculate content performance (average performance score)
  const currentMonthContent = contentAnalytics?.filter(ca => 
    new Date(ca.analytics_date) >= lastMonth
  ) || [];
  
  const lastMonthContent = contentAnalytics?.filter(ca => 
    new Date(ca.analytics_date) < lastMonth
  ) || [];

  const currentContentPerformance = currentMonthContent.length > 0
    ? Math.round(currentMonthContent.reduce((sum, ca) => sum + (ca.performance_score || 0), 0) / currentMonthContent.length)
    : 0;

  const lastMonthContentPerformance = lastMonthContent.length > 0
    ? Math.round(lastMonthContent.reduce((sum, ca) => sum + (ca.performance_score || 0), 0) / lastMonthContent.length)
    : 0;

  const contentPerformanceChange = lastMonthContentPerformance > 0
    ? Math.round(((currentContentPerformance - lastMonthContentPerformance) / lastMonthContentPerformance) * 100)
    : currentContentPerformance > 0 ? 100 : 0;

  // Fetch competitor data for market coverage
  const { data: competitors } = await supabase
    .from('project_competitors')
    .select('id, industry, market_share_estimate')
    .in('project_id', projectIds)
    .eq('status', 'active');

  // Calculate market coverage (percentage of industries covered)
  const allIndustries = ['technology', 'healthcare', 'financial', 'retail', 'manufacturing', 
    'education', 'media', 'real_estate', 'automotive', 'energy'];
  
  const coveredIndustries = new Set(competitors?.map(c => c.industry).filter(Boolean) || []);
  const marketCoverage = Math.round((coveredIndustries.size / allIndustries.length) * 100);

  // For demo purposes, assume previous month had slightly less coverage
  const lastMonthMarketCoverage = Math.max(0, marketCoverage - 5);
  const marketCoverageChange = lastMonthMarketCoverage > 0
    ? Math.round(((marketCoverage - lastMonthMarketCoverage) / lastMonthMarketCoverage) * 100)
    : marketCoverage > 0 ? 100 : 0;

  // Calculate competitive score based on various factors
  const totalCompetitors = competitors?.length || 0;
  const avgMarketShare = competitors && competitors.length > 0
    ? competitors.reduce((sum, c) => sum + (c.market_share_estimate || 0), 0) / competitors.length
    : 0;

  const competitiveScore = Math.min(5.0, Math.round(
    (totalCompetitors * 0.1 + avgMarketShare * 0.05 + currentContentPerformance * 0.04) * 10
  ) / 10);

  // For demo purposes, assume previous score was slightly lower
  const lastMonthCompetitiveScore = Math.max(1.0, competitiveScore - 0.2);
  const competitiveScoreChange = Math.round(
    ((competitiveScore - lastMonthCompetitiveScore) / lastMonthCompetitiveScore) * 100
  );

  return {
    contentPerformance: currentContentPerformance,
    contentPerformanceChange,
    marketCoverage,
    marketCoverageChange,
    competitiveScore,
    competitiveScoreChange
  };
};

export const usePerformanceMetrics = () => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['performance-metrics', userId],
    queryFn: () => fetchPerformanceMetrics(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};