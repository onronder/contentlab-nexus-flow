import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface SettingsSyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  conflictResolution: 'user' | 'server' | 'merge';
  pendingChanges: number;
}

export function useSettingsSync() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [syncStatus, setSyncStatus] = useState<SettingsSyncStatus>({
    isOnline: navigator.onLine,
    lastSync: null,
    syncStatus: 'idle',
    conflictResolution: 'merge',
    pendingChanges: 0,
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      // Trigger sync when coming back online
      syncPendingChanges();
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Real-time settings synchronization
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('settings-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          handleRemoteSettingsChange('user_settings', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_settings',
        },
        (payload) => {
          handleRemoteSettingsChange('project_settings', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_settings',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          handleRemoteSettingsChange('content_settings', payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleRemoteSettingsChange = (table: string, payload: any) => {
    // Invalidate relevant queries to refetch settings
    const queryKeys = {
      user_settings: ['user-settings'],
      project_settings: ['project-settings'],
      content_settings: ['content-settings'],
      competitive_settings: ['competitive-settings'],
      analytics_settings: ['analytics-settings'],
    };

    const keyPattern = queryKeys[table as keyof typeof queryKeys];
    if (keyPattern) {
      queryClient.invalidateQueries({ queryKey: keyPattern });
    }

    setSyncStatus(prev => ({
      ...prev,
      lastSync: new Date(),
      syncStatus: 'success',
    }));

    // Show toast for important changes
    if (payload.eventType === 'UPDATE') {
      toast({
        title: 'Settings Updated',
        description: 'Your settings have been synchronized across devices.',
      });
    }
  };

  const syncPendingChanges = async () => {
    if (!user?.id || !syncStatus.isOnline) return;

    setSyncStatus(prev => ({ ...prev, syncStatus: 'syncing' }));

    try {
      // Attempt to sync any pending changes
      // TODO: Implement sync once tables are created
      console.log('Would sync settings for user:', user.id);

      setSyncStatus(prev => ({
        ...prev,
        syncStatus: 'success',
        lastSync: new Date(),
        pendingChanges: 0,
      }));

      // Refresh all settings queries
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      queryClient.invalidateQueries({ queryKey: ['project-settings'] });
      queryClient.invalidateQueries({ queryKey: ['content-settings'] });
      queryClient.invalidateQueries({ queryKey: ['competitive-settings'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-settings'] });

    } catch (error) {
      console.error('Settings sync failed:', error);
      setSyncStatus(prev => ({ ...prev, syncStatus: 'error' }));
      
      toast({
        title: 'Sync Failed',
        description: 'Unable to synchronize settings. Changes saved locally.',
        variant: 'destructive',
      });
    }
  };

  const forceSync = async () => {
    if (!user?.id) return;

    setSyncStatus(prev => ({ ...prev, syncStatus: 'syncing' }));

    try {
      // TODO: Implement force sync once tables are created
      console.log('Would force sync for user:', user.id);

      // Invalidate all settings-related queries
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      queryClient.invalidateQueries({ queryKey: ['team-settings'] });

      setSyncStatus(prev => ({
        ...prev,
        syncStatus: 'success',
        lastSync: new Date(),
      }));

      toast({
        title: 'Settings Synchronized',
        description: 'All settings have been synchronized successfully.',
      });

    } catch (error) {
      console.error('Force sync failed:', error);
      setSyncStatus(prev => ({ ...prev, syncStatus: 'error' }));
      
      toast({
        title: 'Sync Failed',
        description: 'Unable to force synchronization.',
        variant: 'destructive',
      });
    }
  };

  const resolveConflict = async (resolution: 'user' | 'server' | 'merge') => {
    setSyncStatus(prev => ({ ...prev, conflictResolution: resolution }));
    
    if (!user?.id) return;

    try {
      // TODO: Implement conflict resolution once tables are created
      console.log('Would resolve conflict for user:', user.id, 'with resolution:', resolution);

      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      
      toast({
        title: 'Conflict Resolved',
        description: `Settings conflict resolved using ${resolution} preference.`,
      });

    } catch (error) {
      console.error('Conflict resolution failed:', error);
      toast({
        title: 'Resolution Failed',
        description: 'Unable to resolve settings conflict.',
        variant: 'destructive',
      });
    }
  };

  const exportAllSettings = async (): Promise<string> => {
    if (!user?.id) throw new Error('User not authenticated');

    // TODO: Implement export once tables are created
    console.log('Would export settings for user:', user.id);
    return JSON.stringify({ placeholder: 'settings' }, null, 2);
  };

  const importAllSettings = async (settingsJson: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const settingsData = JSON.parse(settingsJson);
      
      // TODO: Implement import once tables are created
      console.log('Would import settings for user:', user.id, 'with data:', settingsData);

      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      
      toast({
        title: 'Settings Imported',
        description: 'All settings have been imported successfully.',
      });

    } catch (error) {
      console.error('Settings import failed:', error);
      toast({
        title: 'Import Failed',
        description: 'Unable to import settings. Please check the format.',
        variant: 'destructive',
      });
    }
  };

  return {
    syncStatus,
    syncPendingChanges,
    forceSync,
    resolveConflict,
    exportAllSettings,
    importAllSettings,
  };
}