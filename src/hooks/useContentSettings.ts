import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface ContentSettings {
  id: string;
  userId: string;
  teamId: string | null;
  managementSettings: {
    autoSave: boolean;
    versionControl: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
  };
  workflowSettings: {
    approvalRequired: boolean;
    reviewSteps: number;
    autoPublish: boolean;
  };
  uploadSettings: {
    maxFileSize: number; // in bytes
    allowedTypes: string[];
    autoOptimize: boolean;
  };
  organizationSettings: {
    defaultTags: string[];
    autoTagging: boolean;
    categoryRequired: boolean;
  };
  searchSettings: {
    indexContent: boolean;
    enableFullText: boolean;
    searchHistory: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

const defaultContentSettings: Omit<ContentSettings, 'id' | 'userId' | 'teamId' | 'createdAt' | 'updatedAt'> = {
  managementSettings: {
    autoSave: true,
    versionControl: true,
    backupFrequency: 'daily',
  },
  workflowSettings: {
    approvalRequired: false,
    reviewSteps: 1,
    autoPublish: false,
  },
  uploadSettings: {
    maxFileSize: 10485760, // 10MB
    allowedTypes: ['image', 'document', 'video'],
    autoOptimize: true,
  },
  organizationSettings: {
    defaultTags: [],
    autoTagging: false,
    categoryRequired: false,
  },
  searchSettings: {
    indexContent: true,
    enableFullText: true,
    searchHistory: true,
  },
};

export function useContentSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['content-settings', user?.id],
    queryFn: async (): Promise<ContentSettings> => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.rpc('get_or_create_content_settings', {
        p_user_id: user.id,
        p_team_id: null // For now, we'll focus on user-level settings
      });

      if (error) throw error;
      
      return {
        id: data.id,
        userId: data.user_id,
        teamId: data.team_id,
        managementSettings: data.management_settings,
        workflowSettings: data.workflow_settings,
        uploadSettings: data.upload_settings,
        organizationSettings: data.organization_settings,
        searchSettings: data.search_settings,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<ContentSettings>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('content_settings')
        .update({
          management_settings: updates.managementSettings,
          workflow_settings: updates.workflowSettings,
          upload_settings: updates.uploadSettings,
          organization_settings: updates.organizationSettings,
          search_settings: updates.searchSettings
        })
        .eq('user_id', user.id)
        .is('team_id', null)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-settings'] });
      toast({
        title: 'Content Settings Updated',
        description: 'Your content management settings have been saved.',
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
        .from('content_settings')
        .update({
          management_settings: defaultContentSettings.managementSettings,
          workflow_settings: defaultContentSettings.workflowSettings,
          upload_settings: defaultContentSettings.uploadSettings,
          organization_settings: defaultContentSettings.organizationSettings,
          search_settings: defaultContentSettings.searchSettings
        })
        .eq('user_id', user.id)
        .is('team_id', null)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-settings'] });
      toast({
        title: 'Settings Reset',
        description: 'Content settings have been reset to defaults.',
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

  const updateSettings = (updates: Partial<ContentSettings>) => {
    updateSettingsMutation.mutate(updates);
  };

  const resetToDefaults = () => {
    resetToDefaultsMutation.mutate();
  };

  // Helper functions for specific setting updates
  const updateManagementSettings = (managementSettings: Partial<ContentSettings['managementSettings']>) => {
    if (!settings) return;
    updateSettings({
      managementSettings: { ...settings.managementSettings, ...managementSettings },
    });
  };

  const updateWorkflowSettings = (workflowSettings: Partial<ContentSettings['workflowSettings']>) => {
    if (!settings) return;
    updateSettings({
      workflowSettings: { ...settings.workflowSettings, ...workflowSettings },
    });
  };

  const updateUploadSettings = (uploadSettings: Partial<ContentSettings['uploadSettings']>) => {
    if (!settings) return;
    updateSettings({
      uploadSettings: { ...settings.uploadSettings, ...uploadSettings },
    });
  };

  const updateOrganizationSettings = (organizationSettings: Partial<ContentSettings['organizationSettings']>) => {
    if (!settings) return;
    updateSettings({
      organizationSettings: { ...settings.organizationSettings, ...organizationSettings },
    });
  };

  const updateSearchSettings = (searchSettings: Partial<ContentSettings['searchSettings']>) => {
    if (!settings) return;
    updateSettings({
      searchSettings: { ...settings.searchSettings, ...searchSettings },
    });
  };

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    resetToDefaults,
    updateManagementSettings,
    updateWorkflowSettings,
    updateUploadSettings,
    updateOrganizationSettings,
    updateSearchSettings,
    isUpdating: updateSettingsMutation.isPending,
    isResetting: resetToDefaultsMutation.isPending,
  };
}