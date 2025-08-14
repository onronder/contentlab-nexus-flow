import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface ProjectSettings {
  id: string;
  projectId: string;
  dashboardPreferences: {
    defaultView: 'overview' | 'competitors' | 'analytics' | 'content';
    chartLayout: 'grid' | 'stack';
    refreshInterval: number;
    autoRefresh: boolean;
    visibleMetrics: string[];
  };
  analysisSettings: {
    autoTrigger: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    includeScreenshots: boolean;
    alertThreshold: number;
    reportFormat: 'pdf' | 'html' | 'json';
  };
  notificationSettings: {
    competitorChanges: boolean;
    analysisComplete: boolean;
    weeklyReports: boolean;
    criticalAlerts: boolean;
    emailNotifications: boolean;
  };
  collaborationSettings: {
    allowComments: boolean;
    requireApproval: boolean;
    shareByDefault: boolean;
    memberPermissions: Record<string, string[]>;
  };
  customSettings: Record<string, any>;
  inheritFromTeam: boolean;
  createdAt: string;
  updatedAt: string;
}

const defaultProjectSettings: Omit<ProjectSettings, 'id' | 'projectId' | 'createdAt' | 'updatedAt'> = {
  dashboardPreferences: {
    defaultView: 'overview',
    chartLayout: 'grid',
    refreshInterval: 300000, // 5 minutes
    autoRefresh: true,
    visibleMetrics: ['competitors', 'analysis', 'alerts', 'activity'],
  },
  analysisSettings: {
    autoTrigger: true,
    frequency: 'weekly',
    includeScreenshots: true,
    alertThreshold: 75,
    reportFormat: 'pdf',
  },
  notificationSettings: {
    competitorChanges: true,
    analysisComplete: true,
    weeklyReports: true,
    criticalAlerts: true,
    emailNotifications: false,
  },
  collaborationSettings: {
    allowComments: true,
    requireApproval: false,
    shareByDefault: false,
    memberPermissions: {},
  },
  customSettings: {},
  inheritFromTeam: true,
};

export function useProjectSettings(projectId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['project-settings', projectId, user?.id],
    queryFn: async (): Promise<ProjectSettings> => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('get_project_settings_safe', {
        p_project_id: projectId,
        p_user_id: user.id,
      });

      if (error) throw error;

      // If no settings exist, create default ones
      if (!data || data.length === 0) {
        return {
          id: '',
          projectId,
          ...defaultProjectSettings,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      return data[0];
    },
    enabled: !!user?.id && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<ProjectSettings>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase.rpc('update_project_settings_safe', {
        p_project_id: projectId,
        p_user_id: user.id,
        p_settings: updates,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-settings', projectId] });
      toast({
        title: 'Settings Updated',
        description: 'Project settings have been successfully updated.',
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

      const { error } = await supabase.rpc('reset_project_settings_to_defaults', {
        p_project_id: projectId,
        p_user_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-settings', projectId] });
      toast({
        title: 'Settings Reset',
        description: 'Project settings have been reset to defaults.',
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

  const inheritFromTeamMutation = useMutation({
    mutationFn: async (inherit: boolean) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase.rpc('toggle_project_settings_inheritance', {
        p_project_id: projectId,
        p_user_id: user.id,
        p_inherit: inherit,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-settings', projectId] });
      toast({
        title: 'Inheritance Updated',
        description: 'Project settings inheritance has been updated.',
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

  const updateSettings = (updates: Partial<ProjectSettings>) => {
    updateSettingsMutation.mutate(updates);
  };

  const resetToDefaults = () => {
    resetToDefaultsMutation.mutate();
  };

  const setInheritFromTeam = (inherit: boolean) => {
    inheritFromTeamMutation.mutate(inherit);
  };

  // Helper functions for specific setting updates
  const updateDashboardPreferences = (preferences: Partial<ProjectSettings['dashboardPreferences']>) => {
    if (!settings) return;
    updateSettings({
      dashboardPreferences: { ...settings.dashboardPreferences, ...preferences },
    });
  };

  const updateAnalysisSettings = (analysisSettings: Partial<ProjectSettings['analysisSettings']>) => {
    if (!settings) return;
    updateSettings({
      analysisSettings: { ...settings.analysisSettings, ...analysisSettings },
    });
  };

  const updateNotificationSettings = (notificationSettings: Partial<ProjectSettings['notificationSettings']>) => {
    if (!settings) return;
    updateSettings({
      notificationSettings: { ...settings.notificationSettings, ...notificationSettings },
    });
  };

  const updateCollaborationSettings = (collaborationSettings: Partial<ProjectSettings['collaborationSettings']>) => {
    if (!settings) return;
    updateSettings({
      collaborationSettings: { ...settings.collaborationSettings, ...collaborationSettings },
    });
  };

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    resetToDefaults,
    setInheritFromTeam,
    updateDashboardPreferences,
    updateAnalysisSettings,
    updateNotificationSettings,
    updateCollaborationSettings,
    isUpdating: updateSettingsMutation.isPending,
    isResetting: resetToDefaultsMutation.isPending,
  };
}