import { structuredLogger } from './structuredLoggingService';

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccess: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  totalMemoryUsage: number;
  avgAccessCount: number;
  entriesByTTL: Record<string, number>;
}

export interface CacheConfig {
  maxEntries?: number;
  defaultTTL?: number;
  enableCompression?: boolean;
  enableMetrics?: boolean;
  cleanupInterval?: number;
}

class CachingService {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0
  };
  private config: Required<CacheConfig>;
  private cleanupTimer?: number;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxEntries: config.maxEntries || 1000,
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 minutes
      enableCompression: config.enableCompression || false,
      enableMetrics: config.enableMetrics || true,
      cleanupInterval: config.cleanupInterval || 60 * 1000 // 1 minute
    };

    this.startCleanupTimer();
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = window.setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private generateKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  private compress(data: any): string {
    if (!this.config.enableCompression) {
      return JSON.stringify(data);
    }
    // Simple compression simulation (in real implementation, use proper compression)
    const json = JSON.stringify(data);
    return btoa(json);
  }

  private decompress(compressed: string): any {
    if (!this.config.enableCompression) {
      return JSON.parse(compressed);
    }
    // Simple decompression simulation
    const json = atob(compressed);
    return JSON.parse(json);
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictLRU(): void {
    if (this.cache.size < this.config.maxEntries) return;

    let oldestKey = '';
    let oldestAccess = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      structuredLogger.debug('Cache entry evicted (LRU)', {
        component: 'CachingService',
        metadata: { evictedKey: oldestKey }
      });
    }
  }

  set<T>(
    key: string, 
    data: T, 
    options?: {
      ttl?: number;
      namespace?: string;
      tags?: string[];
      metadata?: Record<string, any>;
    }
  ): void {
    const fullKey = this.generateKey(key, options?.namespace);
    const ttl = options?.ttl || this.config.defaultTTL;
    const now = Date.now();

    this.evictLRU();

    const entry: CacheEntry<string> = {
      key: fullKey,
      data: this.compress(data),
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccess: now,
      tags: options?.tags,
      metadata: options?.metadata
    };

    this.cache.set(fullKey, entry);

    if (this.config.enableMetrics) {
      structuredLogger.debug('Cache entry set', {
        component: 'CachingService',
        metadata: { key: fullKey, ttl, tags: options?.tags }
      });
    }
  }

  get<T>(key: string, namespace?: string): T | null {
    const fullKey = this.generateKey(key, namespace);
    const entry = this.cache.get(fullKey);

    if (!entry) {
      this.stats.misses++;
      if (this.config.enableMetrics) {
        structuredLogger.debug('Cache miss', {
          component: 'CachingService',
          metadata: { key: fullKey }
        });
      }
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(fullKey);
      this.stats.misses++;
      if (this.config.enableMetrics) {
        structuredLogger.debug('Cache miss (expired)', {
          component: 'CachingService',
          metadata: { key: fullKey }
        });
      }
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.stats.hits++;

    if (this.config.enableMetrics) {
      structuredLogger.debug('Cache hit', {
        component: 'CachingService',
        metadata: { key: fullKey, accessCount: entry.accessCount }
      });
    }

    return this.decompress(entry.data as string);
  }

  has(key: string, namespace?: string): boolean {
    const fullKey = this.generateKey(key, namespace);
    const entry = this.cache.get(fullKey);
    return entry ? !this.isExpired(entry) : false;
  }

  delete(key: string, namespace?: string): boolean {
    const fullKey = this.generateKey(key, namespace);
    const deleted = this.cache.delete(fullKey);
    
    if (deleted && this.config.enableMetrics) {
      structuredLogger.debug('Cache entry deleted', {
        component: 'CachingService',
        metadata: { key: fullKey }
      });
    }
    
    return deleted;
  }

  clear(namespace?: string): number {
    let deletedCount = 0;
    
    if (namespace) {
      const prefix = `${namespace}:`;
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
          deletedCount++;
        }
      }
    } else {
      deletedCount = this.cache.size;
      this.cache.clear();
      this.stats.hits = 0;
      this.stats.misses = 0;
    }

    if (this.config.enableMetrics) {
      structuredLogger.info('Cache cleared', {
        component: 'CachingService',
        metadata: { namespace, deletedCount }
      });
    }

    return deletedCount;
  }

  invalidateByTags(tags: string[]): number {
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache) {
      if (entry.tags?.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (this.config.enableMetrics && deletedCount > 0) {
      structuredLogger.info('Cache invalidated by tags', {
        component: 'CachingService',
        metadata: { tags, deletedCount }
      });
    }

    return deletedCount;
  }

  cleanup(): number {
    let deletedCount = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (this.config.enableMetrics && deletedCount > 0) {
      structuredLogger.debug('Cache cleanup completed', {
        component: 'CachingService',
        metadata: { deletedCount, totalEntries: this.cache.size }
      });
    }

    return deletedCount;
  }

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    
    let totalMemoryUsage = 0;
    let totalAccessCount = 0;
    const entriesByTTL: Record<string, number> = {};

    for (const entry of this.cache.values()) {
      totalMemoryUsage += JSON.stringify(entry).length;
      totalAccessCount += entry.accessCount;
      
      const ttlRange = this.getTTLRange(entry.ttl);
      entriesByTTL[ttlRange] = (entriesByTTL[ttlRange] || 0) + 1;
    }

    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalMemoryUsage,
      avgAccessCount: this.cache.size > 0 ? totalAccessCount / this.cache.size : 0,
      entriesByTTL
    };
  }

  private getTTLRange(ttl: number): string {
    if (ttl < 60000) return '< 1min';
    if (ttl < 300000) return '1-5min';
    if (ttl < 900000) return '5-15min';
    if (ttl < 3600000) return '15-60min';
    return '> 1hour';
  }

  // Cache warming strategies
  async warm(entries: Array<{ key: string; dataLoader: () => Promise<any>; options?: any }>): Promise<void> {
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    structuredLogger.info('Cache warming started', {
      component: 'CachingService',
      metadata: { entriesCount: entries.length }
    });

    const promises = entries.map(async ({ key, dataLoader, options }) => {
      try {
        const data = await dataLoader();
        this.set(key, data, options);
        successCount++;
      } catch (error) {
        errorCount++;
        structuredLogger.error('Cache warm failed for key', error as Error, {
          component: 'CachingService',
          metadata: { key }
        });
      }
    });

    await Promise.allSettled(promises);

    const duration = Date.now() - startTime;
    structuredLogger.logPerformance('Cache warming', duration, {
      component: 'CachingService',
      metadata: { successCount, errorCount, totalEntries: entries.length }
    });
  }

  // Advanced cache patterns
  async getOrSet<T>(
    key: string,
    dataLoader: () => Promise<T>,
    options?: { ttl?: number; namespace?: string; tags?: string[] }
  ): Promise<T> {
    const cached = this.get<T>(key, options?.namespace);
    
    if (cached !== null) {
      return cached;
    }

    try {
      const data = await dataLoader();
      this.set(key, data, options);
      return data;
    } catch (error) {
      structuredLogger.error('Cache getOrSet failed', error as Error, {
        component: 'CachingService',
        metadata: { key, namespace: options?.namespace }
      });
      throw error;
    }
  }

  // Memory-efficient cache for large datasets
  setCompressed<T>(key: string, data: T, options?: { ttl?: number; namespace?: string }): void {
    this.set(key, data, { ...options, ...{ enableCompression: true } });
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }
}

// Global cache instances for different use cases
export const browserCache = new CachingService({
  maxEntries: 500,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  enableMetrics: true
});

export const apiCache = new CachingService({
  maxEntries: 1000,
  defaultTTL: 2 * 60 * 1000, // 2 minutes
  enableMetrics: true,
  enableCompression: true
});

export const userDataCache = new CachingService({
  maxEntries: 200,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  enableMetrics: true
});

export { CachingService };

// Integration functions for production monitoring
import { supabase } from '@/integrations/supabase/client';

export const sendCacheStatisticsToDatabase = async (stats: Array<{
  cache_name: string;
  cache_type: string;
  hit_count?: number;
  miss_count?: number;
  eviction_count?: number;
  total_requests?: number;
  average_response_time_ms?: number;
  cache_size_bytes?: number;
  max_size_bytes?: number;
  key_count?: number;
}>) => {
  try {
    const { data, error } = await supabase.functions.invoke('cache-manager', {
      body: stats
    });

    if (error) {
      console.error('Failed to send cache statistics to database:', error);
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    console.error('Cache statistics collection failed:', err);
    return { data: null, error: err };
  }
};

export const getCacheStatisticsFromDatabase = async (filters: {
  cacheName?: string;
  cacheType?: string;
  hours?: number;
  limit?: number;
  aggregate?: boolean;
} = {}) => {
  try {
    const queryParams: Record<string, string> = {};
    if (filters.cacheName) queryParams.cache_name = filters.cacheName;
    if (filters.cacheType) queryParams.cache_type = filters.cacheType;
    if (filters.hours) queryParams.hours = filters.hours.toString();
    if (filters.limit) queryParams.limit = filters.limit.toString();
    if (filters.aggregate) queryParams.aggregate = 'true';

    const { data, error } = await supabase.functions.invoke('cache-manager', {
      body: queryParams
    });

    if (error) {
      console.error('Failed to get cache statistics from database:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Failed to get cache statistics from database:', err);
    return { data: null, error: err };
  }
};