import { productionLogger } from './logger';

/**
 * Production utility functions for optimized performance and monitoring
 */

// Environment detection
export const isProduction = (): boolean => import.meta.env.PROD;
export const isDevelopment = (): boolean => import.meta.env.DEV;

// Error boundary handler for production
export const handleProductionError = (error: Error, errorInfo: any) => {
  productionLogger.errorWithContext(error, 'Production Error Boundary', {
    componentStack: errorInfo.componentStack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  });
};

// Performance monitoring
export const performanceMonitor = {
  mark: (name: string) => {
    if (isDevelopment()) {
      performance.mark(name);
    }
  },
  
  measure: (name: string, startMark: string, endMark?: string) => {
    if (isDevelopment()) {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name)[0];
        productionLogger.log(`Performance: ${name} took ${measure.duration.toFixed(2)}ms`);
      } catch (error) {
        productionLogger.warn(`Performance measurement failed for ${name}`);
      }
    }
  }
};

// Memory usage monitoring
export const memoryMonitor = {
  getUsage: () => {
    if ('memory' in performance) {
      return {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      };
    }
    return null;
  },
  
  logUsage: (context: string) => {
    if (isDevelopment()) {
      const usage = memoryMonitor.getUsage();
      if (usage) {
        productionLogger.log(`Memory usage (${context}): ${(usage.used / 1024 / 1024).toFixed(2)}MB`);
      }
    }
  }
};

// Production-safe console replacements
export const safeConsole = {
  log: (...args: any[]) => isDevelopment() && console.log(...args),
  warn: (...args: any[]) => console.warn(...args),
  error: (...args: any[]) => console.error(...args),
  group: (label: string) => isDevelopment() && console.group(label),
  groupEnd: () => isDevelopment() && console.groupEnd()
};

// Feature flags for production deployment
export const featureFlags = {
  enableAnalytics: isProduction(),
  enableDebugMode: isDevelopment(),
  enablePerformanceMonitoring: true,
  enableErrorReporting: isProduction(),
  enableRealTimeUpdates: true,
  enableAdvancedLogging: isDevelopment()
};

// Database connection monitoring
export const dbMonitor = {
  connectionCount: 0,
  maxConnections: 50,
  
  trackConnection: () => {
    dbMonitor.connectionCount++;
    if (dbMonitor.connectionCount > dbMonitor.maxConnections) {
      productionLogger.warn(`High database connection count: ${dbMonitor.connectionCount}`);
    }
  },
  
  releaseConnection: () => {
    dbMonitor.connectionCount = Math.max(0, dbMonitor.connectionCount - 1);
  }
};

// Cache management
export const cacheManager = {
  clear: (cacheName?: string) => {
    if (isDevelopment()) {
      if (cacheName) {
        productionLogger.log(`Clearing cache: ${cacheName}`);
      } else {
        productionLogger.log('Clearing all caches');
      }
    }
  },
  
  invalidate: (key: string) => {
    if (isDevelopment()) {
      productionLogger.log(`Invalidating cache key: ${key}`);
    }
  }
};

// Production health check
export const healthCheck = {
  status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
  
  check: async (): Promise<boolean> => {
    try {
      // Basic health checks
      const memoryUsage = memoryMonitor.getUsage();
      if (memoryUsage && memoryUsage.used / memoryUsage.limit > 0.9) {
        healthCheck.status = 'degraded';
        productionLogger.warn('High memory usage detected');
        return false;
      }
      
      healthCheck.status = 'healthy';
      return true;
    } catch (error) {
      healthCheck.status = 'unhealthy';
      productionLogger.error('Health check failed', error);
      return false;
    }
  }
};