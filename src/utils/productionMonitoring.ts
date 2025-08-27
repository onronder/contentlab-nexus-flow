import { supabase } from '@/integrations/supabase/client';
import { productionLogger } from './productionLogger';
import { isProduction } from './production';

/**
 * Production monitoring and health check utilities with smart authentication
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
  private failedChecks = 0;
  private maxFailedChecks = 3;
  private isCircuitOpen = false;
  private lastSuccessfulCheck = 0;
  
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
        if (perfData) {
          const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
          
          productionLogger.log('Page load performance tracked', {
            loadTime,
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            resourceLoadTime: perfData.loadEventStart - perfData.responseEnd
          });
        }
      }, 0);
    });
  }
  
  private recordError(error: string) {
    this.errorCount++;
    this.lastError = error;
    this.lastErrorTime = Date.now();
    
    productionLogger.error('Production error recorded', { error });
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
      // Check if user is authenticated first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        return {
          service: 'Supabase',
          status: 'unhealthy',
          error: `Auth error: ${sessionError.message}`,
          timestamp: Date.now()
        };
      }
      
      if (!session) {
        return {
          service: 'Supabase',
          status: 'degraded',
          error: 'No active session - monitoring disabled',
          timestamp: Date.now()
        };
      }

      // Authenticated health check using Supabase client
      const { error } = await supabase.from('profiles').select('id').limit(1);
      
      const responseTime = performance.now() - startTime;
      
      if (error) {
        this.failedChecks++;
        return {
          service: 'Supabase',
          status: 'unhealthy',
          error: error.message,
          responseTime,
          timestamp: Date.now()
        };
      }

      this.failedChecks = 0;
      this.lastSuccessfulCheck = Date.now();
      
      return {
        service: 'Supabase',
        status: 'healthy',
        responseTime,
        timestamp: Date.now()
      };
    } catch (error) {
      this.failedChecks++;
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
  
  startMonitoring(intervalMs = 300000) { // 5 minutes instead of 1 minute
    // Circuit breaker pattern
    this.healthCheckInterval = window.setInterval(async () => {
      // Skip if circuit is open and not enough time has passed
      if (this.isCircuitOpen && Date.now() - this.lastSuccessfulCheck < 600000) { // 10 minutes
        return;
      }

      // Reset circuit if max failures reached
      if (this.failedChecks >= this.maxFailedChecks) {
        this.isCircuitOpen = true;
        productionLogger.warn('Health check circuit opened due to failures');
        return;
      }

      try {
        const healthChecks = await this.performHealthCheck();
        const monitoringData = { ...this.getMonitoringData(), healthChecks };
        
        // Only log critical issues, not warnings
        const unhealthyServices = healthChecks.filter(check => 
          check.status === 'unhealthy' && !check.error?.includes('No active session')
        );
        
        if (unhealthyServices.length > 0) {
          productionLogger.error('Critical services unhealthy', { unhealthyServices });
        }
        
        // Store monitoring data for debugging (with size limit)
        try {
          const dataStr = JSON.stringify(monitoringData);
          if (dataStr.length < 50000) { // 50KB limit
            sessionStorage.setItem('monitoring_data', dataStr);
          }
        } catch {
          // Storage error, ignore silently
        }

        // Reset circuit on successful check
        if (this.isCircuitOpen && unhealthyServices.length === 0) {
          this.isCircuitOpen = false;
          this.failedChecks = 0;
          productionLogger.log('Health check circuit restored');
        }
      } catch (error) {
        this.failedChecks++;
        productionLogger.error('Health check failed', error);
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
   * Initialize production monitoring with smart authentication checks
   */
  async initialize() {
    try {
      // Check if user is authenticated before starting intensive monitoring
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        productionLogger.log('Monitoring initialization skipped - no active session');
        // Only setup basic error tracking for unauthenticated users
        this.initializeErrorTracking();
        return false;
      }
      
      // Start monitoring only for authenticated users
      this.startMonitoring();
      
      // Setup global debug tools
      (window as any).__healthCheck = () => this.generateHealthReport();
      (window as any).__monitoringStatus = () => ({
        isCircuitOpen: this.isCircuitOpen,
        failedChecks: this.failedChecks,
        lastSuccessfulCheck: new Date(this.lastSuccessfulCheck).toISOString()
      });
      
      productionLogger.log('Production monitoring initialized successfully');
      return true;
    } catch (error) {
      productionLogger.error('Monitoring initialization failed', error);
      return false;
    }
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
  // Use the new smart initialization
  productionMonitor.initialize();
  
  return () => {
    productionMonitor.stopMonitoring();
  };
};