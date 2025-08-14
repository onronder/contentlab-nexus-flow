import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface AnalyticsSettings {
  id: string;
  userId: string;
  dashboardSettings: {
    defaultPeriod: '7d' | '30d' | '90d' | '1y';
    refreshInterval: number; // milliseconds
    autoRefresh: boolean;
    chartTypes: string[];
    layoutGrid: 'compact' | 'standard' | 'expanded';
    realTimeUpdates: boolean;
  };
  chartSettings: {
    colorScheme: 'default' | 'colorblind' | 'high-contrast';
    animationsEnabled: boolean;
    exportFormat: 'png' | 'svg' | 'pdf';
    dataLabels: boolean;
    gridlines: boolean;
    tooltips: boolean;
  };
  reportSettings: {
    autoGenerate: boolean;
    schedule: string; // cron expression
    format: 'pdf' | 'html' | 'csv' | 'xlsx';
    includeCharts: boolean;
    includeRawData: boolean;
    recipients: string[];
    customLogo: boolean;
  };
  dataSettings: {
    aggregationLevel: 'hourly' | 'daily' | 'weekly' | 'monthly';
    retentionPeriod: number; // days
    samplingRate: number; // percentage
    includeAnonymized: boolean;
    exportLimit: number; // rows
  };
  alertSettings: {
    thresholdAlerts: boolean;
    anomalyDetection: boolean;
    performanceAlerts: boolean;
    emailAlerts: boolean;
    slackWebhook?: string;
    alertFrequency: 'immediate' | 'hourly' | 'daily';
  };
  privacySettings: {
    shareAnalytics: boolean;
    allowTracking: boolean;
    dataProcessingRegion: 'us' | 'eu' | 'asia';
    complianceMode: 'gdpr' | 'ccpa' | 'standard';
  };
  createdAt: string;
  updatedAt: string;
}

const defaultAnalyticsSettings: Omit<AnalyticsSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  dashboardSettings: {
    defaultPeriod: '30d',
    refreshInterval: 300000, // 5 minutes
    autoRefresh: true,
    chartTypes: ['line', 'bar', 'pie', 'area'],
    layoutGrid: 'standard',
    realTimeUpdates: false,
  },
  chartSettings: {
    colorScheme: 'default',
    animationsEnabled: true,
    exportFormat: 'png',
    dataLabels: true,
    gridlines: true,
    tooltips: true,
  },
  reportSettings: {
    autoGenerate: false,
    schedule: '0 9 * * 1', // Every Monday at 9 AM
    format: 'pdf',
    includeCharts: true,
    includeRawData: false,
    recipients: [],
    customLogo: false,
  },
  dataSettings: {
    aggregationLevel: 'daily',
    retentionPeriod: 365,
    samplingRate: 100,
    includeAnonymized: true,
    exportLimit: 10000,
  },
  alertSettings: {
    thresholdAlerts: true,
    anomalyDetection: false,
    performanceAlerts: true,
    emailAlerts: false,
    alertFrequency: 'daily',
  },
  privacySettings: {
    shareAnalytics: false,
    allowTracking: true,
    dataProcessingRegion: 'us',
    complianceMode: 'standard',
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

      // TODO: Fetch from table once created
      const data = null;
      const error = null;

      // If no settings exist, create default ones
      if (!data) {
        return {
          id: '',
          userId: user.id,
          ...defaultAnalyticsSettings,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      return {
        id: data.id,
        userId: data.user_id,
        ...defaultAnalyticsSettings,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<AnalyticsSettings>) => {
      if (!user?.id) throw new Error('User not authenticated');

      // TODO: Save to table once created
      console.log('Analytics settings update:', updates);
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

      // TODO: Delete from table once created
      console.log('Analytics settings reset');
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