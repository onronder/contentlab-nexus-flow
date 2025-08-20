import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';

interface PerformanceMetric {
  id: string;
  metric_type: string;
  metric_name: string;
  metric_value: number;
  metric_unit?: string;
  context?: any;
  tags?: any;
  session_id?: string;
  correlation_id?: string;
  user_id?: string;
  team_id?: string;
  project_id?: string;
  timestamp: string;
  metadata?: any;
}

interface SystemHealthMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_unit?: string;
  service_name: string;
  environment: string;
  status: string;
  threshold_value?: number;
  severity: string;
  message?: string;
  tags?: any;
  timestamp: string;
  resolved_at?: string;
  metadata?: any;
}

interface ErrorLog {
  id: string;
  error_type: string;
  error_message: string;
  error_stack?: string;
  user_id?: string;
  team_id?: string;
  project_id?: string;
  session_id?: string;
  url?: string;
  user_agent?: string;
  severity: string;
  tags?: string[];
  context?: any;
  metadata?: any;
}

interface AnalyticsData {
  id: string;
  data_type: string;
  aggregation_period: string;
  period_start: string;
  period_end: string;
  user_id?: string;
  team_id?: string;
  project_id?: string;
  metrics: any;
  dimensions?: any;
  calculated_fields?: any;
  data_quality_score: number;
  created_at: string;
  updated_at: string;
}

class ProductionPerformanceService {
  private static instance: ProductionPerformanceService;
  private metricsBuffer: PerformanceMetric[] = [];
  private isCollecting = false;
  private bufferFlushInterval?: NodeJS.Timeout;

  private constructor() {
    this.startPerformanceCollection();
  }

  static getInstance(): ProductionPerformanceService {
    if (!ProductionPerformanceService.instance) {
      ProductionPerformanceService.instance = new ProductionPerformanceService();
    }
    return ProductionPerformanceService.instance;
  }

  private startPerformanceCollection() {
    if (this.isCollecting) return;
    this.isCollecting = true;

    // Collect Core Web Vitals
    this.collectWebVitals();
    
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Flush metrics buffer every 10 seconds
    this.bufferFlushInterval = setInterval(() => {
      this.flushMetricsBuffer();
    }, 10000);
  }

  private collectWebVitals() {
    if (typeof window === 'undefined') return;

    // LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric({
          metric_type: 'vitals',
          metric_name: 'lcp',
          metric_value: lastEntry.startTime,
          metric_unit: 'ms',
          tags: { vital_type: 'loading' }
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // FID (First Input Delay)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.recordMetric({
            metric_type: 'vitals',
            metric_name: 'fid',
            metric_value: entry.processingStart - entry.startTime,
            metric_unit: 'ms',
            tags: { vital_type: 'interactivity' }
          });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // CLS (Cumulative Layout Shift)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.recordMetric({
          metric_type: 'vitals',
          metric_name: 'cls',
          metric_value: clsValue,
          metric_unit: 'score',
          tags: { vital_type: 'visual_stability' }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }

  private collectSystemMetrics() {
    if (typeof window === 'undefined') return;

    // Memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      this.recordMetric({
        metric_type: 'system',
        metric_name: 'memory_usage',
        metric_value: memoryUsage,
        metric_unit: '%',
        context: {
          used_heap: memory.usedJSHeapSize,
          total_heap: memory.totalJSHeapSize,
          heap_limit: memory.jsHeapSizeLimit
        }
      });
    }

    // Navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.recordMetric({
        metric_type: 'vitals',
        metric_name: 'ttfb',
        metric_value: navigation.responseStart - navigation.requestStart,
        metric_unit: 'ms',
        tags: { vital_type: 'loading' }
      });

      this.recordMetric({
        metric_type: 'vitals',
        metric_name: 'dom_content_loaded',
        metric_value: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        metric_unit: 'ms',
        tags: { vital_type: 'loading' }
      });
    }

    // Connection info
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.recordMetric({
          metric_type: 'system',
          metric_name: 'network_downlink',
          metric_value: connection.downlink,
          metric_unit: 'mbps',
          context: {
            effective_type: connection.effectiveType,
            rtt: connection.rtt
          }
        });
      }
    }
  }

  private recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>) {
    const fullMetric: PerformanceMetric = {
      ...metric,
      id: `${metric.metric_type}-${metric.metric_name}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      session_id: this.getSessionId(),
      user_id: this.getUserId()
    };

    this.metricsBuffer.push(fullMetric);

    // Flush immediately if buffer is getting large
    if (this.metricsBuffer.length >= 50) {
      this.flushMetricsBuffer();
    }
  }

  private async flushMetricsBuffer() {
    if (this.metricsBuffer.length === 0) return;

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // Use the performance-collector edge function instead of direct DB insert
      const { data, error } = await supabase.functions.invoke('performance-collector', {
        body: metricsToFlush.map(metric => ({
          metric_type: metric.metric_type,
          metric_name: metric.metric_name,
          metric_value: metric.metric_value,
          metric_unit: metric.metric_unit,
          context: metric.context,
          tags: metric.tags,
          session_id: metric.session_id,
          correlation_id: metric.correlation_id,
          user_id: metric.user_id,
          team_id: metric.team_id,
          project_id: metric.project_id
        }))
      });

      if (error) {
        console.error('Failed to flush performance metrics:', error);
        // Put metrics back in buffer for retry
        this.metricsBuffer.unshift(...metricsToFlush);
      }
    } catch (error) {
      console.error('Error flushing performance metrics:', error);
      // Put metrics back in buffer for retry
      this.metricsBuffer.unshift(...metricsToFlush);
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('performance_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('performance_session_id', sessionId);
    }
    return sessionId;
  }

  private getUserId(): string | undefined {
    // This would be called from a component context
    return undefined; // Will be set by the calling component
  }

  async recordDatabaseMetric(operation: string, duration: number, metadata?: Record<string, any>) {
    this.recordMetric({
      metric_type: 'database',
      metric_name: `query_${operation}`,
      metric_value: duration,
      metric_unit: 'ms',
      metadata
    });
  }

  async recordUserAction(action: string, duration?: number, metadata?: Record<string, any>) {
    this.recordMetric({
      metric_type: 'user',
      metric_name: action,
      metric_value: duration || 1,
      metric_unit: duration ? 'ms' : 'count',
      metadata
    });
  }

  async logError(error: Error, context?: Record<string, any>) {
    try {
      const errorLog = {
        error_type: error.name || 'Error',
        error_message: error.message,
        error_stack: error.stack,
        url: window.location.href,
        user_agent: navigator.userAgent,
        severity: 'error',
        tags: [] as string[],
        context: context || {},
        session_id: this.getSessionId()
      };

      // Insert directly via Supabase since this is critical
      const { error: dbError } = await supabase
        .from('error_logs')
        .insert([errorLog]);

      if (dbError) {
        console.error('Failed to log error to database:', dbError);
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  async getSystemHealthMetrics(hours = 1): Promise<SystemHealthMetric[]> {
    try {
      // Return mock data since tables don't exist in types yet
      return [
        {
          id: '1',
          metric_name: 'cpu_usage',
          metric_value: 45.2,
          metric_unit: '%',
          service_name: 'api-service',
          environment: 'production',
          status: 'healthy',
          severity: 'info',
          tags: {},
          timestamp: new Date().toISOString(),
          metadata: {}
        }
      ];
    } catch (error) {
      console.error('Failed to get system health metrics:', error);
      return [];
    }
  }

  async getPerformanceMetrics(filters: {
    metricType?: string;
    hours?: number;
    limit?: number;
  } = {}): Promise<PerformanceMetric[]> {
    try {
      // Return mock data since tables don't exist in types yet
      return [
        {
          id: '1',
          metric_type: 'vitals',
          metric_name: 'lcp',
          metric_value: 2341,
          metric_unit: 'ms',
          timestamp: new Date().toISOString(),
          tags: {},
          metadata: {}
        }
      ];
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return [];
    }
  }

  async getErrorLogs(filters: {
    resolved?: boolean;
    severity?: string;
    hours?: number;
    limit?: number;
  } = {}): Promise<ErrorLog[]> {
    try {
      // Return mock data since tables don't exist in types yet
      return [
        {
          id: '1',
          error_type: 'TypeError',
          error_message: 'Cannot read property of undefined',
          error_stack: 'at example.js:10:5',
          severity: 'error',
          tags: ['frontend', 'ui'],
          context: {},
          metadata: {}
        }
      ];
    } catch (error) {
      console.error('Failed to get error logs:', error);
      return [];
    }
  }

  async getAnalyticsData(filters: {
    dataType?: string;
    aggregationPeriod?: string;
    teamId?: string;
    hours?: number;
  } = {}): Promise<AnalyticsData[]> {
    try {
      // Return mock data since tables don't exist in types yet
      return [
        {
          id: '1',
          data_type: 'user_behavior',
          aggregation_period: 'hourly',
          period_start: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          period_end: new Date().toISOString(),
          metrics: { page_views: 1250, unique_visitors: 890 },
          dimensions: {},
          calculated_fields: {},
          data_quality_score: 98.5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    } catch (error) {
      console.error('Failed to get analytics data:', error);
      return [];
    }
  }

  destroy() {
    this.isCollecting = false;
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
    }
    // Flush any remaining metrics
    this.flushMetricsBuffer();
  }
}

export const productionPerformanceService = ProductionPerformanceService.getInstance();
export type { PerformanceMetric, SystemHealthMetric, ErrorLog, AnalyticsData };