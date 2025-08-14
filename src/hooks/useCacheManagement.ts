import { useState, useEffect, useCallback } from 'react';
import { browserCache, apiCache, userDataCache, CacheStats } from '@/services/cachingService';
import { structuredLogger } from '@/services/structuredLoggingService';
import { useAuth } from './useAuth';

export type CacheType = 'browser' | 'api' | 'userData';

export function useCacheManagement() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<CacheType, CacheStats>>({
    browser: browserCache.getStats(),
    api: apiCache.getStats(),
    userData: userDataCache.getStats()
  });
  const [isLoading, setIsLoading] = useState(false);

  const getCacheInstance = useCallback((type: CacheType) => {
    switch (type) {
      case 'browser': return browserCache;
      case 'api': return apiCache;
      case 'userData': return userDataCache;
      default: return browserCache;
    }
  }, []);

  const refreshStats = useCallback(() => {
    setStats({
      browser: browserCache.getStats(),
      api: apiCache.getStats(),
      userData: userDataCache.getStats()
    });
  }, []);

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [refreshStats]);

  const clearCache = useCallback(async (type: CacheType, namespace?: string) => {
    setIsLoading(true);
    try {
      const cache = getCacheInstance(type);
      const deletedCount = cache.clear(namespace);
      
      structuredLogger.info('Cache cleared', {
        component: 'useCacheManagement',
        userId: user?.id,
        metadata: { cacheType: type, namespace, deletedCount }
      });

      refreshStats();
      return deletedCount;
    } catch (error) {
      structuredLogger.error('Failed to clear cache', error as Error, {
        component: 'useCacheManagement',
        userId: user?.id,
        metadata: { cacheType: type, namespace }
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [getCacheInstance, refreshStats, user?.id]);

  const invalidateByTags = useCallback(async (type: CacheType, tags: string[]) => {
    setIsLoading(true);
    try {
      const cache = getCacheInstance(type);
      const deletedCount = cache.invalidateByTags(tags);
      
      structuredLogger.info('Cache invalidated by tags', {
        component: 'useCacheManagement',
        userId: user?.id,
        metadata: { cacheType: type, tags, deletedCount }
      });

      refreshStats();
      return deletedCount;
    } catch (error) {
      structuredLogger.error('Failed to invalidate cache by tags', error as Error, {
        component: 'useCacheManagement',
        userId: user?.id,
        metadata: { cacheType: type, tags }
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [getCacheInstance, refreshStats, user?.id]);

  const cleanup = useCallback(async (type: CacheType) => {
    setIsLoading(true);
    try {
      const cache = getCacheInstance(type);
      const deletedCount = cache.cleanup();
      
      structuredLogger.info('Cache cleanup completed', {
        component: 'useCacheManagement',
        userId: user?.id,
        metadata: { cacheType: type, deletedCount }
      });

      refreshStats();
      return deletedCount;
    } catch (error) {
      structuredLogger.error('Failed to cleanup cache', error as Error, {
        component: 'useCacheManagement',
        userId: user?.id,
        metadata: { cacheType: type }
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [getCacheInstance, refreshStats, user?.id]);

  const warmCache = useCallback(async (
    type: CacheType,
    entries: Array<{ key: string; dataLoader: () => Promise<any>; options?: any }>
  ) => {
    setIsLoading(true);
    try {
      const cache = getCacheInstance(type);
      await cache.warm(entries);
      
      structuredLogger.info('Cache warming completed', {
        component: 'useCacheManagement',
        userId: user?.id,
        metadata: { cacheType: type, entriesCount: entries.length }
      });

      refreshStats();
    } catch (error) {
      structuredLogger.error('Failed to warm cache', error as Error, {
        component: 'useCacheManagement',
        userId: user?.id,
        metadata: { cacheType: type, entriesCount: entries.length }
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [getCacheInstance, refreshStats, user?.id]);

  const getCacheHealth = useCallback(() => {
    const health = {
      browser: {
        status: stats.browser.hitRate > 70 ? 'healthy' : stats.browser.hitRate > 40 ? 'warning' : 'critical',
        hitRate: stats.browser.hitRate,
        memoryUsage: stats.browser.totalMemoryUsage,
        entries: stats.browser.totalEntries
      },
      api: {
        status: stats.api.hitRate > 60 ? 'healthy' : stats.api.hitRate > 30 ? 'warning' : 'critical',
        hitRate: stats.api.hitRate,
        memoryUsage: stats.api.totalMemoryUsage,
        entries: stats.api.totalEntries
      },
      userData: {
        status: stats.userData.hitRate > 80 ? 'healthy' : stats.userData.hitRate > 50 ? 'warning' : 'critical',
        hitRate: stats.userData.hitRate,
        memoryUsage: stats.userData.totalMemoryUsage,
        entries: stats.userData.totalEntries
      }
    };

    return health;
  }, [stats]);

  const getTotalCacheSize = useCallback(() => {
    return stats.browser.totalMemoryUsage + stats.api.totalMemoryUsage + stats.userData.totalMemoryUsage;
  }, [stats]);

  const getOverallHitRate = useCallback(() => {
    const totalHits = stats.browser.totalHits + stats.api.totalHits + stats.userData.totalHits;
    const totalMisses = stats.browser.totalMisses + stats.api.totalMisses + stats.userData.totalMisses;
    const totalRequests = totalHits + totalMisses;
    return totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
  }, [stats]);

  // Automatic cache optimization
  useEffect(() => {
    const optimizeCache = () => {
      const health = getCacheHealth();
      
      // Auto-cleanup if hit rate is too low
      Object.entries(health).forEach(([type, healthData]) => {
        if (healthData.status === 'critical' && healthData.entries > 100) {
          cleanup(type as CacheType).catch(console.error);
        }
      });
    };

    const interval = setInterval(optimizeCache, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(interval);
  }, [getCacheHealth, cleanup]);

  return {
    stats,
    isLoading,
    clearCache,
    invalidateByTags,
    cleanup,
    warmCache,
    getCacheHealth,
    getTotalCacheSize,
    getOverallHitRate,
    refreshStats
  };
}