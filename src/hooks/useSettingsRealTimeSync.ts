import { useEffect, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { settingsRealtimeService, SettingsSyncEvent, ConflictResolution } from '@/services/settingsRealtimeService';
import { useCurrentUserId } from './useCurrentUserId';
import { useToast } from '@/hooks/use-toast';

export interface SyncStatus {
  isOnline: boolean;
  isConnected: boolean;
  lastSyncAt?: Date;
  pendingChanges: number;
  conflictsCount: number;
  syncState: 'idle' | 'syncing' | 'error' | 'conflict';
}

export interface UseSettingsRealTimeSyncOptions {
  entityId?: string;
  entityType?: 'user' | 'team' | 'project';
  enableGlobalSync?: boolean;
  enableConflictResolution?: boolean;
  autoResolveStrategy?: 'user_wins' | 'server_wins' | 'merge';
}

export const useSettingsRealTimeSync = (options: UseSettingsRealTimeSyncOptions = {}) => {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    entityId = userId,
    entityType = 'user',
    enableGlobalSync = true,
    enableConflictResolution = true,
    autoResolveStrategy = 'merge'
  } = options;

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isConnected: false,
    pendingChanges: 0,
    conflictsCount: 0,
    syncState: 'idle'
  });

  const [activeConflicts, setActiveConflicts] = useState<ConflictResolution[]>([]);

  // Handle settings change events
  const handleSettingsChange = useCallback((event: SettingsSyncEvent) => {
    const { type, payload } = event;

    switch (type) {
      case 'settings_change':
        // Invalidate relevant queries to trigger refetch
        queryClient.invalidateQueries({ 
          queryKey: [payload.settingType, payload.entityId] 
        });
        
        setSyncStatus(prev => ({
          ...prev,
          lastSyncAt: new Date(),
          syncState: 'idle'
        }));

        toast({
          title: "Settings Updated",
          description: "Your settings have been synchronized across devices.",
        });
        break;

      case 'conflict_detected':
        if (enableConflictResolution) {
          setSyncStatus(prev => ({
            ...prev,
            conflictsCount: prev.conflictsCount + 1,
            syncState: 'conflict'
          }));

          toast({
            title: "Settings Conflict Detected",
            description: "Changes were made on another device. Review conflicts to resolve.",
            variant: "destructive",
          });
        }
        break;

      case 'sync_complete':
        setSyncStatus(prev => ({
          ...prev,
          lastSyncAt: new Date(),
          pendingChanges: Math.max(0, prev.pendingChanges - 1),
          syncState: 'idle'
        }));
        break;

      case 'integration_update':
        // Handle cross-module integration updates
        queryClient.invalidateQueries({ 
          queryKey: ['settings-integrations'] 
        });
        break;
    }
  }, [queryClient, toast, enableConflictResolution]);

  // Handle conflict resolution
  const handleConflictResolution = useCallback((conflict: ConflictResolution) => {
    setActiveConflicts(prev => [...prev, conflict]);

    // Auto-resolve based on strategy
    if (autoResolveStrategy) {
      conflict.strategy = autoResolveStrategy;
      resolveConflict(autoResolveStrategy);
    }
  }, [autoResolveStrategy]);

  // Resolve a specific conflict
  const resolveConflict = useCallback(async (
    strategy: ConflictResolution['strategy'],
    conflictIndex: number = 0
  ) => {
    const conflict = activeConflicts[conflictIndex];
    if (!conflict) return;

    try {
      setSyncStatus(prev => ({ ...prev, syncState: 'syncing' }));

      await settingsRealtimeService.applyConflictResolution(
        'user_settings', // This should be dynamic based on conflict
        entityId || userId!,
        { ...conflict, strategy }
      );

      setActiveConflicts(prev => prev.filter((_, index) => index !== conflictIndex));
      setSyncStatus(prev => ({
        ...prev,
        conflictsCount: Math.max(0, prev.conflictsCount - 1),
        syncState: prev.conflictsCount <= 1 ? 'idle' : 'conflict'
      }));

      toast({
        title: "Conflict Resolved",
        description: "Settings have been synchronized successfully.",
      });
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, syncState: 'error' }));
      toast({
        title: "Resolution Failed",
        description: "Failed to resolve settings conflict. Please try again.",
        variant: "destructive",
      });
    }
  }, [activeConflicts, entityId, userId, toast]);

  // Manually trigger synchronization
  const triggerSync = useCallback(async () => {
    if (!entityId) return;

    try {
      setSyncStatus(prev => ({ ...prev, syncState: 'syncing' }));

      // Trigger a full sync by invalidating all settings queries
      await queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['team-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['project-settings'] });

      setSyncStatus(prev => ({
        ...prev,
        lastSyncAt: new Date(),
        syncState: 'idle'
      }));

      toast({
        title: "Sync Complete",
        description: "All settings have been synchronized.",
      });
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, syncState: 'error' }));
      toast({
        title: "Sync Failed",
        description: "Failed to synchronize settings. Please check your connection.",
        variant: "destructive",
      });
    }
  }, [entityId, queryClient, toast]);

  // Force sync with conflict resolution
  const forceSync = useCallback(async (strategy: ConflictResolution['strategy'] = 'user_wins') => {
    // Resolve all conflicts with the specified strategy
    for (let i = activeConflicts.length - 1; i >= 0; i--) {
      await resolveConflict(strategy, i);
    }
    
    // Then trigger normal sync
    await triggerSync();
  }, [activeConflicts, resolveConflict, triggerSync]);

  // Broadcast settings change to other connected devices
  const broadcastChange = useCallback(async (
    settingType: string,
    changes: Record<string, any>
  ) => {
    if (!entityId) return;

    setSyncStatus(prev => ({
      ...prev,
      pendingChanges: prev.pendingChanges + 1,
      syncState: 'syncing'
    }));

    await settingsRealtimeService.broadcastSettingsChange(
      settingType,
      entityId,
      changes
    );
  }, [entityId]);

  // Setup subscriptions and cleanup
  useEffect(() => {
    if (!entityId) return;

    let entityChannelName: string | undefined;
    let globalChannelName: string | undefined;

    // Subscribe to entity-specific settings
    if (entityId && entityType) {
      entityChannelName = settingsRealtimeService.subscribeToSettings(entityId, entityType);
      settingsRealtimeService.addEventListener('*', handleSettingsChange);
      setSyncStatus(prev => ({ ...prev, isConnected: true }));
    }

    // Subscribe to global sync if enabled
    if (enableGlobalSync && userId) {
      globalChannelName = settingsRealtimeService.subscribeToGlobalSync(userId);
    }

    // Setup conflict resolution
    if (enableConflictResolution) {
      settingsRealtimeService.addConflictHandler(handleConflictResolution);
    }

    // Listen for online/offline events
    const handleOnline = () => setSyncStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setSyncStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      // Cleanup subscriptions
      if (entityChannelName) {
        settingsRealtimeService.unsubscribe(entityChannelName);
      }
      if (globalChannelName) {
        settingsRealtimeService.unsubscribe(globalChannelName);
      }

      settingsRealtimeService.removeEventListener('*', handleSettingsChange);
      
      if (enableConflictResolution) {
        settingsRealtimeService.removeConflictHandler(handleConflictResolution);
      }

      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      setSyncStatus(prev => ({ ...prev, isConnected: false }));
    };
  }, [
    entityId,
    entityType,
    userId,
    enableGlobalSync,
    enableConflictResolution,
    handleSettingsChange,
    handleConflictResolution
  ]);

  return {
    syncStatus,
    activeConflicts,
    resolveConflict,
    triggerSync,
    forceSync,
    broadcastChange,
    isOnline: syncStatus.isOnline,
    isConnected: syncStatus.isConnected,
    hasPendingChanges: syncStatus.pendingChanges > 0,
    hasConflicts: syncStatus.conflictsCount > 0,
    isSyncing: syncStatus.syncState === 'syncing'
  };
};