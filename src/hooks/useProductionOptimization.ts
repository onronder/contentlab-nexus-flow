/**
 * Production optimization hook for performance monitoring and management
 */
import { useState, useEffect, useCallback } from 'react';
import { productionCache } from '@/services/productionCacheService';
import { securityAudit } from '@/services/securityAuditService';
import { productionLogger } from '@/utils/logger';

interface OptimizationMetrics {
  cacheHitRate: number;
  securityScore: number;
  performanceScore: number;
  overallHealth: number;
  recommendations: string[];
  lastUpdated: Date;
}

interface OptimizationSettings {
  enableAutoCache: boolean;
  enableSecurityMonitoring: boolean;
  performanceThreshold: number;
  securityThreshold: number;
}

export function useProductionOptimization() {
  const [metrics, setMetrics] = useState<OptimizationMetrics>({
    cacheHitRate: 0,
    securityScore: 0,
    performanceScore: 0,
    overallHealth: 0,
    recommendations: [],
    lastUpdated: new Date()
  });

  const [settings, setSettings] = useState<OptimizationSettings>({
    enableAutoCache: true,
    enableSecurityMonitoring: true,
    performanceThreshold: 80,
    securityThreshold: 80
  });

  const [isOptimizing, setIsOptimizing] = useState(false);

  // Calculate performance metrics
  const calculateMetrics = useCallback(async () => {
    try {
      const cacheStats = productionCache.getStats();
      const securityReport = securityAudit.getLatestReport();
      
      const cacheHitRate = Math.round(cacheStats.hitRate * 100);
      const securityScore = securityReport?.overall_score || 0;
      
      // Simple performance score calculation
      const performanceScore = Math.min(100, Math.max(0, 
        100 - (cacheStats.memoryUsage / 10000) // Rough calculation
      ));

      const overallHealth = Math.round((cacheHitRate + securityScore + performanceScore) / 3);

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (cacheHitRate < settings.performanceThreshold) {
        recommendations.push('Consider optimizing cache strategies');
      }
      
      if (securityScore < settings.securityThreshold) {
        recommendations.push('Security improvements needed');
      }
      
      if (performanceScore < settings.performanceThreshold) {
        recommendations.push('Performance optimization recommended');
      }

      if (overallHealth >= 90) {
        recommendations.push('System is performing excellently');
      }

      setMetrics({
        cacheHitRate,
        securityScore,
        performanceScore,
        overallHealth,
        recommendations,
        lastUpdated: new Date()
      });

    } catch (error) {
      productionLogger.error('Failed to calculate optimization metrics', error);
    }
  }, [settings.performanceThreshold, settings.securityThreshold]);

  // Auto-optimization features
  const runAutoOptimization = useCallback(async () => {
    if (!settings.enableAutoCache) return;

    setIsOptimizing(true);
    try {
      // Clear expired cache entries
      const removed = productionCache.cleanupExpired();
      
      if (removed > 0) {
        productionLogger.log(`Auto-optimization: Removed ${removed} expired cache entries`);
      }

      // Run security audit if monitoring is enabled
      if (settings.enableSecurityMonitoring) {
        const report = securityAudit.getLatestReport();
        if (!report || Date.now() - new Date(report.audit_timestamp).getTime() > 24 * 60 * 60 * 1000) {
          await securityAudit.runSecurityAudit();
          productionLogger.log('Auto-optimization: Security audit completed');
        }
      }

      await calculateMetrics();
      
    } catch (error) {
      productionLogger.error('Auto-optimization failed', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [settings.enableAutoCache, settings.enableSecurityMonitoring, calculateMetrics]);

  // Manual optimization functions
  const optimizeCache = useCallback(async () => {
    setIsOptimizing(true);
    try {
      const stats = productionCache.getStats();
      
      // Clear cache if hit rate is very low
      if (stats.hitRate < 0.2) {
        productionCache.clear();
        productionLogger.log('Cache cleared due to low hit rate');
      } else {
        // Just clean expired entries
        const removed = productionCache.cleanupExpired();
        productionLogger.log(`Cache optimized: Removed ${removed} expired entries`);
      }
      
      await calculateMetrics();
    } catch (error) {
      productionLogger.error('Cache optimization failed', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [calculateMetrics]);

  const runSecurityAudit = useCallback(async () => {
    setIsOptimizing(true);
    try {
      await securityAudit.runSecurityAudit();
      await calculateMetrics();
      productionLogger.log('Manual security audit completed');
    } catch (error) {
      productionLogger.error('Security audit failed', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [calculateMetrics]);

  const preloadCriticalData = useCallback(async () => {
    setIsOptimizing(true);
    try {
      // Preload common queries
      await productionCache.preload([
        {
          key: 'dashboard-stats',
          loader: async () => ({}), // Would load real dashboard data
          ttl: 5 * 60 * 1000, // 5 minutes
          tags: ['dashboard', 'stats']
        },
        {
          key: 'user-settings',
          loader: async () => ({}), // Would load user settings
          ttl: 15 * 60 * 1000, // 15 minutes
          tags: ['settings', 'user']
        }
      ]);
      
      await calculateMetrics();
      productionLogger.log('Critical data preloaded');
    } catch (error) {
      productionLogger.error('Data preloading failed', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [calculateMetrics]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<OptimizationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    productionLogger.log('Optimization settings updated', newSettings);
  }, []);

  // Get optimization status
  const getOptimizationStatus = useCallback(() => {
    return {
      isHealthy: metrics.overallHealth >= settings.performanceThreshold,
      needsAttention: metrics.recommendations.length > 0,
      criticalIssues: metrics.securityScore < 60 || metrics.performanceScore < 60,
      lastOptimized: metrics.lastUpdated
    };
  }, [metrics, settings.performanceThreshold]);

  // Initialize and set up auto-optimization
  useEffect(() => {
    calculateMetrics();
    
    // Run auto-optimization every 15 minutes
    const interval = setInterval(runAutoOptimization, 15 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [calculateMetrics, runAutoOptimization]);

  return {
    metrics,
    settings,
    isOptimizing,
    updateSettings,
    optimizeCache,
    runSecurityAudit,
    preloadCriticalData,
    runAutoOptimization,
    getOptimizationStatus,
    calculateMetrics
  };
}