import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface AnalyticsPrediction {
  id: string;
  team_id: string;
  prediction_type: 'content_performance' | 'collaboration_efficiency' | 'user_engagement' | 'market_trends' | 'competitive_analysis';
  input_data: any;
  prediction_data: any;
  confidence_level: number;
  model_version: string;
  accuracy_score?: number;
  status: 'active' | 'expired' | 'invalid';
  valid_until: string;
  created_at: string;
  updated_at: string;
}

export interface CustomDashboard {
  id: string;
  user_id: string;
  team_id: string;
  name: string;
  description?: string;
  dashboard_config: any;
  widgets: any[];
  filters: any;
  sharing_settings: any;
  view_count: number;
  is_template: boolean;
  template_category?: string;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsStream {
  id: string;
  stream_name: string;
  data_source: string;
  aggregation_rules: any;
  real_time_data: any;
  last_processed_at?: string;
  processing_status: 'active' | 'paused' | 'error' | 'stopped';
  error_log: any[];
  created_at: string;
  updated_at: string;
}

export const useAdvancedAnalytics = (teamId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedPredictionType, setSelectedPredictionType] = useState<AnalyticsPrediction['prediction_type']>('user_engagement');
  const [isGeneratingPrediction, setIsGeneratingPrediction] = useState(false);

  // Fetch analytics predictions
  const {
    data: predictions = [],
    isLoading: isLoadingPredictions,
    error: predictionsError
  } = useQuery({
    queryKey: ['analytics-predictions', teamId],
    queryFn: async () => {
      let query = supabase
        .from('analytics_predictions')
        .select('*')
        .order('created_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AnalyticsPrediction[];
    },
    enabled: !!teamId,
    staleTime: 60000, // 1 minute
  });

  // Fetch custom dashboards
  const {
    data: dashboards = [],
    isLoading: isLoadingDashboards,
    error: dashboardsError
  } = useQuery({
    queryKey: ['custom-dashboards', user?.id, teamId],
    queryFn: async () => {
      let query = supabase
        .from('custom_dashboards')
        .select('*')
        .order('created_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      } else if (user?.id) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CustomDashboard[];
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Fetch analytics streams
  const {
    data: streams = [],
    isLoading: isLoadingStreams,
    error: streamsError
  } = useQuery({
    queryKey: ['analytics-streams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_streams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AnalyticsStream[];
    },
    staleTime: 30000,
  });

  // Generate predictive analytics
  const generatePredictionMutation = useMutation({
    mutationFn: async ({ predictionType, timeHorizon = 30 }: { 
      predictionType: AnalyticsPrediction['prediction_type']; 
      timeHorizon?: number; 
    }) => {
      console.log(`Generating prediction: ${predictionType} for team ${teamId}`);
      
      const { data, error } = await supabase.functions.invoke('predictive-analytics-engine', {
        body: {
          teamId,
          predictionType,
          timeHorizon
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-predictions', teamId] });
      toast({
        title: "Prediction Generated",
        description: "New predictive analytics data is ready for analysis.",
      });
    },
    onError: (error: Error) => {
      console.error('Prediction generation error:', error);
      toast({
        title: "Prediction Failed",
        description: error.message || "Failed to generate prediction. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Create custom dashboard
  const createDashboardMutation = useMutation({
    mutationFn: async (dashboardData: Omit<CustomDashboard, 'id' | 'created_at' | 'updated_at' | 'view_count'>) => {
      const { data, error } = await supabase
        .from('custom_dashboards')
        .insert({
          ...dashboardData,
          user_id: user?.id,
          team_id: teamId || null,
          view_count: 0
        })
        .select()
        .single();

      if (error) throw error;
      return data as CustomDashboard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-dashboards', user?.id, teamId] });
      toast({
        title: "Dashboard Created",
        description: "Your custom dashboard has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Dashboard Creation Failed",
        description: error.message || "Failed to create dashboard.",
        variant: "destructive",
      });
    }
  });

  // Update dashboard
  const updateDashboardMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CustomDashboard> }) => {
      const { data, error } = await supabase
        .from('custom_dashboards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CustomDashboard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-dashboards', user?.id, teamId] });
      toast({
        title: "Dashboard Updated",
        description: "Dashboard has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update dashboard.",
        variant: "destructive",
      });
    }
  });

  // Analytics stream operations
  const streamOperationMutation = useMutation({
    mutationFn: async ({ 
      streamName, 
      action, 
      aggregationRules = {} 
    }: { 
      streamName: string; 
      action: 'create' | 'get' | 'update' | 'process'; 
      aggregationRules?: any; 
    }) => {
      const { data, error } = await supabase.functions.invoke('analytics-streaming', {
        body: {
          streamName,
          action,
          aggregationRules
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      if (variables.action === 'create' || variables.action === 'update' || variables.action === 'process') {
        queryClient.invalidateQueries({ queryKey: ['analytics-streams'] });
      }
      
      if (variables.action === 'create') {
        toast({
          title: "Stream Created",
          description: `Analytics stream '${variables.streamName}' has been created.`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Stream Operation Failed",
        description: error.message || "Failed to perform stream operation.",
        variant: "destructive",
      });
    }
  });

  // Generate prediction
  const generatePrediction = useCallback(async (
    predictionType: AnalyticsPrediction['prediction_type'], 
    timeHorizon?: number
  ) => {
    if (!teamId) {
      toast({
        title: "Team Required",
        description: "Please select a team to generate predictions.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPrediction(true);
    try {
      await generatePredictionMutation.mutateAsync({ predictionType, timeHorizon });
    } finally {
      setIsGeneratingPrediction(false);
    }
  }, [teamId, generatePredictionMutation, toast]);

  // Create dashboard
  const createDashboard = useCallback(async (dashboardConfig: {
    name: string;
    description?: string;
    dashboard_config: any;
    widgets: any[];
    filters?: any;
    sharing_settings?: any;
    is_template?: boolean;
    template_category?: string;
  }) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create dashboards.",
        variant: "destructive",
      });
      return;
    }

    await createDashboardMutation.mutateAsync({
      ...dashboardConfig,
      user_id: user.id,
      team_id: teamId || '',
      filters: dashboardConfig.filters || {},
      sharing_settings: dashboardConfig.sharing_settings || { public: false, team_access: true },
      is_template: dashboardConfig.is_template || false
    });
  }, [user?.id, teamId, createDashboardMutation, toast]);

  // Update dashboard
  const updateDashboard = useCallback(async (id: string, updates: Partial<CustomDashboard>) => {
    await updateDashboardMutation.mutateAsync({ id, updates });
  }, [updateDashboardMutation]);

  // Stream operations
  const createStream = useCallback(async (streamName: string, aggregationRules?: any) => {
    await streamOperationMutation.mutateAsync({ streamName, action: 'create', aggregationRules });
  }, [streamOperationMutation]);

  const getStreamData = useCallback(async (streamName: string) => {
    return await streamOperationMutation.mutateAsync({ streamName, action: 'get' });
  }, [streamOperationMutation]);

  const processStream = useCallback(async (streamName: string) => {
    await streamOperationMutation.mutateAsync({ streamName, action: 'process' });
  }, [streamOperationMutation]);

  // Get predictions by type
  const getPredictionsByType = useCallback((type: AnalyticsPrediction['prediction_type']) => {
    return predictions.filter(prediction => prediction.prediction_type === type);
  }, [predictions]);

  // Get active predictions
  const getActivePredictions = useCallback(() => {
    return predictions.filter(prediction => 
      prediction.status === 'active' && 
      new Date(prediction.valid_until) > new Date()
    );
  }, [predictions]);

  // Get high confidence predictions
  const getHighConfidencePredictions = useCallback((threshold = 0.8) => {
    return predictions.filter(prediction => prediction.confidence_level >= threshold);
  }, [predictions]);

  // Get template dashboards
  const getTemplateDashboards = useCallback(() => {
    return dashboards.filter(dashboard => dashboard.is_template);
  }, [dashboards]);

  // Get user dashboards
  const getUserDashboards = useCallback(() => {
    return dashboards.filter(dashboard => !dashboard.is_template);
  }, [dashboards]);

  return {
    // Data
    predictions,
    dashboards,
    streams,
    activePredictions: getActivePredictions(),
    highConfidencePredictions: getHighConfidencePredictions(),
    templateDashboards: getTemplateDashboards(),
    userDashboards: getUserDashboards(),
    
    // State
    isLoadingPredictions,
    isLoadingDashboards,
    isLoadingStreams,
    isGeneratingPrediction: isGeneratingPrediction || generatePredictionMutation.isPending,
    isCreatingDashboard: createDashboardMutation.isPending,
    isUpdatingDashboard: updateDashboardMutation.isPending,
    isProcessingStream: streamOperationMutation.isPending,
    selectedPredictionType,
    
    // Actions
    generatePrediction,
    createDashboard,
    updateDashboard,
    createStream,
    getStreamData,
    processStream,
    setSelectedPredictionType,
    
    // Utilities
    getPredictionsByType,
    getActivePredictions,
    getHighConfidencePredictions,
    getTemplateDashboards,
    getUserDashboards,
    
    // Errors
    error: predictionsError || dashboardsError || streamsError,
  };
};