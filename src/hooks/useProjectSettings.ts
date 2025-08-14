import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface ProjectSettings {
  id: string;
  projectId: string;
  userId: string;
  dashboardPreferences: {
    defaultView: 'grid' | 'list';
    showMetrics: boolean;
    autoRefresh: boolean;
    refreshInterval: number;
  };
  analysisSettings: {
    autoAnalysis: boolean;
    analysisFrequency: 'daily' | 'weekly' | 'monthly';
    includeCompetitors: boolean;
    detailLevel: 'basic' | 'standard' | 'comprehensive';
  };
  notificationSettings: {
    email: boolean;
    inApp: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
    types: string[];
  };
  collaborationSettings: {
    allowComments: boolean;
    requireApproval: boolean;
    shareMode: 'private' | 'team' | 'public';
  };
  customSettings: Record<string, any>;
  inheritFromTeam: boolean;
  createdAt: string;
  updatedAt: string;
}

const defaultProjectSettings: Omit<ProjectSettings, 'id' | 'projectId' | 'userId' | 'createdAt' | 'updatedAt'> = {
  dashboardPreferences: {
    defaultView: 'grid',
    showMetrics: true,
    autoRefresh: false,
    refreshInterval: 300,
  },
  analysisSettings: {
    autoAnalysis: true,
    analysisFrequency: 'weekly',
    includeCompetitors: true,
    detailLevel: 'standard',
  },
  notificationSettings: {
    email: true,
    inApp: true,
    frequency: 'daily',
    types: ['alerts', 'reports', 'updates'],
  },
  collaborationSettings: {
    allowComments: true,
    requireApproval: false,
    shareMode: 'team',
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
      if (!user?.id || !projectId) throw new Error('User ID and project ID are required');

      const { data, error } = await supabase.rpc('get_or_create_project_settings', {
        p_project_id: projectId,
        p_user_id: user.id
      });

      if (error) throw error;
      
      return {
        id: data.id,
        projectId: data.project_id,
        userId: data.user_id,
        dashboardPreferences: data.dashboard_preferences as any,
        analysisSettings: data.analysis_settings as any,
        notificationSettings: data.notification_settings as any,
        collaborationSettings: data.collaboration_settings as any,
        customSettings: data.custom_settings as any,
        inheritFromTeam: data.inherit_from_team,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    },
    enabled: !!user?.id && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<ProjectSettings>) => {
      if (!user?.id || !projectId) throw new Error('User ID and project ID are required');

      const { data, error } = await supabase
        .from('project_settings')
        .update({
          dashboard_preferences: updates.dashboardPreferences,
          analysis_settings: updates.analysisSettings,
          notification_settings: updates.notificationSettings,
          collaboration_settings: updates.collaborationSettings,
          custom_settings: updates.customSettings,
          inherit_from_team: updates.inheritFromTeam
        })
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
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
      if (!user?.id || !projectId) throw new Error('User ID and project ID are required');

      const { data, error } = await supabase
        .from('project_settings')
        .update({
          dashboard_preferences: defaultProjectSettings.dashboardPreferences,
          analysis_settings: defaultProjectSettings.analysisSettings,
          notification_settings: defaultProjectSettings.notificationSettings,
          collaboration_settings: defaultProjectSettings.collaborationSettings,
          custom_settings: defaultProjectSettings.customSettings
        })
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
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
      if (!user?.id || !projectId) throw new Error('User ID and project ID are required');

      const { data, error } = await supabase
        .from('project_settings')
        .update({ inherit_from_team: inherit })
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
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