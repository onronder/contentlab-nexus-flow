import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface AppDB extends DBSchema {
  offline_queue: {
    key: string;
    value: {
      id: string;
      action: string;
      data: any;
      timestamp: number;
      priority: number;
      retries: number;
      maxRetries: number;
      status: 'pending' | 'processing' | 'completed' | 'failed';
    };
  };
  offline_data: {
    key: string;
    value: {
      id: string;
      table: string;
      data: any;
      lastModified: number;
      syncStatus: 'synced' | 'pending' | 'conflict';
      version: number;
    };
  };
  conflict_resolution: {
    key: string;
    value: {
      id: string;
      localData: any;
      remoteData: any;
      conflictType: 'update' | 'delete' | 'create';
      timestamp: number;
      resolved: boolean;
    };
  };
  sync_metadata: {
    key: string;
    value: {
      table: string;
      lastSync: number;
      syncStrategy: 'merge' | 'overwrite' | 'manual';
      conflictCount: number;
    };
  };
}

class IndexedDBService {
  private db: IDBPDatabase<AppDB> | null = null;
  private readonly DB_NAME = 'AppOfflineDB';
  private readonly DB_VERSION = 1;

  async initialize(): Promise<void> {
    this.db = await openDB<AppDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Offline action queue
        if (!db.objectStoreNames.contains('offline_queue')) {
          const queueStore = db.createObjectStore('offline_queue', { keyPath: 'id' });
          queueStore.createIndex('priority', 'priority');
          queueStore.createIndex('status', 'status');
          queueStore.createIndex('timestamp', 'timestamp');
        }

        // Offline data storage
        if (!db.objectStoreNames.contains('offline_data')) {
          const dataStore = db.createObjectStore('offline_data', { keyPath: 'id' });
          dataStore.createIndex('table', 'table');
          dataStore.createIndex('syncStatus', 'syncStatus');
          dataStore.createIndex('lastModified', 'lastModified');
        }

        // Conflict resolution
        if (!db.objectStoreNames.contains('conflict_resolution')) {
          const conflictStore = db.createObjectStore('conflict_resolution', { keyPath: 'id' });
          conflictStore.createIndex('timestamp', 'timestamp');
          conflictStore.createIndex('resolved', 'resolved');
        }

        // Sync metadata
        if (!db.objectStoreNames.contains('sync_metadata')) {
          db.createObjectStore('sync_metadata', { keyPath: 'table' });
        }
      },
    });
  }

  // Offline Queue Management
  async addToQueue(action: {
    action: string;
    data: any;
    priority?: number;
    maxRetries?: number;
  }): Promise<string> {
    if (!this.db) await this.initialize();
    
    const queueItem = {
      id: crypto.randomUUID(),
      action: action.action,
      data: action.data,
      timestamp: Date.now(),
      priority: action.priority ?? 5,
      retries: 0,
      maxRetries: action.maxRetries ?? 3,
      status: 'pending' as const,
    };

    await this.db!.add('offline_queue', queueItem);
    return queueItem.id;
  }

  async getQueuedActions(status?: 'pending' | 'processing' | 'completed' | 'failed'): Promise<any[]> {
    if (!this.db) await this.initialize();
    
    if (status) {
      return this.db!.getAllFromIndex('offline_queue', 'status', status);
    }
    return this.db!.getAll('offline_queue');
  }

  async updateQueueItem(id: string, updates: Partial<AppDB['offline_queue']['value']>): Promise<void> {
    if (!this.db) await this.initialize();
    
    const item = await this.db!.get('offline_queue', id);
    if (item) {
      await this.db!.put('offline_queue', { ...item, ...updates });
    }
  }

  async removeFromQueue(id: string): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.delete('offline_queue', id);
  }

  // Offline Data Management
  async storeOfflineData(table: string, data: any): Promise<void> {
    if (!this.db) await this.initialize();
    
    const offlineData = {
      id: `${table}_${data.id || crypto.randomUUID()}`,
      table,
      data,
      lastModified: Date.now(),
      syncStatus: 'pending' as const,
      version: 1,
    };

    await this.db!.put('offline_data', offlineData);
  }

  async getOfflineData(table?: string): Promise<any[]> {
    if (!this.db) await this.initialize();
    
    if (table) {
      return this.db!.getAllFromIndex('offline_data', 'table', table);
    }
    return this.db!.getAll('offline_data');
  }

  async updateOfflineData(id: string, data: any): Promise<void> {
    if (!this.db) await this.initialize();
    
    const existing = await this.db!.get('offline_data', id);
    if (existing) {
      await this.db!.put('offline_data', {
        ...existing,
        data,
        lastModified: Date.now(),
        syncStatus: 'pending',
        version: existing.version + 1,
      });
    }
  }

  // Conflict Resolution
  async addConflict(localData: any, remoteData: any, conflictType: 'update' | 'delete' | 'create'): Promise<string> {
    if (!this.db) await this.initialize();
    
    const conflict = {
      id: crypto.randomUUID(),
      localData,
      remoteData,
      conflictType,
      timestamp: Date.now(),
      resolved: false,
    };

    await this.db!.add('conflict_resolution', conflict);
    return conflict.id;
  }

  async getUnresolvedConflicts(): Promise<any[]> {
    if (!this.db) await this.initialize();
    return this.db!.getAllFromIndex('conflict_resolution', 'resolved', false);
  }

  async resolveConflict(id: string, resolution: 'local' | 'remote' | 'merge', mergedData?: any): Promise<void> {
    if (!this.db) await this.initialize();
    
    const conflict = await this.db!.get('conflict_resolution', id);
    if (conflict) {
      await this.db!.put('conflict_resolution', {
        ...conflict,
        resolved: true,
      });

      // Apply resolution logic based on choice
      if (resolution === 'local') {
        // Keep local data
      } else if (resolution === 'remote') {
        // Use remote data
      } else if (resolution === 'merge' && mergedData) {
        // Use merged data
      }
    }
  }

  // Sync Management
  async updateSyncMetadata(table: string, metadata: Partial<AppDB['sync_metadata']['value']>): Promise<void> {
    if (!this.db) await this.initialize();
    
    const existing = await this.db!.get('sync_metadata', table);
    const updated = {
      table,
      lastSync: Date.now(),
      syncStrategy: 'merge' as const,
      conflictCount: 0,
      ...existing,
      ...metadata,
    };

    await this.db!.put('sync_metadata', updated);
  }

  async getSyncMetadata(table: string): Promise<AppDB['sync_metadata']['value'] | undefined> {
    if (!this.db) await this.initialize();
    return this.db!.get('sync_metadata', table);
  }

  // Background Sync Status
  async getOfflineStatus(): Promise<{
    queuedActions: number;
    pendingSync: number;
    conflicts: number;
    lastSync: number;
  }> {
    if (!this.db) await this.initialize();
    
    const [queuedActions, pendingSync, conflicts] = await Promise.all([
      this.db!.countFromIndex('offline_queue', 'status', 'pending'),
      this.db!.countFromIndex('offline_data', 'syncStatus', 'pending'),
      this.db!.countFromIndex('conflict_resolution', 'resolved', false),
    ]);

    const syncMetadata = await this.db!.getAll('sync_metadata');
    const lastSync = Math.max(...syncMetadata.map(m => m.lastSync), 0);

    return {
      queuedActions,
      pendingSync,
      conflicts,
      lastSync,
    };
  }

  // Cleanup
  async cleanup(olderThan: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) await this.initialize();
    
    const cutoff = Date.now() - olderThan;
    
    // Clean old completed queue items
    const completedItems = await this.db!.getAllFromIndex('offline_queue', 'status', 'completed');
    for (const item of completedItems) {
      if (item.timestamp < cutoff) {
        await this.db!.delete('offline_queue', item.id);
      }
    }

    // Clean resolved conflicts
    const resolvedConflicts = await this.db!.getAllFromIndex('conflict_resolution', 'resolved', true);
    for (const conflict of resolvedConflicts) {
      if (conflict.timestamp < cutoff) {
        await this.db!.delete('conflict_resolution', conflict.id);
      }
    }
  }
}

export const indexedDBService = new IndexedDBService();
