import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface AnalyticsSettings {
  id: string;
  userId: string;
  teamId: string | null;
  dashboardSettings: {
    defaultDateRange: '7d' | '30d' | '90d' | '1y';
    refreshInterval: number;
    showRealTime: boolean;
  };
  chartSettings: {
    defaultChartType: 'line' | 'bar' | 'area' | 'pie';
    showDataLabels: boolean;
    enableInteractivity: boolean;
  };
  reportSettings: {
    autoGenerate: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    format: 'pdf' | 'html' | 'csv';
  };
  dataSettings: {
    dataRetention: number; // days
    aggregationLevel: 'hourly' | 'daily' | 'weekly';
    includeRawData: boolean;
  };
  alertSettings: {
    thresholdAlerts: boolean;
    anomalyDetection: boolean;
    alertChannels: string[];
  };
  privacySettings: {
    shareAnalytics: boolean;
    anonymizeData: boolean;
    dataExport: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

const defaultAnalyticsSettings: Omit<AnalyticsSettings, 'id' | 'userId' | 'teamId' | 'createdAt' | 'updatedAt'> = {
  dashboardSettings: {
    defaultDateRange: '30d',
    refreshInterval: 300,
    showRealTime: false,
  },
  chartSettings: {
    defaultChartType: 'line',
    showDataLabels: true,
    enableInteractivity: true,
  },
  reportSettings: {
    autoGenerate: false,
    frequency: 'weekly',
    format: 'pdf',
  },
  dataSettings: {
    dataRetention: 365,
    aggregationLevel: 'daily',
    includeRawData: false,
  },
  alertSettings: {
    thresholdAlerts: true,
    anomalyDetection: false,
    alertChannels: ['email', 'inApp'],
  },
  privacySettings: {
    shareAnalytics: false,
    anonymizeData: true,
    dataExport: true,
  },
};

export function useAnalyticsSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['analytics-settings', user?.id],
    queryFn: async (): Promise<AnalyticsSettings> => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.rpc('get_or_create_analytics_settings', {
        p_user_id: user.id,
        p_team_id: null
      });

      if (error) throw error;
      
      return {
        id: data.id,
        userId: data.user_id,
        teamId: data.team_id,
        dashboardSettings: data.dashboard_settings,
        chartSettings: data.chart_settings,
        reportSettings: data.report_settings,
        dataSettings: data.data_settings,
        alertSettings: data.alert_settings,
        privacySettings: data.privacy_settings,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<AnalyticsSettings>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('analytics_settings')
        .update({
          dashboard_settings: updates.dashboardSettings,
          chart_settings: updates.chartSettings,
          report_settings: updates.reportSettings,
          data_settings: updates.dataSettings,
          alert_settings: updates.alertSettings,
          privacy_settings: updates.privacySettings
        })
        .eq('user_id', user.id)
        .is('team_id', null)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-settings'] });
      toast({
        title: 'Analytics Settings Updated',
        description: 'Your analytics preferences have been saved.',
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
        .from('analytics_settings')
        .update({
          dashboard_settings: defaultAnalyticsSettings.dashboardSettings,
          chart_settings: defaultAnalyticsSettings.chartSettings,
          report_settings: defaultAnalyticsSettings.reportSettings,
          data_settings: defaultAnalyticsSettings.dataSettings,
          alert_settings: defaultAnalyticsSettings.alertSettings,
          privacy_settings: defaultAnalyticsSettings.privacySettings
        })
        .eq('user_id', user.id)
        .is('team_id', null)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-settings'] });
      toast({
        title: 'Settings Reset',
        description: 'Analytics settings have been reset to defaults.',
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

  const updateSettings = (updates: Partial<AnalyticsSettings>) => {
    updateSettingsMutation.mutate(updates);
  };

  const resetToDefaults = () => {
    resetToDefaultsMutation.mutate();
  };

  // Helper functions for specific setting updates
  const updateDashboardSettings = (dashboardSettings: Partial<AnalyticsSettings['dashboardSettings']>) => {
    if (!settings) return;
    updateSettings({
      dashboardSettings: { ...settings.dashboardSettings, ...dashboardSettings },
    });
  };

  const updateChartSettings = (chartSettings: Partial<AnalyticsSettings['chartSettings']>) => {
    if (!settings) return;
    updateSettings({
      chartSettings: { ...settings.chartSettings, ...chartSettings },
    });
  };

  const updateReportSettings = (reportSettings: Partial<AnalyticsSettings['reportSettings']>) => {
    if (!settings) return;
    updateSettings({
      reportSettings: { ...settings.reportSettings, ...reportSettings },
    });
  };

  const updateDataSettings = (dataSettings: Partial<AnalyticsSettings['dataSettings']>) => {
    if (!settings) return;
    updateSettings({
      dataSettings: { ...settings.dataSettings, ...dataSettings },
    });
  };

  const updateAlertSettings = (alertSettings: Partial<AnalyticsSettings['alertSettings']>) => {
    if (!settings) return;
    updateSettings({
      alertSettings: { ...settings.alertSettings, ...alertSettings },
    });
  };

  const updatePrivacySettings = (privacySettings: Partial<AnalyticsSettings['privacySettings']>) => {
    if (!settings) return;
    updateSettings({
      privacySettings: { ...settings.privacySettings, ...privacySettings },
    });
  };

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    resetToDefaults,
    updateDashboardSettings,
    updateChartSettings,
    updateReportSettings,
    updateDataSettings,
    updateAlertSettings,
    updatePrivacySettings,
    isUpdating: updateSettingsMutation.isPending,
    isResetting: resetToDefaultsMutation.isPending,
  };
}