/**
 * OpenAI Optimization Service
 * Coordinates all optimization features: caching, circuit breaking, deduplication, and fallbacks
 */

import { openaiCacheService } from './openaiCacheService';
import { openaiCircuitBreakerService } from './openaiCircuitBreakerService';
import { openaiRequestDeduplicator } from './openaiRequestDeduplicator';
import { apiMonitoringService } from './apiMonitoringService';

interface OptimizedRequestOptions {
  type: 'analysis' | 'suggestion' | 'completion';
  content: string;
  parameters: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
  fallbackEnabled?: boolean;
  cacheEnabled?: boolean;
  batchable?: boolean;
  retryOnFailure?: boolean;
}

interface OptimizedResponse<T> {
  data: T;
  source: 'cache' | 'api' | 'fallback';
  cost: number;
  tokens: number;
  responseTime: number;
  fromBatch?: boolean;
}

interface OptimizationMetrics {
  cache: ReturnType<typeof openaiCacheService.getStats>;
  circuitBreaker: ReturnType<typeof openaiCircuitBreakerService.getMetrics>;
  deduplication: ReturnType<typeof openaiRequestDeduplicator.getStats>;
  monitoring: ReturnType<typeof apiMonitoringService.getUsageMetrics>;
  overall: {
    totalRequests: number;
    successRate: number;
    averageCost: number;
    costSavings: number;
    performanceImprovement: number;
  };
}

export class OpenAIOptimizationService {
  private static instance: OpenAIOptimizationService;
  private fallbackResponses = new Map<string, any>();
  private requestCounter = 0;
  private successCounter = 0;
  private totalCost = 0;
  private totalSavings = 0;

  static getInstance(): OpenAIOptimizationService {
    if (!OpenAIOptimizationService.instance) {
      OpenAIOptimizationService.instance = new OpenAIOptimizationService();
    }
    return OpenAIOptimizationService.instance;
  }

  private constructor() {
    this.initializeFallbackResponses();
  }

  /**
   * Main optimized request method
   */
  async executeOptimizedRequest<T>(
    operation: () => Promise<T>,
    options: OptimizedRequestOptions
  ): Promise<OptimizedResponse<T>> {
    const startTime = Date.now();
    this.requestCounter++;

    try {
      // Step 1: Check cache first (if enabled)
      if (options.cacheEnabled !== false) {
        const cached = await openaiCacheService.get({
          type: options.type,
          content: options.content,
          parameters: options.parameters
        });

        if (cached) {
          return {
            data: cached,
            source: 'cache',
            cost: 0,
            tokens: 0,
            responseTime: Date.now() - startTime
          };
        }
      }

      // Step 2: Generate deduplication key
      const deduplicationKey = openaiRequestDeduplicator.generateKey(
        options.content,
        options.parameters
      );

      // Step 3: Execute with circuit breaker and deduplication
      const optimizedOperation = async () => {
        return await openaiCircuitBreakerService.execute(async () => {
          const result = await operation();
          this.successCounter++;
          return result;
        });
      };

      const result = await openaiRequestDeduplicator.execute(
        optimizedOperation,
        deduplicationKey,
        {
          priority: options.priority,
          cost: this.estimateCost(options),
          metadata: { type: options.type, parameters: options.parameters },
          batchable: options.batchable,
          type: options.type
        }
      );

      const responseTime = Date.now() - startTime;
      const cost = this.calculateActualCost(result, options);
      const tokens = this.extractTokenCount(result);

      // Step 4: Cache the result (if enabled)
      if (options.cacheEnabled !== false) {
        await openaiCacheService.set(
          {
            type: options.type,
            content: options.content,
            parameters: options.parameters
          },
          result,
          cost,
          tokens
        );
      }

      // Step 5: Record metrics
      this.recordMetrics(cost, responseTime, true);
      // Record API usage
      try {
        apiMonitoringService.recordUsage({
          endpoint: `openai_${options.type}`,
          method: 'POST',
          status: 200,
          responseTime,
          cost,
          tokensUsed: tokens
        });
      } catch (error) {
        console.warn('Failed to record API usage:', error);
      }

      return {
        data: result,
        source: 'api',
        cost,
        tokens,
        responseTime
      };

    } catch (error) {
      console.error('Optimized request failed:', error);

      // Step 6: Try fallback if enabled
      if (options.fallbackEnabled !== false) {
        const fallback = await this.tryFallback(options);
        if (fallback) {
          return {
            data: fallback,
            source: 'fallback',
            cost: 0,
            tokens: 0,
            responseTime: Date.now() - startTime
          };
        }
      }

      // Record failed request
      this.recordMetrics(0, Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Bulk optimization for multiple requests
   */
  async executeBulkOptimized<T>(
    requests: Array<{
      operation: () => Promise<T>;
      options: OptimizedRequestOptions;
    }>
  ): Promise<Array<OptimizedResponse<T>>> {
    // Group batchable requests
    const batchableRequests = requests.filter(req => req.options.batchable);
    const individualRequests = requests.filter(req => !req.options.batchable);

    const results: Array<OptimizedResponse<T>> = [];

    // Execute individual requests in parallel (with concurrency limit)
    const concurrencyLimit = 5;
    for (let i = 0; i < individualRequests.length; i += concurrencyLimit) {
      const batch = individualRequests.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.allSettled(
        batch.map(req => this.executeOptimizedRequest(req.operation, req.options))
      );

      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('Bulk request failed:', result.reason);
        }
      });
    }

    // Handle batchable requests
    if (batchableRequests.length > 0) {
      // Group by type and execute in batches
      const typeGroups = new Map<string, typeof batchableRequests>();
      batchableRequests.forEach(req => {
        const group = typeGroups.get(req.options.type) || [];
        group.push(req);
        typeGroups.set(req.options.type, group);
      });

      for (const [type, groupRequests] of typeGroups.entries()) {
        const batchResults = await Promise.allSettled(
          groupRequests.map(req => this.executeOptimizedRequest(req.operation, req.options))
        );

        batchResults.forEach(result => {
          if (result.status === 'fulfilled') {
            results.push({ ...result.value, fromBatch: true });
          }
        });
      }
    }

    return results;
  }

  /**
   * Get comprehensive optimization metrics
   */
  getMetrics(): OptimizationMetrics {
    const cacheStats = openaiCacheService.getStats();
    const circuitBreakerMetrics = openaiCircuitBreakerService.getMetrics();
    const deduplicationStats = openaiRequestDeduplicator.getStats();
    const monitoringStats = apiMonitoringService.getUsageMetrics('day');

    const successRate = this.requestCounter > 0 ? this.successCounter / this.requestCounter : 0;
    const averageCost = this.requestCounter > 0 ? this.totalCost / this.requestCounter : 0;
    const costSavings = cacheStats.costSaved + deduplicationStats.costSaved;
    const performanceImprovement = cacheStats.hitRate * 100; // Percentage improvement from caching

    return {
      cache: cacheStats,
      circuitBreaker: circuitBreakerMetrics,
      deduplication: deduplicationStats,
      monitoring: monitoringStats,
      overall: {
        totalRequests: this.requestCounter,
        successRate,
        averageCost,
        costSavings,
        performanceImprovement
      }
    };
  }

  /**
   * Optimize configuration based on usage patterns
   */
  async optimizeConfiguration(): Promise<void> {
    const metrics = this.getMetrics();
    
    // Adjust cache TTL based on hit rate
    if (metrics.cache.hitRate < 0.3) {
      console.log('Low cache hit rate detected, consider adjusting cache strategy');
    }

    // Adjust circuit breaker thresholds based on error rate
    if (metrics.overall.successRate < 0.8) {
      openaiCircuitBreakerService.updateConfig({
        failureThreshold: Math.max(3, Math.floor(metrics.circuitBreaker.config.failureThreshold * 0.8))
      });
    }

    // Adjust cost thresholds based on usage
    if (metrics.overall.averageCost > 0.05) { // $0.05 per request is high
      openaiCircuitBreakerService.updateConfig({
        costThresholdDaily: Math.max(20, metrics.circuitBreaker.config.costThresholdDaily * 0.9)
      });
    }
  }

  /**
   * Emergency optimization - aggressive cost reduction
   */
  async enableEmergencyOptimization(): Promise<void> {
    console.warn('Enabling emergency optimization mode');
    
    // Force circuit breaker to be more aggressive
    openaiCircuitBreakerService.updateConfig({
      failureThreshold: 2,
      costThresholdDaily: 10,
      quotaThresholdPercentage: 70
    });

    // Clear expensive cache entries
    await openaiCacheService.clear();

    // Clear pending requests to reduce queue
    openaiRequestDeduplicator.clearPending();
  }

  /**
   * Warm up cache with common requests
   */
  async warmupCache(commonRequests: Array<{
    type: 'analysis' | 'suggestion' | 'completion';
    content: string;
    parameters: Record<string, any>;
    dataLoader: () => Promise<any>;
  }>): Promise<void> {
    const cacheEntries = commonRequests.map(req => ({
      key: {
        type: req.type,
        content: req.content,
        parameters: req.parameters
      },
      dataLoader: req.dataLoader
    }));

    await openaiCacheService.warmCache(cacheEntries as any);
  }

  private async tryFallback(options: OptimizedRequestOptions): Promise<any | null> {
    const fallbackKey = `${options.type}_${this.hashContent(options.content)}`;
    
    // Check for stored fallback response
    const stored = this.fallbackResponses.get(fallbackKey);
    if (stored) {
      console.log(`Using fallback response for ${options.type} request`);
      return stored;
    }

    // Generate simple fallback based on type
    switch (options.type) {
      case 'analysis':
        return this.generateAnalysisFallback(options.content);
      case 'suggestion':
        return this.generateSuggestionFallback(options.content);
      case 'completion':
        return this.generateCompletionFallback(options.content);
      default:
        return null;
    }
  }

  private generateAnalysisFallback(content: string): any {
    return {
      summary: 'Analysis temporarily unavailable. Basic summary generated from content structure.',
      insights: [
        'Content analysis service is currently unavailable',
        'This is a simplified analysis based on basic content metrics',
        'Please try again later for detailed AI-powered insights'
      ],
      confidence: 0.3,
      isFallback: true
    };
  }

  private generateSuggestionFallback(content: string): any {
    return {
      suggestions: [
        'AI suggestions are temporarily unavailable',
        'Please review your content manually',
        'Service will resume automatically once connectivity is restored'
      ],
      confidence: 0.2,
      isFallback: true
    };
  }

  private generateCompletionFallback(content: string): any {
    return {
      completion: 'AI completion service is temporarily unavailable. Please try again later.',
      isFallback: true
    };
  }

  private initializeFallbackResponses(): void {
    // Pre-populate with common fallback responses
    this.fallbackResponses.set('analysis_common', {
      summary: 'Standard analysis template',
      insights: ['Basic content structure analysis', 'Word count and readability metrics'],
      confidence: 0.4
    });
  }

  private estimateCost(options: OptimizedRequestOptions): number {
    // Rough cost estimation based on content length and model
    const baseRate = 0.002; // $0.002 per 1K tokens (rough estimate)
    const contentLength = options.content.length;
    const estimatedTokens = Math.ceil(contentLength / 4); // Rough token estimation
    
    return (estimatedTokens / 1000) * baseRate;
  }

  private calculateActualCost(result: any, options: OptimizedRequestOptions): number {
    // Extract actual cost from result if available
    if (result && typeof result === 'object') {
      if (result.cost) return result.cost;
      if (result.usage && result.usage.total_tokens) {
        const tokens = result.usage.total_tokens;
        return (tokens / 1000) * 0.002; // Rough calculation
      }
    }
    
    return this.estimateCost(options);
  }

  private extractTokenCount(result: any): number {
    if (result && typeof result === 'object') {
      if (result.usage && result.usage.total_tokens) {
        return result.usage.total_tokens;
      }
    }
    return 0;
  }

  private recordMetrics(cost: number, responseTime: number, success: boolean): void {
    this.totalCost += cost;
    if (cost > 0) {
      openaiCircuitBreakerService.addCost(cost);
    }
  }

  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

export const openaiOptimizationService = OpenAIOptimizationService.getInstance();