import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUserId } from './useCurrentUserId';

export interface SettingsVersion {
  id: string;
  setting_type: string;
  entity_id: string;
  version_number: number;
  settings_data: any;
  change_summary?: string;
  changed_fields?: string[];
  created_by?: string;
  created_at: string;
  metadata?: any;
}

export interface VersioningHookResult {
  versions: SettingsVersion[];
  isLoading: boolean;
  error: Error | null;
  createVersion: (settingType: string, entityId: string, data: any, summary?: string) => Promise<void>;
  restoreVersion: (versionId: string) => Promise<any>;
  isCreating: boolean;
  isRestoring: boolean;
}

const fetchSettingsVersions = async (settingType: string, entityId: string): Promise<SettingsVersion[]> => {
  const { data, error } = await supabase
    .from('settings_versions')
    .select('*')
    .eq('setting_type', settingType)
    .eq('entity_id', entityId)
    .order('version_number', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch settings versions: ${error.message}`);
  }

  return data || [];
};

const createSettingsVersion = async (
  settingType: string,
  entityId: string,
  settingsData: any,
  changeSummary?: string,
  changedFields?: string[]
): Promise<string> => {
  const { data, error } = await supabase.rpc('create_settings_version', {
    p_setting_type: settingType,
    p_entity_id: entityId,
    p_settings_data: settingsData,
    p_change_summary: changeSummary,
    p_changed_fields: changedFields
  });

  if (error) {
    throw new Error(`Failed to create settings version: ${error.message}`);
  }

  return data;
};

const restoreSettingsVersion = async (versionId: string): Promise<any> => {
  const { data, error } = await supabase.rpc('restore_settings_from_version', {
    p_version_id: versionId
  });

  if (error) {
    throw new Error(`Failed to restore settings version: ${error.message}`);
  }

  return data;
};

export const useSettingsVersioning = (
  settingType: string,
  entityId: string
): VersioningHookResult => {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: versions = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['settings-versions', settingType, entityId],
    queryFn: () => fetchSettingsVersions(settingType, entityId),
    enabled: !!userId && !!settingType && !!entityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createVersionMutation = useMutation({
    mutationFn: ({ 
      settingType, 
      entityId, 
      data, 
      summary, 
      changedFields 
    }: {
      settingType: string;
      entityId: string;
      data: any;
      summary?: string;
      changedFields?: string[];
    }) => createSettingsVersion(settingType, entityId, data, summary, changedFields),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['settings-versions', settingType, entityId] 
      });
      toast({
        title: "Version Created",
        description: "Settings version created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Version Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const restoreVersionMutation = useMutation({
    mutationFn: restoreSettingsVersion,
    onSuccess: (restoredData) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ 
        queryKey: ['settings-versions', settingType, entityId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`${settingType}-settings`] 
      });
      
      toast({
        title: "Settings Restored",
        description: "Settings have been restored from the selected version.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Restore Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const createVersion = async (
    settingType: string,
    entityId: string,
    data: any,
    summary?: string
  ) => {
    await createVersionMutation.mutateAsync({
      settingType,
      entityId,
      data,
      summary
    });
  };

  const restoreVersion = async (versionId: string) => {
    return await restoreVersionMutation.mutateAsync(versionId);
  };

  return {
    versions,
    isLoading,
    error: error as Error | null,
    createVersion,
    restoreVersion,
    isCreating: createVersionMutation.isPending,
    isRestoring: restoreVersionMutation.isPending
  };
};

// Hook for settings history/comparison
export const useSettingsHistory = (settingType: string, entityId: string) => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['settings-history', settingType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings_audit_logs')
        .select('*')
        .eq('setting_type', settingType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(`Failed to fetch settings history: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!userId && !!settingType && !!entityId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};