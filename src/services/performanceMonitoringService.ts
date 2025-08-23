import { supabase } from '@/integrations/supabase/client';

// Phase 6: Comprehensive Performance Monitoring Service
export class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private performanceObserver: PerformanceObserver | null = null;
  private metrics: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  constructor() {
    this.initializeObserver();
    this.measureCoreWebVitals();
  }

  // Initialize Performance Observer
  private initializeObserver(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.processPerformanceEntry(entry);
        });
      });

      // Observe different types of performance entries
      this.performanceObserver.observe({ 
        entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'layout-shift', 'long-task'] 
      });
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  }

  // Process performance entries
  private processPerformanceEntry(entry: PerformanceEntry): void {
    const metricName = `${entry.entryType}_${entry.name}`.replace(/[^a-zA-Z0-9_]/g, '_');
    
    let value: number;
    switch (entry.entryType) {
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        value = navEntry.loadEventEnd - navEntry.fetchStart;
        break;
      case 'paint':
      case 'largest-contentful-paint':
        value = entry.startTime;
        break;
      case 'layout-shift':
        value = (entry as any).value || 0;
        break;
      case 'long-task':
        value = entry.duration;
        break;
      default:
        value = entry.duration || entry.startTime || 0;
    }

    this.addMetric(metricName, value);
  }

  // Measure Core Web Vitals
  private measureCoreWebVitals(): void {
    if (typeof window === 'undefined') return;

    // First Contentful Paint (FCP)
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.addMetric('core_web_vitals_fcp', entry.startTime);
          }
        });
      });
      observer.observe({ entryTypes: ['paint'] });
    } catch {}

    // Largest Contentful Paint (LCP)
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.addMetric('core_web_vitals_lcp', entry.startTime);
        });
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch {}

    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.addMetric('core_web_vitals_cls', clsValue);
          }
        });
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch {}

    // First Input Delay (FID) - approximation using long tasks
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.addMetric('core_web_vitals_fid_estimate', entry.duration);
        });
      });
      observer.observe({ entryTypes: ['long-task'] });
    } catch {}
  }

  // Manual performance marking
  markStart(label: string): void {
    const timestamp = performance.now();
    this.startTimes.set(label, timestamp);
    
    if (typeof performance.mark === 'function') {
      performance.mark(`${label}_start`);
    }
  }

  markEnd(label: string): number {
    const endTime = performance.now();
    const startTime = this.startTimes.get(label);
    
    if (startTime) {
      const duration = endTime - startTime;
      this.addMetric(label, duration);
      this.startTimes.delete(label);
      
      if (typeof performance.mark === 'function' && typeof performance.measure === 'function') {
        performance.mark(`${label}_end`);
        performance.measure(label, `${label}_start`, `${label}_end`);
      }
      
      return duration;
    }
    
    return 0;
  }

  // Add metric to collection
  private addMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 measurements per metric
    if (values.length > 100) {
      values.shift();
    }
  }

  // Get performance statistics
  getMetricStats(name: string) {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      latest: values[values.length - 1]
    };
  }

  // Get all metrics
  getAllMetrics() {
    const result: Record<string, any> = {};
    
    for (const [name] of this.metrics) {
      result[name] = this.getMetricStats(name);
    }
    
    return result;
  }

  // Get Core Web Vitals summary
  getCoreWebVitals() {
    return {
      fcp: this.getMetricStats('core_web_vitals_fcp'),
      lcp: this.getMetricStats('core_web_vitals_lcp'),
      cls: this.getMetricStats('core_web_vitals_cls'),
      fid: this.getMetricStats('core_web_vitals_fid_estimate')
    };
  }

  // Performance budget check
  checkPerformanceBudget(budgets: Record<string, number>) {
    const violations: Array<{ metric: string; actual: number; budget: number; severity: 'warning' | 'critical' }> = [];
    
    Object.entries(budgets).forEach(([metric, budget]) => {
      const stats = this.getMetricStats(metric);
      if (stats) {
        const actual = stats.p95; // Use 95th percentile
        if (actual > budget) {
          violations.push({
            metric,
            actual,
            budget,
            severity: actual > budget * 1.5 ? 'critical' : 'warning'
          });
        }
      }
    });
    
    return violations;
  }

  // Send metrics to database
  async sendMetricsToDatabase(userId?: string, teamId?: string) {
    try {
      const metrics = this.getAllMetrics();
      const coreWebVitals = this.getCoreWebVitals();
      
      const { error } = await supabase.from('performance_metrics').insert({
        team_id: teamId,
        metric_type: 'web_vitals_summary',
        metric_name: 'performance_summary',
        metric_value: 0,
        context: {
          core_web_vitals: coreWebVitals,
          all_metrics: metrics,
          timestamp: Date.now(),
          url: typeof window !== 'undefined' ? window.location.href : ''
        },
        timestamp: new Date().toISOString()
      });

      if (error) {
        console.error('Failed to send metrics to database:', error);
      }
    } catch (error) {
      console.error('Error sending metrics:', error);
    }
  }

  // Measure component render time
  measureComponent(componentName: string, renderFn: () => void): void {
    this.markStart(`component_${componentName}`);
    renderFn();
    this.markEnd(`component_${componentName}`);
  }

  // Measure API call performance
  measureApiCall<T>(label: string, apiCall: () => Promise<T>): Promise<T> {
    this.markStart(`api_${label}`);
    
    return apiCall()
      .then(result => {
        this.markEnd(`api_${label}`);
        return result;
      })
      .catch(error => {
        this.markEnd(`api_${label}_error`);
        throw error;
      });
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }

  // Cleanup
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    this.clearMetrics();
  }
}

export const performanceMonitoringService = PerformanceMonitoringService.getInstance();
