import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamContext } from '@/contexts/TeamContext';

interface PredictionData {
  date: string;
  actual?: number;
  predicted?: number;
  confidence?: number;
}

interface ContentDemandPrediction {
  category: string;
  currentDemand: number;
  predictedDemand: number;
  growth: number;
  confidence: number;
}

export function usePredictiveAnalytics(projectId?: string) {
  const { user } = useAuth();
  const { currentTeam } = useTeamContext();

  const { data: performanceForecasts, isLoading: forecastsLoading } = useQuery({
    queryKey: ['performance-forecasts', projectId, currentTeam?.id],
    queryFn: async (): Promise<PredictionData[]> => {
      const { RealPredictiveAnalytics } = await import('@/services/realPredictiveAnalytics');
      
      const forecasts = await RealPredictiveAnalytics.generatePerformanceForecasts(
        currentTeam?.id,
        projectId
      );

      return forecasts.map(forecast => ({
        date: forecast.date,
        actual: forecast.actual || undefined,
        predicted: forecast.predicted || undefined,
        confidence: forecast.confidence || undefined
      }));
    },
    enabled: !!user?.id && !!currentTeam?.id
  });

  const { data: contentDemandPrediction, isLoading: demandLoading } = useQuery({
    queryKey: ['content-demand-prediction', currentTeam?.id],
    queryFn: async (): Promise<ContentDemandPrediction[]> => {
      const { StatisticalModels } = await import('@/services/statisticalModels');
      
      const predictions = await StatisticalModels.generateContentDemandPrediction(currentTeam?.id);
      
      return predictions;
    },
    enabled: !!user?.id && !!currentTeam?.id
  });

  const { data: strategicRecommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: ['strategic-recommendations', currentTeam?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_insights')
        .select('*')
        .eq('team_id', currentTeam?.id)
        .eq('is_actionable', true)
        .eq('is_dismissed', false)
        .order('confidence_score', { ascending: false })
        .limit(5);

      if (error) throw error;

      return data?.map(insight => ({
        type: insight.insight_category,
        priority: insight.impact_level,
        prediction: insight.description,
        recommendation: insight.recommended_actions?.[0] || 'No recommendation available',
        impact: 'Positive impact expected',
        confidence: insight.confidence_score
      })) || [];
    },
    enabled: !!user?.id && !!currentTeam?.id
  });

  return {
    performanceForecasts,
    contentDemandPrediction,
    strategicRecommendations,
    isLoading: forecastsLoading || demandLoading || recommendationsLoading
  };
}