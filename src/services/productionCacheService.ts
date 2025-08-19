/**
 * Production-ready caching service with advanced strategies
 */
import { productionLogger } from '@/utils/logger';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  memoryUsage: number;
}

class ProductionCacheService {
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, hitRate: 0, memoryUsage: 0 };
  private maxSize = 1000; // Maximum number of cache entries
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupProcess();
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.updateHitRate();

    return entry.data as T;
  }

  /**
   * Set item in cache with optional TTL and tags
   */
  set<T>(key: string, data: T, ttl?: number, tags: string[] = []): void {
    // Check cache size and evict if necessary
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      tags,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    this.cache.set(key, entry);
    this.updateStats();
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateStats();
    }
    return deleted;
  }

  /**
   * Clear cache by tags
   */
  invalidateByTags(tags: string[]): number {
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.updateStats();
      productionLogger.log(`Cache invalidated ${deletedCount} entries by tags: ${tags.join(', ')}`);
    }

    return deletedCount;
  }

  /**
   * Clear expired entries
   */
  cleanupExpired(): number {
    let deletedCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.updateStats();
      productionLogger.log(`Cache cleanup removed ${deletedCount} expired entries`);
    }

    return deletedCount;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.updateStats();
    productionLogger.log(`Cache cleared ${size} entries`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache size in bytes (approximate)
   */
  getMemoryUsage(): number {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      totalSize += this.estimateSize(key) + this.estimateSize(entry);
    }

    return totalSize;
  }

  /**
   * Preload multiple cache entries
   */
  async preload<T>(entries: Array<{
    key: string;
    loader: () => Promise<T>;
    ttl?: number;
    tags?: string[];
  }>): Promise<void> {
    const promises = entries.map(async ({ key, loader, ttl, tags }) => {
      try {
        const data = await loader();
        this.set(key, data, ttl, tags);
      } catch (error) {
        productionLogger.error(`Failed to preload cache entry: ${key}`, error);
      }
    });

    await Promise.allSettled(promises);
    productionLogger.log(`Cache preloaded ${entries.length} entries`);
  }

  /**
   * Get or set pattern - if key exists return it, otherwise load and cache
   */
  async getOrSet<T>(
    key: string, 
    loader: () => Promise<T>, 
    ttl?: number, 
    tags?: string[]
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await loader();
    this.set(key, data, ttl, tags);
    return data;
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private updateStats(): void {
    this.stats.size = this.cache.size;
    this.stats.memoryUsage = this.getMemoryUsage();
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      productionLogger.log(`Cache evicted LRU entry: ${oldestKey}`);
    }
  }

  private estimateSize(obj: any): number {
    return JSON.stringify(obj).length * 2; // Rough estimate (2 bytes per char)
  }

  private startCleanupProcess(): void {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

export const productionCache = new ProductionCacheService();
export type { CacheStats };