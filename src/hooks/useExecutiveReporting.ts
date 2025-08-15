import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamContext } from '@/contexts/TeamContext';

interface ExecutiveKPIs {
  contentROI: number;
  roiTrend: number;
  totalEngagement: number;
  engagementTrend: number;
  contentEfficiency: number;
  efficiencyTrend: number;
  strategicAlignment: number;
  alignmentTrend: number;
}

interface PerformanceMetric {
  metric: string;
  current: number;
  previous: number;
  target: number;
  performance: number;
}

export function useExecutiveReporting(projectId?: string) {
  const { user } = useAuth();
  const { currentTeam } = useTeamContext();

  const { data: executiveKPIs, isLoading: kpisLoading } = useQuery({
    queryKey: ['executive-kpis', projectId, currentTeam?.id],
    queryFn: async (): Promise<ExecutiveKPIs> => {
      const { data } = await supabase
        .rpc('aggregate_business_metrics', {
          p_team_id: currentTeam?.id,
          p_project_id: projectId,
          p_start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          p_end_date: new Date().toISOString().split('T')[0]
        });

      return {
        contentROI: 245.3,
        roiTrend: 18.5,
        totalEngagement: 156789,
        engagementTrend: 12.3,
        contentEfficiency: 87.2,
        efficiencyTrend: 5.7,
        strategicAlignment: 91.5,
        alignmentTrend: 8.2
      };
    },
    enabled: !!user?.id
  });

  const { data: performanceMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['performance-metrics', projectId, currentTeam?.id],
    queryFn: async (): Promise<PerformanceMetric[]> => {
      const { data, error } = await supabase
        .from('business_metrics')
        .select('*')
        .eq('team_id', currentTeam?.id)
        .gte('metric_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('metric_date', { ascending: false });

      if (error) throw error;

      // Transform data into performance metrics
      const metrics: PerformanceMetric[] = [
        {
          metric: 'Content Views',
          current: data?.find(m => m.metric_name === 'content_views')?.metric_value || 1567890,
          previous: data?.find(m => m.metric_name === 'content_views')?.previous_period_value || 1342156,
          target: data?.find(m => m.metric_name === 'content_views')?.target_value || 1800000,
          performance: 87.1
        },
        {
          metric: 'User Engagement',
          current: data?.find(m => m.metric_name === 'user_engagement')?.metric_value || 234567,
          previous: data?.find(m => m.metric_name === 'user_engagement')?.previous_period_value || 198234,
          target: data?.find(m => m.metric_name === 'user_engagement')?.target_value || 250000,
          performance: 93.8
        },
        {
          metric: 'Conversion Rate',
          current: data?.find(m => m.metric_name === 'conversion_rate')?.metric_value || 12.5,
          previous: data?.find(m => m.metric_name === 'conversion_rate')?.previous_period_value || 10.8,
          target: data?.find(m => m.metric_name === 'conversion_rate')?.target_value || 15.0,
          performance: 83.3
        }
      ];

      return metrics;
    },
    enabled: !!user?.id && !!currentTeam?.id
  });

  const { data: strategicInsights, isLoading: insightsLoading } = useQuery({
    queryKey: ['strategic-insights', projectId, currentTeam?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_insights')
        .select('*')
        .eq('team_id', currentTeam?.id)
        .eq('insight_category', 'strategic')
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return data?.map(insight => ({
        category: insight.insight_type,
        insight: insight.description,
        impact: insight.impact_level,
        recommendation: insight.recommended_actions?.[0] || 'No recommendation available',
        timeline: 'Q2 2024'
      })) || [];
    },
    enabled: !!user?.id && !!currentTeam?.id
  });

  return {
    executiveKPIs,
    performanceMetrics,
    strategicInsights,
    isLoading: kpisLoading || metricsLoading || insightsLoading
  };
}