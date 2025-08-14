import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUserId } from './useCurrentUserId';

export interface SettingsBackup {
  id: string;
  backup_name: string;
  description?: string;
  user_id: string;
  backup_data: any;
  backup_type: 'manual' | 'automatic' | 'scheduled';
  created_at: string;
  expires_at?: string;
  metadata?: any;
  file_size?: number;
  checksum?: string;
}

export interface BackupHookResult {
  backups: SettingsBackup[];
  isLoading: boolean;
  error: Error | null;
  createBackup: (name: string, description?: string, expiresAt?: Date) => Promise<void>;
  restoreBackup: (backupId: string) => Promise<void>;
  deleteBackup: (backupId: string) => Promise<void>;
  exportSettings: (format: 'json' | 'csv') => Promise<string>;
  importSettings: (data: string, format: 'json' | 'csv') => Promise<void>;
  isCreating: boolean;
  isRestoring: boolean;
  isDeleting: boolean;
  isExporting: boolean;
  isImporting: boolean;
}

const fetchSettingsBackups = async (userId: string): Promise<SettingsBackup[]> => {
  const { data, error } = await supabase
    .from('settings_backups')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch settings backups: ${error.message}`);
  }

  return (data || []).map(item => ({
    ...item,
    backup_type: item.backup_type as 'manual' | 'automatic' | 'scheduled'
  }));
};

const createSettingsBackup = async (
  userId: string,
  backupName: string,
  description?: string,
  expiresAt?: Date
): Promise<void> => {
  // Fetch all user settings
  const settingsQueries = await Promise.all([
    supabase.from('user_settings').select('*').eq('user_id', userId).single(),
    supabase.from('content_settings').select('*').eq('user_id', userId),
    supabase.from('competitive_settings').select('*').eq('user_id', userId),
    supabase.from('analytics_settings').select('*').eq('user_id', userId)
  ]);

  const backupData = {
    user_settings: settingsQueries[0].data,
    content_settings: settingsQueries[1].data,
    competitive_settings: settingsQueries[2].data,
    analytics_settings: settingsQueries[3].data,
    backup_timestamp: new Date().toISOString(),
    backup_version: '1.0'
  };

  const backupString = JSON.stringify(backupData);
  const fileSize = new Blob([backupString]).size;

  const { error } = await supabase
    .from('settings_backups')
    .insert({
      backup_name: backupName,
      description,
      user_id: userId,
      backup_data: backupData,
      backup_type: 'manual',
      expires_at: expiresAt?.toISOString(),
      file_size: fileSize,
      metadata: {
        settings_count: Object.keys(backupData).length - 2, // Exclude timestamp and version
        created_by_app: true
      }
    });

  if (error) {
    throw new Error(`Failed to create backup: ${error.message}`);
  }
};

const restoreSettingsBackup = async (backupId: string, userId: string): Promise<void> => {
  // Get backup data
  const { data: backup, error: fetchError } = await supabase
    .from('settings_backups')
    .select('backup_data')
    .eq('id', backupId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch backup: ${fetchError.message}`);
  }

  const backupData = backup.backup_data as any;

  // Restore each settings type
  const restorePromises = [];

  if (backupData.user_settings) {
    restorePromises.push(
      supabase
        .from('user_settings')
        .upsert(backupData.user_settings)
    );
  }

  if (backupData.content_settings && Array.isArray(backupData.content_settings) && backupData.content_settings.length > 0) {
    restorePromises.push(
      supabase
        .from('content_settings')
        .upsert(backupData.content_settings)
    );
  }

  if (backupData.competitive_settings && Array.isArray(backupData.competitive_settings) && backupData.competitive_settings.length > 0) {
    restorePromises.push(
      supabase
        .from('competitive_settings')
        .upsert(backupData.competitive_settings)
    );
  }

  if (backupData.analytics_settings && Array.isArray(backupData.analytics_settings) && backupData.analytics_settings.length > 0) {
    restorePromises.push(
      supabase
        .from('analytics_settings')
        .upsert(backupData.analytics_settings)
    );
  }

  const results = await Promise.all(restorePromises);
  
  // Check for errors
  const errors = results.filter(result => result.error);
  if (errors.length > 0) {
    throw new Error(`Failed to restore some settings: ${errors.map(e => e.error?.message).join(', ')}`);
  }

  // Log restore action
  await supabase
    .from('settings_audit_logs')
    .insert({
      setting_type: 'user',
      entity_id: backupData.user_settings?.user_id || userId,
      action: 'restore',
      metadata: {
        backup_id: backupId,
        restore_timestamp: new Date().toISOString()
      }
    });
};

const deleteSettingsBackup = async (backupId: string): Promise<void> => {
  const { error } = await supabase
    .from('settings_backups')
    .delete()
    .eq('id', backupId);

  if (error) {
    throw new Error(`Failed to delete backup: ${error.message}`);
  }
};

const exportUserSettings = async (userId: string, format: 'json' | 'csv'): Promise<string> => {
  // Fetch all user settings
  const settingsQueries = await Promise.all([
    supabase.from('user_settings').select('*').eq('user_id', userId).single(),
    supabase.from('content_settings').select('*').eq('user_id', userId),
    supabase.from('competitive_settings').select('*').eq('user_id', userId),
    supabase.from('analytics_settings').select('*').eq('user_id', userId)
  ]);

  const exportData = {
    user_settings: settingsQueries[0].data,
    content_settings: settingsQueries[1].data,
    competitive_settings: settingsQueries[2].data,
    analytics_settings: settingsQueries[3].data,
    export_timestamp: new Date().toISOString(),
    export_version: '1.0'
  };

  if (format === 'json') {
    return JSON.stringify(exportData, null, 2);
  } else {
    // Convert to CSV format
    const csvRows = [];
    csvRows.push('Setting Type,Field Path,Value,Last Updated');
    
    Object.entries(exportData).forEach(([settingType, settings]) => {
      if (settings && typeof settings === 'object' && settingType !== 'export_timestamp' && settingType !== 'export_version') {
        const flattenObject = (obj: any, prefix = '') => {
          Object.entries(obj).forEach(([key, value]) => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              flattenObject(value, fullKey);
            } else {
            csvRows.push(`${settingType},${fullKey},"${value}",${(settings as any)?.updated_at || ''}`);
          }
        });
      };
      
      if (Array.isArray(settings)) {
        settings.forEach((setting, index) => flattenObject(setting, `${index}`));
      } else {
        flattenObject(settings);
      }
      }
    });
    
    return csvRows.join('\n');
  }
};

const importUserSettings = async (userId: string, data: string, format: 'json' | 'csv'): Promise<void> => {
  let importData: any;

  if (format === 'json') {
    try {
      importData = JSON.parse(data);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  } else {
    // Parse CSV format
    const lines = data.split('\n');
    const headers = lines[0].split(',');
    
    if (headers.length < 3) {
      throw new Error('Invalid CSV format: Missing required columns');
    }

    importData = {};
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= 3) {
        const settingType = values[0];
        const fieldPath = values[1];
        const value = values[2].replace(/"/g, '');
        
        if (!importData[settingType]) {
          importData[settingType] = {};
        }
        
        // Set nested value using field path
        const keys = fieldPath.split('.');
        let current = importData[settingType];
        for (let j = 0; j < keys.length - 1; j++) {
          if (!current[keys[j]]) {
            current[keys[j]] = {};
          }
          current = current[keys[j]];
        }
        current[keys[keys.length - 1]] = value;
      }
    }
  }

  // Validate and import each settings type
  const importPromises = [];

  if (importData.user_settings) {
    importPromises.push(
      supabase
        .from('user_settings')
        .upsert({ ...importData.user_settings, user_id: userId })
    );
  }

  if (importData.content_settings) {
    importPromises.push(
      supabase
        .from('content_settings')
        .upsert({ ...importData.content_settings, user_id: userId })
    );
  }

  const results = await Promise.all(importPromises);
  
  // Check for errors
  const errors = results.filter(result => result.error);
  if (errors.length > 0) {
    throw new Error(`Failed to import some settings: ${errors.map(e => e.error?.message).join(', ')}`);
  }

  // Log import action
  await supabase
    .from('settings_audit_logs')
    .insert({
      setting_type: 'user',
      entity_id: userId,
      action: 'import',
      metadata: {
        import_format: format,
        import_timestamp: new Date().toISOString(),
        settings_imported: Object.keys(importData)
      }
    });
};

export const useSettingsBackup = (): BackupHookResult => {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: backups = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['settings-backups', userId],
    queryFn: () => fetchSettingsBackups(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createBackupMutation = useMutation({
    mutationFn: ({ name, description, expiresAt }: {
      name: string;
      description?: string;
      expiresAt?: Date;
    }) => createSettingsBackup(userId!, name, description, expiresAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-backups', userId] });
      toast({
        title: "Backup Created",
        description: "Settings backup created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Backup Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const restoreBackupMutation = useMutation({
    mutationFn: (backupId: string) => restoreSettingsBackup(backupId, userId!),
    onSuccess: () => {
      // Invalidate all settings queries
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      queryClient.invalidateQueries({ queryKey: ['content-settings'] });
      queryClient.invalidateQueries({ queryKey: ['competitive-settings'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-settings'] });
      
      toast({
        title: "Settings Restored",
        description: "Settings have been restored from backup.",
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

  const deleteBackupMutation = useMutation({
    mutationFn: deleteSettingsBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-backups', userId] });
      toast({
        title: "Backup Deleted",
        description: "Backup deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const exportSettingsMutation = useMutation({
    mutationFn: ({ format }: { format: 'json' | 'csv' }) => 
      exportUserSettings(userId!, format),
    onSuccess: (data, variables) => {
      // Download the exported data
      const blob = new Blob([data], { 
        type: variables.format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settings-export-${new Date().toISOString().split('T')[0]}.${variables.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "Settings exported successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const importSettingsMutation = useMutation({
    mutationFn: ({ data, format }: { data: string; format: 'json' | 'csv' }) =>
      importUserSettings(userId!, data, format),
    onSuccess: () => {
      // Invalidate all settings queries
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      queryClient.invalidateQueries({ queryKey: ['content-settings'] });
      queryClient.invalidateQueries({ queryKey: ['competitive-settings'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-settings'] });
      
      toast({
        title: "Import Complete",
        description: "Settings imported successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    backups,
    isLoading,
    error: error as Error | null,
    createBackup: async (name: string, description?: string, expiresAt?: Date) => {
      await createBackupMutation.mutateAsync({ name, description, expiresAt });
    },
    restoreBackup: async (backupId: string) => {
      await restoreBackupMutation.mutateAsync(backupId);
    },
    deleteBackup: async (backupId: string) => {
      await deleteBackupMutation.mutateAsync(backupId);
    },
    exportSettings: async (format: 'json' | 'csv') => {
      return await exportSettingsMutation.mutateAsync({ format });
    },
    importSettings: async (data: string, format: 'json' | 'csv') => {
      await importSettingsMutation.mutateAsync({ data, format });
    },
    isCreating: createBackupMutation.isPending,
    isRestoring: restoreBackupMutation.isPending,
    isDeleting: deleteBackupMutation.isPending,
    isExporting: exportSettingsMutation.isPending,
    isImporting: importSettingsMutation.isPending
  };
};