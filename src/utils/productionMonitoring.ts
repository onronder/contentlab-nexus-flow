/**
 * Production monitoring and health check utilities
 */

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  timestamp: number;
}

interface MonitoringData {
  healthChecks: HealthCheckResult[];
  performance: {
    pageLoadTime: number;
    resourceLoadTime: number;
    memoryUsage?: number;
  };
  errors: {
    count: number;
    lastError?: string;
    timestamp?: number;
  };
  network: {
    isOnline: boolean;
    connectionType?: string;
    effectiveType?: string;
  };
}

class ProductionMonitor {
  private healthCheckInterval?: number;
  private errorCount = 0;
  private lastError?: string;
  private lastErrorTime?: number;
  
  constructor() {
    this.initializeErrorTracking();
    this.initializePerformanceTracking();
  }
  
  private initializeErrorTracking() {
    window.addEventListener('error', (event) => {
      this.recordError(event.error?.message || 'Unknown error');
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError(event.reason?.message || 'Unhandled promise rejection');
    });
  }
  
  private initializePerformanceTracking() {
    // Track page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
        
        console.log('Page load performance:', {
          loadTime,
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          resourceLoadTime: perfData.loadEventStart - perfData.responseEnd
        });
      }, 0);
    });
  }
  
  private recordError(error: string) {
    this.errorCount++;
    this.lastError = error;
    this.lastErrorTime = Date.now();
    
    console.error('Production error recorded:', error);
  }
  
  async performHealthCheck(): Promise<HealthCheckResult[]> {
    const checks: HealthCheckResult[] = [];
    
    // Check Supabase connectivity
    checks.push(await this.checkSupabase());
    
    // Check API endpoints
    checks.push(await this.checkAPIHealth());
    
    // Check local storage
    checks.push(this.checkLocalStorage());
    
    // Check browser compatibility
    checks.push(this.checkBrowserCompatibility());
    
    return checks;
  }
  
  private async checkSupabase(): Promise<HealthCheckResult> {
    const startTime = performance.now();
    
    try {
      // Simple connectivity test
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`,
        {
          method: 'HEAD',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );
      
      const responseTime = performance.now() - startTime;
      
      return {
        service: 'Supabase',
        status: response.ok ? 'healthy' : 'degraded',
        responseTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        service: 'Supabase',
        status: 'unhealthy',
        error: (error as Error).message,
        timestamp: Date.now()
      };
    }
  }
  
  private async checkAPIHealth(): Promise<HealthCheckResult> {
    try {
      // Check if we can make basic API calls
      const startTime = performance.now();
      const response = await fetch('/health', { method: 'HEAD' });
      const responseTime = performance.now() - startTime;
      
      return {
        service: 'API',
        status: response.ok ? 'healthy' : 'degraded',
        responseTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        service: 'API',
        status: 'unhealthy',
        error: (error as Error).message,
        timestamp: Date.now()
      };
    }
  }
  
  private checkLocalStorage(): HealthCheckResult {
    try {
      const testKey = '__health_check__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      return {
        service: 'LocalStorage',
        status: 'healthy',
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        service: 'LocalStorage',
        status: 'unhealthy',
        error: (error as Error).message,
        timestamp: Date.now()
      };
    }
  }
  
  private checkBrowserCompatibility(): HealthCheckResult {
    const requiredFeatures = [
      'fetch',
      'Promise',
      'localStorage',
      'JSON',
      'MutationObserver'
    ];
    
    const unsupportedFeatures = requiredFeatures.filter(
      feature => !(feature in window)
    );
    
    if (unsupportedFeatures.length > 0) {
      return {
        service: 'Browser',
        status: 'unhealthy',
        error: `Unsupported features: ${unsupportedFeatures.join(', ')}`,
        timestamp: Date.now()
      };
    }
    
    return {
      service: 'Browser',
      status: 'healthy',
      timestamp: Date.now()
    };
  }
  
  getMonitoringData(): MonitoringData {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      healthChecks: [], // Will be populated by performHealthCheck()
      performance: {
        pageLoadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
        resourceLoadTime: navigation ? navigation.loadEventStart - navigation.responseEnd : 0,
        memoryUsage: (performance as any).memory?.usedJSHeapSize
      },
      errors: {
        count: this.errorCount,
        lastError: this.lastError,
        timestamp: this.lastErrorTime
      },
      network: {
        isOnline: navigator.onLine,
        connectionType: (navigator as any).connection?.type,
        effectiveType: (navigator as any).connection?.effectiveType
      }
    };
  }
  
  startMonitoring(intervalMs = 60000) {
    this.healthCheckInterval = window.setInterval(async () => {
      const healthChecks = await this.performHealthCheck();
      const monitoringData = { ...this.getMonitoringData(), healthChecks };
      
      // Log critical issues
      const unhealthyServices = healthChecks.filter(check => check.status === 'unhealthy');
      if (unhealthyServices.length > 0) {
        console.error('Unhealthy services detected:', unhealthyServices);
      }
      
      // Store monitoring data for debugging
      try {
        sessionStorage.setItem('monitoring_data', JSON.stringify(monitoringData));
      } catch {
        // Storage might be full, ignore
      }
    }, intervalMs);
  }
  
  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Initialize production monitoring with cache invalidation
   */
  initialize() {
    try {
      // Force cache invalidation
      this.invalidateCache();
      
      // Start monitoring
      this.startMonitoring();
      
      // Setup global debug tools
      (window as any).__healthCheck = () => this.generateHealthReport();
      (window as any).__clearCache = () => this.invalidateCache();
      
      // Silent logging for production
      if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
        this.setupProductionLogging();
      }
      
      return true;
    } catch (error) {
      // Silent failure - don't break the app
      return false;
    }
  }

  /**
   * Force browser cache invalidation
   */
  private invalidateCache() {
    try {
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear cache if available
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      
      // Force page reload with cache bypass
      if (performance.getEntriesByType('navigation')[0]) {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (nav.type !== 'reload') {
          // Only auto-reload if not already a reload to prevent loops
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      }
    } catch (error) {
      // Silent failure
    }
  }

  /**
   * Setup production-safe logging
   */
  private setupProductionLogging() {
    // Override console methods to prevent spam
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;
    
    console.error = (...args) => {
      // Only log critical errors in production
      if (args[0]?.toString().includes('TypeError') || args[0]?.toString().includes('ReferenceError')) {
        originalError.apply(console, args);
      }
    };
    
    console.warn = () => {
      // Suppress warnings in production
    };
    
    console.log = () => {
      // Suppress logs in production
    };
  }
  
  async generateHealthReport(): Promise<string> {
    const healthChecks = await this.performHealthCheck();
    const monitoringData = { ...this.getMonitoringData(), healthChecks };
    
    const healthyServices = healthChecks.filter(c => c.status === 'healthy').length;
    const totalServices = healthChecks.length;
    
    let report = `System Health Report (${new Date().toISOString()})\n`;
    report += `Overall Health: ${healthyServices}/${totalServices} services healthy\n\n`;
    
    healthChecks.forEach(check => {
      report += `${check.service}: ${check.status.toUpperCase()}`;
      if (check.responseTime) {
        report += ` (${check.responseTime.toFixed(2)}ms)`;
      }
      if (check.error) {
        report += ` - ${check.error}`;
      }
      report += '\n';
    });
    
    report += `\nPerformance:\n`;
    report += `- Page Load: ${monitoringData.performance.pageLoadTime.toFixed(2)}ms\n`;
    report += `- Resource Load: ${monitoringData.performance.resourceLoadTime.toFixed(2)}ms\n`;
    
    if (monitoringData.performance.memoryUsage) {
      report += `- Memory Usage: ${(monitoringData.performance.memoryUsage / 1024 / 1024).toFixed(2)}MB\n`;
    }
    
    report += `\nNetwork: ${monitoringData.network.isOnline ? 'Online' : 'Offline'}`;
    if (monitoringData.network.effectiveType) {
      report += ` (${monitoringData.network.effectiveType})`;
    }
    report += '\n';
    
    if (monitoringData.errors.count > 0) {
      report += `\nErrors: ${monitoringData.errors.count} total`;
      if (monitoringData.errors.lastError) {
        report += `\nLast Error: ${monitoringData.errors.lastError}`;
      }
    }
    
    return report;
  }
}

export const productionMonitor = new ProductionMonitor();

export const initializeProductionMonitoring = () => {
  productionMonitor.startMonitoring();
  
  // Add global health check function for debugging
  (window as any).__healthCheck = () => productionMonitor.generateHealthReport();
  
  console.log('Production monitoring initialized. Use __healthCheck() for status.');
  
  return () => {
    productionMonitor.stopMonitoring();
  };
};