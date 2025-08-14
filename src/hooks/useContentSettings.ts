import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface ContentSettings {
  id: string;
  userId: string;
  managementSettings: {
    defaultView: 'grid' | 'list' | 'gallery';
    itemsPerPage: number;
    sortBy: 'created_at' | 'updated_at' | 'title' | 'file_size' | 'status';
    sortOrder: 'asc' | 'desc';
    showPreview: boolean;
    autoTags: boolean;
    autoCategories: boolean;
  };
  workflowSettings: {
    requireApproval: boolean;
    autoPublish: boolean;
    versionControl: boolean;
    collaborationMode: boolean;
    defaultStatus: 'draft' | 'review' | 'published';
    retentionDays: number;
  };
  uploadSettings: {
    maxFileSize: number; // in MB
    allowedTypes: string[];
    autoOptimize: boolean;
    generateThumbnails: boolean;
    compressionLevel: 'low' | 'medium' | 'high';
    watermarkEnabled: boolean;
  };
  organizationSettings: {
    folderStructure: 'flat' | 'hierarchical' | 'date-based';
    namingConvention: 'original' | 'standardized' | 'custom';
    duplicateHandling: 'rename' | 'replace' | 'skip';
    archiveAfterDays: number;
  };
  searchSettings: {
    indexContent: boolean;
    fullTextSearch: boolean;
    metadataSearch: boolean;
    aiTagging: boolean;
    customFields: Record<string, any>;
  };
  createdAt: string;
  updatedAt: string;
}

const defaultContentSettings: Omit<ContentSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  managementSettings: {
    defaultView: 'grid',
    itemsPerPage: 20,
    sortBy: 'updated_at',
    sortOrder: 'desc',
    showPreview: true,
    autoTags: true,
    autoCategories: false,
  },
  workflowSettings: {
    requireApproval: false,
    autoPublish: false,
    versionControl: true,
    collaborationMode: true,
    defaultStatus: 'draft',
    retentionDays: 365,
  },
  uploadSettings: {
    maxFileSize: 100, // 100MB
    allowedTypes: ['image/*', 'video/*', 'application/pdf', 'text/*'],
    autoOptimize: true,
    generateThumbnails: true,
    compressionLevel: 'medium',
    watermarkEnabled: false,
  },
  organizationSettings: {
    folderStructure: 'hierarchical',
    namingConvention: 'original',
    duplicateHandling: 'rename',
    archiveAfterDays: 0, // 0 = never
  },
  searchSettings: {
    indexContent: true,
    fullTextSearch: true,
    metadataSearch: true,
    aiTagging: false,
    customFields: {},
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

      const { data, error } = await supabase.rpc('get_content_settings_safe', {
        p_user_id: user.id,
      });

      if (error) throw error;

      // If no settings exist, create default ones
      if (!data || data.length === 0) {
        return {
          id: '',
          userId: user.id,
          ...defaultContentSettings,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      return data[0];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<ContentSettings>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase.rpc('update_content_settings_safe', {
        p_user_id: user.id,
        p_settings: updates,
      });

      if (error) throw error;
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

      const { error } = await supabase.rpc('reset_content_settings_to_defaults', {
        p_user_id: user.id,
      });

      if (error) throw error;
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