/**
 * OpenAI Response Caching Service
 * Implements multi-level caching for OpenAI API responses to reduce costs and improve performance
 */

interface CachedResponse {
  data: any;
  timestamp: number;
  ttl: number;
  cost: number;
  tokens: number;
  metadata: {
    model: string;
    type: string;
    hash: string;
  };
}

interface CacheKey {
  type: 'analysis' | 'suggestion' | 'completion';
  content: string;
  parameters: Record<string, any>;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  costSaved: number;
  storageUsed: number;
}

export class OpenAICacheService {
  private static instance: OpenAICacheService;
  private cache = new Map<string, CachedResponse>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    costSaved: 0,
    storageUsed: 0
  };

  // Cache TTL settings (in milliseconds)
  private readonly cacheTTL = {
    analysis: 24 * 60 * 60 * 1000, // 24 hours for competitor analysis
    suggestion: 4 * 60 * 60 * 1000, // 4 hours for content suggestions
    completion: 2 * 60 * 60 * 1000 // 2 hours for general completions
  };

  // Maximum cache size (number of entries)
  private readonly maxCacheSize = 1000;

  static getInstance(): OpenAICacheService {
    if (!OpenAICacheService.instance) {
      OpenAICacheService.instance = new OpenAICacheService();
    }
    return OpenAICacheService.instance;
  }

  private constructor() {
    // Start cleanup timer
    setInterval(() => this.cleanup(), 60 * 60 * 1000); // Cleanup every hour
  }

  /**
   * Generate cache key from request parameters
   */
  private generateCacheKey(key: CacheKey): string {
    const contentHash = this.hashContent(key.content);
    const paramHash = this.hashContent(JSON.stringify(key.parameters));
    return `${key.type}:${contentHash}:${paramHash}`;
  }

  /**
   * Simple hash function for content
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if cached response exists and is valid
   */
  async get(key: CacheKey): Promise<any | null> {
    this.stats.totalRequests++;
    
    const cacheKey = this.generateCacheKey(key);
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      this.stats.misses++;
      return null;
    }

    // Check if cache entry has expired
    const now = Date.now();
    if (now > cached.timestamp + cached.ttl) {
      this.cache.delete(cacheKey);
      this.stats.misses++;
      return null;
    }

    // Update stats
    this.stats.hits++;
    this.stats.costSaved += cached.cost;

    console.log(`Cache hit for ${key.type} request (saved $${cached.cost.toFixed(4)})`);
    return cached.data;
  }

  /**
   * Store response in cache
   */
  async set(key: CacheKey, data: any, cost: number = 0, tokens: number = 0): Promise<void> {
    const cacheKey = this.generateCacheKey(key);
    const ttl = this.cacheTTL[key.type] || this.cacheTTL.completion;

    const cached: CachedResponse = {
      data,
      timestamp: Date.now(),
      ttl,
      cost,
      tokens,
      metadata: {
        model: key.parameters.model || 'unknown',
        type: key.type,
        hash: this.hashContent(key.content)
      }
    };

    // Check cache size and cleanup if necessary
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    this.cache.set(cacheKey, cached);
    this.updateStorageStats();

    console.log(`Cached ${key.type} response (cost: $${cost.toFixed(4)}, tokens: ${tokens})`);
  }

  /**
   * Invalidate cache entries by type
   */
  async invalidateByType(type: string): Promise<void> {
    const keysToDelete: string[] = [];
    
    for (const [key, cached] of this.cache.entries()) {
      if (cached.metadata.type === type) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.updateStorageStats();
    
    console.log(`Invalidated ${keysToDelete.length} cache entries of type: ${type}`);
  }

  /**
   * Invalidate cache entries by content hash
   */
  async invalidateByContent(content: string): Promise<void> {
    const contentHash = this.hashContent(content);
    const keysToDelete: string[] = [];
    
    for (const [key, cached] of this.cache.entries()) {
      if (cached.metadata.hash === contentHash) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.updateStorageStats();
    
    console.log(`Invalidated ${keysToDelete.length} cache entries for content hash: ${contentHash}`);
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      costSaved: 0,
      storageUsed: 0
    };
    console.log('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number; efficiency: number } {
    const hitRate = this.stats.totalRequests > 0 
      ? this.stats.hits / this.stats.totalRequests 
      : 0;
    
    const efficiency = this.stats.totalRequests > 0
      ? this.stats.costSaved / this.stats.totalRequests
      : 0;

    return {
      ...this.stats,
      hitRate,
      efficiency
    };
  }

  /**
   * Get cache contents for debugging
   */
  getCacheContents(): Array<{ key: string; cached: CachedResponse }> {
    return Array.from(this.cache.entries()).map(([key, cached]) => ({
      key,
      cached: {
        ...cached,
        data: '[DATA]' // Don't expose actual data in debug
      }
    }));
  }

  /**
   * Warm cache with frequently used requests
   */
  async warmCache(entries: Array<{ key: CacheKey; dataLoader: () => Promise<any> }>): Promise<void> {
    const promises = entries.map(async ({ key, dataLoader }) => {
      try {
        // Check if already cached
        const existing = await this.get(key);
        if (existing) return;

        // Load and cache data
        const data = await dataLoader();
        await this.set(key, data);
      } catch (error) {
        console.warn(`Failed to warm cache for ${key.type}:`, error);
      }
    });

    await Promise.all(promises);
    console.log(`Cache warming completed for ${entries.length} entries`);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.timestamp + cached.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.updateStorageStats();

    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Evict oldest cache entries when size limit reached
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, cached] of this.cache.entries()) {
      if (cached.timestamp < oldestTimestamp) {
        oldestTimestamp = cached.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log('Evicted oldest cache entry due to size limit');
    }
  }

  /**
   * Update storage usage statistics
   */
  private updateStorageStats(): void {
    this.stats.storageUsed = this.cache.size;
  }

  /**
   * Helper method to check if content is similar enough to use cached result
   */
  isSimilarContent(content1: string, content2: string, threshold: number = 0.8): boolean {
    const similarity = this.calculateSimilarity(content1, content2);
    return similarity >= threshold;
  }

  /**
   * Simple similarity calculation based on common words
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}

export const openaiCacheService = OpenAICacheService.getInstance();