import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SettingsSyncEvent {
  type: 'settings_change' | 'conflict_detected' | 'sync_complete' | 'integration_update';
  payload: {
    settingType: string;
    entityId: string;
    changes: Record<string, any>;
    sourceUserId?: string;
    conflictData?: any;
    metadata?: Record<string, any>;
  };
}

export interface ConflictResolution {
  strategy: 'user_wins' | 'server_wins' | 'merge' | 'manual';
  userChanges: Record<string, any>;
  serverChanges: Record<string, any>;
  mergedResult?: Record<string, any>;
}

class SettingsRealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private eventHandlers: Map<string, Set<(event: SettingsSyncEvent) => void>> = new Map();
  private conflictHandlers: Set<(conflict: ConflictResolution) => void> = new Set();

  // Subscribe to settings changes for a specific user or team
  subscribeToSettings(entityId: string, entityType: 'user' | 'team' | 'project') {
    const channelName = `settings_${entityType}_${entityId}`;
    
    if (this.channels.has(channelName)) {
      return channelName;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: `${entityType}_settings`,
          filter: `${entityType}_id=eq.${entityId}`
        },
        (payload) => this.handleSettingsChange(payload, entityType)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settings_sync_log',
          filter: `entity_id=eq.${entityId}`
        },
        (payload) => this.handleSyncEvent(payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settings_integrations',
          filter: `source_entity_id=eq.${entityId}`
        },
        (payload) => this.handleIntegrationChange(payload)
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channelName;
  }

  // Subscribe to cross-platform synchronization events
  subscribeToGlobalSync(userId: string) {
    const channelName = `global_sync_${userId}`;
    
    if (this.channels.has(channelName)) {
      return channelName;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settings_sync_log',
          filter: `source_user_id=eq.${userId}`
        },
        (payload) => this.handleGlobalSyncEvent(payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settings_recommendations',
          filter: `user_id=eq.${userId}`
        },
        (payload) => this.handleRecommendationUpdate(payload)
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channelName;
  }

  // Add event handler for specific setting type
  addEventListener(settingType: string, handler: (event: SettingsSyncEvent) => void) {
    if (!this.eventHandlers.has(settingType)) {
      this.eventHandlers.set(settingType, new Set());
    }
    this.eventHandlers.get(settingType)!.add(handler);
  }

  // Remove event handler
  removeEventListener(settingType: string, handler: (event: SettingsSyncEvent) => void) {
    const handlers = this.eventHandlers.get(settingType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  // Add conflict resolution handler
  addConflictHandler(handler: (conflict: ConflictResolution) => void) {
    this.conflictHandlers.add(handler);
  }

  // Remove conflict resolution handler
  removeConflictHandler(handler: (conflict: ConflictResolution) => void) {
    this.conflictHandlers.delete(handler);
  }

  // Unsubscribe from a channel
  unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll() {
    for (const [channelName, channel] of this.channels) {
      supabase.removeChannel(channel);
    }
    this.channels.clear();
    this.eventHandlers.clear();
    this.conflictHandlers.clear();
  }

  // Broadcast settings change to other users/devices
  async broadcastSettingsChange(
    settingType: string,
    entityId: string,
    changes: Record<string, any>,
    targetEntities?: string[]
  ) {
    const event: SettingsSyncEvent = {
      type: 'settings_change',
      payload: {
        settingType,
        entityId,
        changes,
        sourceUserId: (await supabase.auth.getUser()).data.user?.id,
        metadata: {
          timestamp: new Date().toISOString(),
          targets: targetEntities
        }
      }
    };

    // Log the sync event
    await this.logSyncEvent('propagate', settingType, entityId, {
      changes,
      targetEntities
    });

    // Emit to local handlers
    this.emitEvent(event);
  }

  // Detect and handle conflicts
  async handleConflict(
    settingType: string,
    entityId: string,
    userChanges: Record<string, any>,
    serverChanges: Record<string, any>
  ): Promise<ConflictResolution> {
    const conflict: ConflictResolution = {
      strategy: 'manual', // Default to manual resolution
      userChanges,
      serverChanges
    };

    // Simple conflict resolution strategies
    if (this.isSimpleConflict(userChanges, serverChanges)) {
      conflict.strategy = 'merge';
      conflict.mergedResult = this.mergeChanges(userChanges, serverChanges);
    }

    // Notify conflict handlers
    this.conflictHandlers.forEach(handler => handler(conflict));

    // Log the conflict
    await this.logSyncEvent('conflict', settingType, entityId, {
      userChanges,
      serverChanges,
      strategy: conflict.strategy
    });

    return conflict;
  }

  // Apply conflict resolution
  async applyConflictResolution(
    settingType: string,
    entityId: string,
    resolution: ConflictResolution
  ) {
    let finalChanges: Record<string, any>;

    switch (resolution.strategy) {
      case 'user_wins':
        finalChanges = resolution.userChanges;
        break;
      case 'server_wins':
        finalChanges = resolution.serverChanges;
        break;
      case 'merge':
        finalChanges = resolution.mergedResult || 
          this.mergeChanges(resolution.userChanges, resolution.serverChanges);
        break;
      default:
        throw new Error('Manual resolution required');
    }

    // Apply the resolved changes
    await this.applySettingsChanges(settingType, entityId, finalChanges);

    // Log the resolution
    await this.logSyncEvent('resolve', settingType, entityId, {
      strategy: resolution.strategy,
      appliedChanges: finalChanges
    });
  }

  // Private methods

  private async logSyncEvent(
    event: string,
    settingType: string,
    entityId: string,
    metadata: any
  ) {
    try {
      await supabase.from('settings_sync_log').insert({
        setting_type: settingType,
        entity_id: entityId,
        sync_event: event,
        source_user_id: (await supabase.auth.getUser()).data.user?.id,
        metadata
      });
    } catch (error) {
      console.error('Failed to log sync event:', error);
    }
  }

  private handleSettingsChange(payload: any, entityType: string) {
    const event: SettingsSyncEvent = {
      type: 'settings_change',
      payload: {
        settingType: `${entityType}_settings`,
        entityId: payload.new?.user_id || payload.new?.team_id || payload.new?.project_id,
        changes: payload.new,
        metadata: {
          eventType: payload.eventType,
          old: payload.old
        }
      }
    };

    this.emitEvent(event);
  }

  private handleSyncEvent(payload: any) {
    const event: SettingsSyncEvent = {
      type: 'sync_complete',
      payload: {
        settingType: payload.new?.setting_type,
        entityId: payload.new?.entity_id,
        changes: {},
        metadata: payload.new
      }
    };

    this.emitEvent(event);
  }

  private handleIntegrationChange(payload: any) {
    const event: SettingsSyncEvent = {
      type: 'integration_update',
      payload: {
        settingType: payload.new?.source_setting_type,
        entityId: payload.new?.source_entity_id,
        changes: payload.new,
        metadata: {
          targetType: payload.new?.target_setting_type,
          targetEntity: payload.new?.target_entity_id
        }
      }
    };

    this.emitEvent(event);
  }

  private handleGlobalSyncEvent(payload: any) {
    // Handle global synchronization events across the platform
    this.emitEvent({
      type: 'sync_complete',
      payload: {
        settingType: payload.new?.setting_type,
        entityId: payload.new?.entity_id,
        changes: {},
        metadata: {
          ...payload.new,
          global: true
        }
      }
    });
  }

  private handleRecommendationUpdate(payload: any) {
    // Handle recommendation updates
    this.emitEvent({
      type: 'settings_change',
      payload: {
        settingType: 'recommendations',
        entityId: payload.new?.user_id,
        changes: payload.new,
        metadata: {
          recommendationType: payload.new?.recommendation_type
        }
      }
    });
  }

  private emitEvent(event: SettingsSyncEvent) {
    const handlers = this.eventHandlers.get(event.payload.settingType);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }

    // Also emit to wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => handler(event));
    }
  }

  private isSimpleConflict(userChanges: any, serverChanges: any): boolean {
    const userKeys = Object.keys(userChanges);
    const serverKeys = Object.keys(serverChanges);
    
    // If no overlapping keys, it's a simple merge
    return userKeys.every(key => !serverKeys.includes(key));
  }

  private mergeChanges(userChanges: any, serverChanges: any): any {
    return {
      ...serverChanges,
      ...userChanges
    };
  }

  private async applySettingsChanges(
    settingType: string,
    entityId: string,
    changes: Record<string, any>
  ) {
    const tableName = this.getTableName(settingType);
    const idField = this.getIdField(settingType);

    // Simplified approach to avoid deep type instantiation issues
    try {
      const { error } = await (supabase as any)
        .from(tableName)
        .update(changes)
        .eq(idField, entityId);
      
      if (error) throw error;
    } catch (error) {
      console.error(`Failed to update ${tableName}:`, error);
      throw error;
    }
  }

  private getTableName(settingType: string): string {
    const typeMap: Record<string, string> = {
      user_settings: 'user_settings',
      team_settings: 'teams',
      project_settings: 'project_settings',
      content_settings: 'content_settings',
      competitive_settings: 'competitive_settings',
      analytics_settings: 'analytics_settings'
    };
    return typeMap[settingType] || settingType;
  }

  private getIdField(settingType: string): string {
    const fieldMap: Record<string, string> = {
      user_settings: 'user_id',
      team_settings: 'id',
      project_settings: 'project_id',
      content_settings: 'user_id',
      competitive_settings: 'user_id',
      analytics_settings: 'user_id'
    };
    return fieldMap[settingType] || 'id';
  }
}

// Export singleton instance
export const settingsRealtimeService = new SettingsRealtimeService();