import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface CompetitiveSettings {
  id: string;
  userId: string;
  teamId: string | null;
  monitoringSettings: {
    autoMonitoring: boolean;
    frequency: 'hourly' | 'daily' | 'weekly';
    alertThreshold: number;
  };
  analysisSettings: {
    depthLevel: 'basic' | 'standard' | 'deep';
    includeSerp: boolean;
    trackChanges: boolean;
  };
  reportingSettings: {
    autoReports: boolean;
    reportFrequency: 'daily' | 'weekly' | 'monthly';
    includeCharts: boolean;
  };
  alertingSettings: {
    emailAlerts: boolean;
    inAppAlerts: boolean;
    severityFilter: 'low' | 'medium' | 'high';
  };
  dataRetention: {
    retentionPeriod: number; // days
    autoCleanup: boolean;
    exportBeforeCleanup: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

const defaultCompetitiveSettings: Omit<CompetitiveSettings, 'id' | 'userId' | 'teamId' | 'createdAt' | 'updatedAt'> = {
  monitoringSettings: {
    autoMonitoring: true,
    frequency: 'daily',
    alertThreshold: 0.15,
  },
  analysisSettings: {
    depthLevel: 'standard',
    includeSerp: true,
    trackChanges: true,
  },
  reportingSettings: {
    autoReports: false,
    reportFrequency: 'weekly',
    includeCharts: true,
  },
  alertingSettings: {
    emailAlerts: true,
    inAppAlerts: true,
    severityFilter: 'medium',
  },
  dataRetention: {
    retentionPeriod: 365,
    autoCleanup: true,
    exportBeforeCleanup: false,
  },
};

export function useCompetitiveSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['competitive-settings', user?.id],
    queryFn: async (): Promise<CompetitiveSettings> => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.rpc('get_or_create_competitive_settings', {
        p_user_id: user.id,
        p_team_id: null
      });

      if (error) throw error;
      
      return {
        id: data.id,
        userId: data.user_id,
        teamId: data.team_id,
        monitoringSettings: typeof data.monitoring_settings === 'object' ? data.monitoring_settings as CompetitiveSettings['monitoringSettings'] : defaultCompetitiveSettings.monitoringSettings,
        analysisSettings: typeof data.analysis_settings === 'object' ? data.analysis_settings as CompetitiveSettings['analysisSettings'] : defaultCompetitiveSettings.analysisSettings,
        reportingSettings: typeof data.reporting_settings === 'object' ? data.reporting_settings as CompetitiveSettings['reportingSettings'] : defaultCompetitiveSettings.reportingSettings,
        alertingSettings: typeof data.alerting_settings === 'object' ? data.alerting_settings as CompetitiveSettings['alertingSettings'] : defaultCompetitiveSettings.alertingSettings,
        dataRetention: typeof data.data_retention === 'object' ? data.data_retention as CompetitiveSettings['dataRetention'] : defaultCompetitiveSettings.dataRetention,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<CompetitiveSettings>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('competitive_settings')
        .update({
          monitoring_settings: updates.monitoringSettings,
          analysis_settings: updates.analysisSettings,
          reporting_settings: updates.reportingSettings,
          alerting_settings: updates.alertingSettings,
          data_retention: updates.dataRetention
        })
        .eq('user_id', user.id)
        .is('team_id', null)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitive-settings'] });
      toast({
        title: 'Competitive Settings Updated',
        description: 'Your competitive intelligence settings have been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetToDefaultsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('competitive_settings')
        .update({
          monitoring_settings: defaultCompetitiveSettings.monitoringSettings,
          analysis_settings: defaultCompetitiveSettings.analysisSettings,
          reporting_settings: defaultCompetitiveSettings.reportingSettings,
          alerting_settings: defaultCompetitiveSettings.alertingSettings,
          data_retention: defaultCompetitiveSettings.dataRetention
        })
        .eq('user_id', user.id)
        .is('team_id', null)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitive-settings'] });
      toast({
        title: 'Settings Reset',
        description: 'Competitive settings have been reset to defaults.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Reset Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateSettings = (updates: Partial<CompetitiveSettings>) => {
    updateSettingsMutation.mutate(updates);
  };

  const resetToDefaults = () => {
    resetToDefaultsMutation.mutate();
  };

  // Helper functions for specific setting updates
  const updateMonitoringSettings = (monitoringSettings: Partial<CompetitiveSettings['monitoringSettings']>) => {
    if (!settings) return;
    updateSettings({
      monitoringSettings: { ...settings.monitoringSettings, ...monitoringSettings },
    });
  };

  const updateAnalysisSettings = (analysisSettings: Partial<CompetitiveSettings['analysisSettings']>) => {
    if (!settings) return;
    updateSettings({
      analysisSettings: { ...settings.analysisSettings, ...analysisSettings },
    });
  };

  const updateReportingSettings = (reportingSettings: Partial<CompetitiveSettings['reportingSettings']>) => {
    if (!settings) return;
    updateSettings({
      reportingSettings: { ...settings.reportingSettings, ...reportingSettings },
    });
  };

  const updateAlertingSettings = (alertingSettings: Partial<CompetitiveSettings['alertingSettings']>) => {
    if (!settings) return;
    updateSettings({
      alertingSettings: { ...settings.alertingSettings, ...alertingSettings },
    });
  };

  const updateDataRetention = (dataRetention: Partial<CompetitiveSettings['dataRetention']>) => {
    if (!settings) return;
    updateSettings({
      dataRetention: { ...settings.dataRetention, ...dataRetention },
    });
  };

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    resetToDefaults,
    updateMonitoringSettings,
    updateAnalysisSettings,
    updateReportingSettings,
    updateAlertingSettings,
    updateDataRetention,
    isUpdating: updateSettingsMutation.isPending,
    isResetting: resetToDefaultsMutation.isPending,
  };
}