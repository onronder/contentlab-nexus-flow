import { CachingService } from './cachingService';

interface StatisticalResult {
  data: any;
  timestamp: number;
  confidence: number;
  modelVersion: string;
  computationTime: number;
}

interface CacheKey {
  method: string;
  parameters: Record<string, any>;
  dataHash: string;
}

class StatisticalCacheService {
  private cache: CachingService;
  private computationMetrics: Map<string, { totalTime: number; calls: number }> = new Map();

  constructor() {
    this.cache = new CachingService({
      maxEntries: 5000,
      defaultTTL: 15 * 60 * 1000, // 15 minutes for statistical results
      enableCompression: true
    });
  }

  private generateCacheKey(method: string, parameters: Record<string, any>, dataHash: string): string {
    const paramString = JSON.stringify(parameters, Object.keys(parameters).sort());
    return `stat:${method}:${btoa(paramString)}:${dataHash}`;
  }

  private hashData(data: any): string {
    return btoa(JSON.stringify(data)).slice(0, 16);
  }

  async cacheStatisticalResult<T>(
    method: string,
    parameters: Record<string, any>,
    data: any,
    computeFn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    const dataHash = this.hashData(data);
    const cacheKey = this.generateCacheKey(method, parameters, dataHash);

    // Try to get from cache first
    const cached = this.cache.get<StatisticalResult>(cacheKey);
    if (cached && this.isResultValid(cached)) {
      this.updateMetrics(method, performance.now() - startTime, true);
      return cached.data as T;
    }

    // Compute fresh result
    try {
      const result = await computeFn();
      const computationTime = performance.now() - startTime;

      const cachedResult: StatisticalResult = {
        data: result,
        timestamp: Date.now(),
        confidence: this.calculateResultConfidence(result),
        modelVersion: '1.0',
        computationTime
      };

      // Cache with adaptive TTL based on computation complexity
      const ttl = this.calculateTTL(computationTime, parameters);
      this.cache.set(cacheKey, cachedResult, { 
        ttl,
        tags: [method, 'statistical'],
        metadata: { method, computationTime }
      });

      this.updateMetrics(method, computationTime, false);
      return result;
    } catch (error) {
      this.updateMetrics(method, performance.now() - startTime, false);
      throw error;
    }
  }

  private isResultValid(result: StatisticalResult): boolean {
    const age = Date.now() - result.timestamp;
    const maxAge = result.confidence > 0.9 ? 20 * 60 * 1000 : 10 * 60 * 1000; // Higher confidence = longer TTL
    return age < maxAge;
  }

  private calculateResultConfidence(result: any): number {
    // Simple confidence calculation based on result structure
    if (Array.isArray(result) && result.length > 0) {
      return Math.min(0.95, 0.7 + (result.length * 0.05));
    }
    if (typeof result === 'object' && result !== null) {
      const keys = Object.keys(result);
      return Math.min(0.95, 0.6 + (keys.length * 0.1));
    }
    return 0.5;
  }

  private calculateTTL(computationTime: number, parameters: Record<string, any>): number {
    // Adaptive TTL: expensive computations cached longer
    const baseTime = 5 * 60 * 1000; // 5 minutes base
    const complexityMultiplier = Math.min(4, computationTime / 1000); // Max 4x multiplier
    const parameterComplexity = Object.keys(parameters).length * 0.1;
    
    return baseTime * (1 + complexityMultiplier + parameterComplexity);
  }

  private updateMetrics(method: string, time: number, cacheHit: boolean) {
    const current = this.computationMetrics.get(method) || { totalTime: 0, calls: 0 };
    this.computationMetrics.set(method, {
      totalTime: current.totalTime + time,
      calls: current.calls + 1
    });
  }

  // Forecasting-specific caching
  async cacheForecast<T>(
    dataPoints: any[],
    parameters: { horizon: number; confidence: number },
    computeFn: () => Promise<T>
  ): Promise<T> {
    return this.cacheStatisticalResult('forecast', parameters, dataPoints, computeFn);
  }

  // Trend analysis caching
  async cacheTrendAnalysis<T>(
    timeSeries: any[],
    parameters: { window: number; method: string },
    computeFn: () => Promise<T>
  ): Promise<T> {
    return this.cacheStatisticalResult('trend', parameters, timeSeries, computeFn);
  }

  // Anomaly detection caching
  async cacheAnomalyDetection<T>(
    data: any[],
    parameters: { threshold: number; method: string },
    computeFn: () => Promise<T>
  ): Promise<T> {
    return this.cacheStatisticalResult('anomaly', parameters, data, computeFn);
  }

  // Precompute and cache common statistical operations
  async precomputeCommonAnalytics(projectId: string, teamId?: string) {
    const commonOperations = [
      { method: 'weekly_trends', horizon: 7 },
      { method: 'monthly_forecast', horizon: 30 },
      { method: 'quarterly_projection', horizon: 90 }
    ];

    const results = await Promise.allSettled(
      commonOperations.map(async (op) => {
        const key = `precomputed:${projectId}:${op.method}`;
        // In a real implementation, this would fetch and compute actual analytics
        return this.cache.set(key, { computed: true, timestamp: Date.now() }, {
          ttl: 30 * 60 * 1000, // 30 minutes
          tags: ['precomputed', op.method]
        });
      })
    );

    return results;
  }

  // Cache management
  invalidateStatisticalCaches(tags?: string[]) {
    if (tags) {
      this.cache.invalidateByTags(tags);
    } else {
      this.cache.invalidateByTags(['statistical']);
    }
  }

  getPerformanceMetrics() {
    const cacheStats = this.cache.getStats();
    const computationStats = Array.from(this.computationMetrics.entries()).map(([method, stats]) => ({
      method,
      avgComputationTime: stats.totalTime / stats.calls,
      totalCalls: stats.calls
    }));

    return {
      cache: cacheStats,
      computations: computationStats,
      efficiency: {
        hitRate: (cacheStats.hits || 0) / ((cacheStats.hits || 0) + (cacheStats.misses || 0)),
        avgSavings: computationStats.reduce((sum, stat) => sum + stat.avgComputationTime, 0) / computationStats.length
      }
    };
  }

  // Cleanup expired statistical results
  cleanup() {
    this.cache.cleanup();
    
    // Reset metrics older than 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.computationMetrics.clear();
  }
}

export const statisticalCacheService = new StatisticalCacheService();