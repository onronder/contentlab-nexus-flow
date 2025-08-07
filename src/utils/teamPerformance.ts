import { QueryClient } from '@tanstack/react-query';

// Performance monitoring utilities for team operations
export class TeamPerformanceMonitor {
  private static instance: TeamPerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private memoryTracking: Map<string, number> = new Map();

  static getInstance(): TeamPerformanceMonitor {
    if (!TeamPerformanceMonitor.instance) {
      TeamPerformanceMonitor.instance = new TeamPerformanceMonitor();
    }
    return TeamPerformanceMonitor.instance;
  }

  // Track operation performance
  trackOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    const startMemory = this.getMemoryUsage();

    return operation().then(
      (result) => {
        const duration = performance.now() - start;
        const endMemory = this.getMemoryUsage();
        
        this.recordMetric(operationName, duration);
        this.recordMemoryUsage(operationName, endMemory - startMemory);
        
        return result;
      },
      (error) => {
        const duration = performance.now() - start;
        this.recordMetric(`${operationName}_error`, duration);
        throw error;
      }
    );
  }

  // Record performance metric
  private recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    const metrics = this.metrics.get(operation)!;
    metrics.push(duration);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  // Record memory usage
  private recordMemoryUsage(operation: string, memoryDelta: number): void {
    this.memoryTracking.set(operation, memoryDelta);
  }

  // Get performance statistics
  getStatistics(operation: string) {
    const metrics = this.metrics.get(operation) || [];
    if (metrics.length === 0) {
      return null;
    }

    const sorted = [...metrics].sort((a, b) => a - b);
    return {
      count: metrics.length,
      average: metrics.reduce((sum, val) => sum + val, 0) / metrics.length,
      min: Math.min(...metrics),
      max: Math.max(...metrics),
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      lastMeasurement: metrics[metrics.length - 1]
    };
  }

  // Get all tracked operations
  getAllStatistics() {
    const allStats: Record<string, any> = {};
    for (const operation of this.metrics.keys()) {
      allStats[operation] = this.getStatistics(operation);
    }
    return allStats;
  }

  // Get memory usage
  private getMemoryUsage(): number {
    return (performance as any).memory?.usedJSHeapSize || 0;
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics.clear();
    this.memoryTracking.clear();
  }

  // Check if operation exceeds threshold
  isOperationSlow(operation: string, threshold: number): boolean {
    const stats = this.getStatistics(operation);
    return stats ? stats.average > threshold : false;
  }

  // Get performance recommendations
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getAllStatistics();

    Object.entries(stats).forEach(([operation, stat]) => {
      if (!stat) return;

      if (stat.average > 500) {
        recommendations.push(`${operation} is slow (${stat.average.toFixed(2)}ms average). Consider optimization.`);
      }
      
      if (stat.p95 > 1000) {
        recommendations.push(`${operation} has high latency peaks (${stat.p95.toFixed(2)}ms P95).`);
      }

      if (stat.count < 10 && stat.average > 200) {
        recommendations.push(`${operation} may need more data for accurate analysis.`);
      }
    });

    return recommendations;
  }
}

// Query optimization utilities
export const optimizeTeamQueries = (queryClient: QueryClient) => {
  // Prefetch commonly accessed team data
  const prefetchCommonQueries = async (teamId: string) => {
    const monitor = TeamPerformanceMonitor.getInstance();
    
    await monitor.trackOperation('prefetch_team_data', async () => {
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: ['teams', teamId],
          staleTime: 5 * 60 * 1000, // 5 minutes
        }),
        queryClient.prefetchQuery({
          queryKey: ['team-members', teamId],
          staleTime: 2 * 60 * 1000, // 2 minutes
        }),
        queryClient.prefetchQuery({
          queryKey: ['team-permissions', teamId],
          staleTime: 10 * 60 * 1000, // 10 minutes
        })
      ]);
    });
  };

  // Invalidate related queries efficiently
  const invalidateTeamQueries = async (teamId: string) => {
    await queryClient.invalidateQueries({
      queryKey: ['teams'],
      refetchType: 'active'
    });
    
    await queryClient.invalidateQueries({
      queryKey: ['team-members', teamId],
      refetchType: 'active'
    });
  };

  // Batch query updates
  const batchUpdateTeamQueries = (updates: Array<{ key: string[]; data: any }>) => {
    queryClient.getQueryCache().build(queryClient, {
      queryKey: ['team-batch-update'],
      queryFn: async () => {
        updates.forEach(({ key, data }) => {
          queryClient.setQueryData(key, data);
        });
        return true;
      }
    });
  };

  return {
    prefetchCommonQueries,
    invalidateTeamQueries,
    batchUpdateTeamQueries
  };
};

// Performance thresholds
export const TEAM_PERFORMANCE_THRESHOLDS = {
  TEAM_LOAD: 200,
  MEMBER_LOAD: 150,
  TEAM_CREATE: 500,
  TEAM_UPDATE: 300,
  TEAM_DELETE: 400,
  MEMBER_INVITE: 400,
  MEMBER_UPDATE: 250,
  MEMBER_REMOVE: 300,
  PERMISSION_CHECK: 50,
  SEARCH: 100
} as const;

// Export singleton instance
export const teamPerformanceMonitor = TeamPerformanceMonitor.getInstance();
