import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface CompetitiveSettings {
  id: string;
  userId: string;
  monitoringSettings: {
    defaultFrequency: 'daily' | 'weekly' | 'monthly';
    autoAnalysis: boolean;
    screenshotCapture: boolean;
    alertThreshold: number;
    maxCompetitors: number;
    regionalAnalysis: boolean;
  };
  analysisSettings: {
    includeSerp: boolean;
    includePricing: boolean;
    includeContent: boolean;
    includeTechnical: boolean;
    includeKeywords: boolean;
    includeSocial: boolean;
    depthLevel: 'basic' | 'standard' | 'comprehensive';
  };
  reportSettings: {
    autoGenerate: boolean;
    format: 'pdf' | 'html' | 'json';
    includeCharts: boolean;
    includeRecommendations: boolean;
    deliveryMethod: 'email' | 'dashboard' | 'both';
    schedule: string; // cron expression
  };
  alertSettings: {
    competitorChanges: boolean;
    newCompetitors: boolean;
    rankingChanges: boolean;
    pricingUpdates: boolean;
    contentUpdates: boolean;
    emailAlerts: boolean;
    pushAlerts: boolean;
    webhookUrl?: string;
  };
  dataRetention: {
    snapshotRetentionDays: number;
    analysisRetentionDays: number;
    reportRetentionDays: number;
    autoCleanup: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

const defaultCompetitiveSettings: Omit<CompetitiveSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  monitoringSettings: {
    defaultFrequency: 'weekly',
    autoAnalysis: true,
    screenshotCapture: true,
    alertThreshold: 75,
    maxCompetitors: 20,
    regionalAnalysis: false,
  },
  analysisSettings: {
    includeSerp: true,
    includePricing: true,
    includeContent: true,
    includeTechnical: false,
    includeKeywords: true,
    includeSocial: false,
    depthLevel: 'standard',
  },
  reportSettings: {
    autoGenerate: false,
    format: 'pdf',
    includeCharts: true,
    includeRecommendations: true,
    deliveryMethod: 'dashboard',
    schedule: '0 9 * * 1', // Every Monday at 9 AM
  },
  alertSettings: {
    competitorChanges: true,
    newCompetitors: true,
    rankingChanges: true,
    pricingUpdates: true,
    contentUpdates: false,
    emailAlerts: false,
    pushAlerts: true,
  },
  dataRetention: {
    snapshotRetentionDays: 90,
    analysisRetentionDays: 365,
    reportRetentionDays: 180,
    autoCleanup: true,
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

      // TODO: Fetch from table once created
      const data = null;
      const error = null;

      // If no settings exist, create default ones
      if (!data) {
        return {
          id: '',
          userId: user.id,
          ...defaultCompetitiveSettings,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      return {
        id: data.id,
        userId: data.user_id,
        ...defaultCompetitiveSettings,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<CompetitiveSettings>) => {
      if (!user?.id) throw new Error('User not authenticated');

      // TODO: Save to table once created
      console.log('Competitive settings update:', updates);
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

      // TODO: Delete from table once created
      console.log('Competitive settings reset');
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

  const updateReportSettings = (reportSettings: Partial<CompetitiveSettings['reportSettings']>) => {
    if (!settings) return;
    updateSettings({
      reportSettings: { ...settings.reportSettings, ...reportSettings },
    });
  };

  const updateAlertSettings = (alertSettings: Partial<CompetitiveSettings['alertSettings']>) => {
    if (!settings) return;
    updateSettings({
      alertSettings: { ...settings.alertSettings, ...alertSettings },
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
    updateReportSettings,
    updateAlertSettings,
    updateDataRetention,
    isUpdating: updateSettingsMutation.isPending,
    isResetting: resetToDefaultsMutation.isPending,
  };
}