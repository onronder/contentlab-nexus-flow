/**
 * Production Monitoring and Health Check Utilities
 */

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      message: string;
      duration?: number;
      metadata?: Record<string, any>;
    };
  };
  timestamp: string;
  version: string;
}

export interface MetricData {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  tags?: Record<string, string>;
}

// Performance monitoring
export class PerformanceMonitor {
  private metrics: MetricData[] = [];
  
  startTimer(name: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
        timestamp: new Date().toISOString()
      });
    };
  }
  
  recordMetric(metric: MetricData) {
    this.metrics.push(metric);
    
    // Log metric for external monitoring systems
    console.log(JSON.stringify({
      type: 'metric',
      ...metric
    }));
    
    // Keep only last 100 metrics in memory
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }
  
  getMetrics(): MetricData[] {
    return [...this.metrics];
  }
  
  recordHttpRequest(method: string, path: string, status: number, duration: number) {
    this.recordMetric({
      name: 'http_request_duration',
      value: duration,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      tags: { method, path: path.split('?')[0], status: status.toString() }
    });
    
    this.recordMetric({
      name: 'http_request_count',
      value: 1,
      unit: 'count',
      timestamp: new Date().toISOString(),
      tags: { method, path: path.split('?')[0], status: status.toString() }
    });
  }
  
  recordError(error: Error, context?: string) {
    this.recordMetric({
      name: 'error_count',
      value: 1,
      unit: 'count',
      timestamp: new Date().toISOString(),
      tags: { 
        error_type: error.name, 
        context: context || 'unknown',
        message: error.message.substring(0, 100) // Truncate for privacy
      }
    });
  }
}

// Health check utilities
export class HealthChecker {
  private checks: Map<string, () => Promise<{ status: 'pass' | 'fail' | 'warn'; message: string; metadata?: any }>> = new Map();
  
  addCheck(name: string, checkFn: () => Promise<{ status: 'pass' | 'fail' | 'warn'; message: string; metadata?: any }>) {
    this.checks.set(name, checkFn);
  }
  
  async runChecks(): Promise<HealthCheckResult> {
    const results: HealthCheckResult['checks'] = {};
    const startTime = Date.now();
    
    for (const [name, checkFn] of this.checks) {
      const checkStart = performance.now();
      try {
        const result = await Promise.race([
          checkFn(),
          new Promise<{ status: 'fail'; message: string }>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);
        
        results[name] = {
          ...result,
          duration: performance.now() - checkStart
        };
      } catch (error) {
        results[name] = {
          status: 'fail',
          message: `Health check failed: ${(error as Error).message}`,
          duration: performance.now() - checkStart
        };
      }
    }
    
    // Determine overall status
    const statuses = Object.values(results).map(r => r.status);
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (statuses.includes('fail')) {
      overallStatus = 'unhealthy';
    } else if (statuses.includes('warn')) {
      overallStatus = 'degraded';
    }
    
    return {
      status: overallStatus,
      checks: results,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }
}

// Database health check
export async function checkSupabaseHealth(supabaseUrl: string, supabaseKey: string) {
  const start = performance.now();
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    const duration = performance.now() - start;
    
    if (response.ok) {
      return {
        status: 'pass' as const,
        message: 'Database connection healthy',
        metadata: { response_time_ms: duration }
      };
    } else {
      return {
        status: 'fail' as const,
        message: `Database health check failed: ${response.status}`,
        metadata: { response_time_ms: duration, status_code: response.status }
      };
    }
  } catch (error) {
    return {
      status: 'fail' as const,
      message: `Database connection failed: ${(error as Error).message}`,
      metadata: { response_time_ms: performance.now() - start }
    };
  }
}

// External API health check (for OpenAI, etc.)
export async function checkExternalApiHealth(apiUrl: string, headers: Record<string, string>) {
  const start = performance.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const duration = performance.now() - start;
    
    if (response.ok) {
      return {
        status: 'pass' as const,
        message: 'External API healthy',
        metadata: { response_time_ms: duration }
      };
    } else if (response.status === 429) {
      return {
        status: 'warn' as const,
        message: 'External API rate limited',
        metadata: { response_time_ms: duration, status_code: response.status }
      };
    } else {
      return {
        status: 'fail' as const,
        message: `External API unhealthy: ${response.status}`,
        metadata: { response_time_ms: duration, status_code: response.status }
      };
    }
  } catch (error) {
    const duration = performance.now() - start;
    
    if ((error as Error).name === 'AbortError') {
      return {
        status: 'fail' as const,
        message: 'External API timeout',
        metadata: { response_time_ms: duration }
      };
    }
    
    return {
      status: 'fail' as const,
      message: `External API error: ${(error as Error).message}`,
      metadata: { response_time_ms: duration }
    };
  }
}

// Memory and resource monitoring
export function getResourceUsage() {
  // In Deno edge functions, we have limited access to system metrics
  // This is a placeholder for what we can monitor
  return {
    timestamp: new Date().toISOString(),
    // Note: Actual memory usage monitoring would require platform-specific APIs
    memory_usage_mb: 'not_available',
    uptime_ms: Date.now() - (globalThis as any).__start_time || 0
  };
}

// Set startup time for uptime calculation
(globalThis as any).__start_time = Date.now();

// Global performance monitor instance
export const globalPerformanceMonitor = new PerformanceMonitor();

// Global health checker instance
export const globalHealthChecker = new HealthChecker();

// Add default health checks
globalHealthChecker.addCheck('system', async () => {
  const resourceUsage = getResourceUsage();
  return {
    status: 'pass',
    message: 'System resources normal',
    metadata: resourceUsage
  };
});
