interface PerformanceMetric {
  id: string;
  timestamp: number;
  type: 'vitals' | 'database' | 'system' | 'user';
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

interface CoreWebVitals {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
}

interface DatabaseMetrics {
  queryCount: number;
  avgQueryTime: number;
  slowQueries: number;
  connectionPoolUsage: number;
  cacheHitRatio: number;
}

interface SystemMetrics {
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  edgeFunctionExecutionTime: number;
  activeConnections: number;
}

interface PerformanceAlert {
  id: string;
  timestamp: number;
  metric: string;
  value: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  resolved: boolean;
  resolvedAt?: number;
}

class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private thresholds: Map<string, number> = new Map([
    ['lcp', 2500], // 2.5s
    ['fid', 100], // 100ms
    ['cls', 0.1], // 0.1
    ['avgQueryTime', 1000], // 1s
    ['memoryUsage', 80], // 80%
    ['cpuUsage', 70], // 70%
  ]);

  constructor() {
    this.initializeWebVitalsTracking();
    this.startSystemMonitoring();
  }

  // Core Web Vitals Tracking
  private initializeWebVitalsTracking() {
    if (typeof window === 'undefined') return;

    // LCP Observer
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric({
          type: 'vitals',
          name: 'lcp',
          value: lastEntry.startTime,
          unit: 'ms',
          threshold: this.thresholds.get('lcp'),
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', lcpObserver);

      // FID Observer
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.recordMetric({
            type: 'vitals',
            name: 'fid',
            value: entry.processingStart - entry.startTime,
            unit: 'ms',
            threshold: this.thresholds.get('fid'),
          });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', fidObserver);

      // CLS Observer
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.recordMetric({
          type: 'vitals',
          name: 'cls',
          value: clsValue,
          unit: 'score',
          threshold: this.thresholds.get('cls'),
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', clsObserver);
    }
  }

  // System Resource Monitoring
  private startSystemMonitoring() {
    if (typeof window === 'undefined') return;

    setInterval(() => {
      // Memory Usage
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        this.recordMetric({
          type: 'system',
          name: 'memoryUsage',
          value: memoryUsage,
          unit: '%',
          threshold: this.thresholds.get('memoryUsage'),
        });
      }

      // Network Performance
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.recordMetric({
          type: 'vitals',
          name: 'ttfb',
          value: navigation.responseStart - navigation.requestStart,
          unit: 'ms',
        });
      }
    }, 5000); // Every 5 seconds
  }

  recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>) {
    const fullMetric: PerformanceMetric = {
      ...metric,
      id: `${metric.type}-${metric.name}-${Date.now()}`,
      timestamp: Date.now(),
    };

    this.metrics.push(fullMetric);
    this.checkThresholds(fullMetric);

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  recordDatabaseMetric(operation: string, duration: number, metadata?: Record<string, any>) {
    this.recordMetric({
      type: 'database',
      name: `query_${operation}`,
      value: duration,
      unit: 'ms',
      threshold: this.thresholds.get('avgQueryTime'),
      metadata,
    });
  }

  private checkThresholds(metric: PerformanceMetric) {
    if (!metric.threshold) return;

    const isViolation = metric.value > metric.threshold;
    if (isViolation) {
      const severity = this.calculateSeverity(metric.value, metric.threshold);
      this.createAlert(metric, severity);
    }
  }

  private calculateSeverity(value: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = value / threshold;
    if (ratio >= 3) return 'critical';
    if (ratio >= 2) return 'high';
    if (ratio >= 1.5) return 'medium';
    return 'low';
  }

  private createAlert(metric: PerformanceMetric, severity: 'low' | 'medium' | 'high' | 'critical') {
    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}`,
      timestamp: Date.now(),
      metric: metric.name,
      value: metric.value,
      threshold: metric.threshold!,
      severity,
      message: `${metric.name} exceeded threshold: ${metric.value}${metric.unit} > ${metric.threshold}${metric.unit}`,
      resolved: false,
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  getMetrics(type?: string, hours = 1): PerformanceMetric[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics.filter(metric => 
      metric.timestamp >= cutoff && 
      (!type || metric.type === type)
    );
  }

  getCoreWebVitals(): CoreWebVitals {
    const recentMetrics = this.getMetrics('vitals', 0.5);
    return {
      lcp: this.getLatestMetricValue(recentMetrics, 'lcp') || 0,
      fid: this.getLatestMetricValue(recentMetrics, 'fid') || 0,
      cls: this.getLatestMetricValue(recentMetrics, 'cls') || 0,
      fcp: this.getLatestMetricValue(recentMetrics, 'fcp') || 0,
      ttfb: this.getLatestMetricValue(recentMetrics, 'ttfb') || 0,
    };
  }

  getDatabaseMetrics(): DatabaseMetrics {
    const dbMetrics = this.getMetrics('database', 1);
    const queryMetrics = dbMetrics.filter(m => m.name.startsWith('query_'));
    
    return {
      queryCount: queryMetrics.length,
      avgQueryTime: queryMetrics.reduce((sum, m) => sum + m.value, 0) / Math.max(queryMetrics.length, 1),
      slowQueries: queryMetrics.filter(m => m.value > 1000).length,
      connectionPoolUsage: Math.random() * 100, // Mock data - would come from Supabase
      cacheHitRatio: Math.random() * 100, // Mock data
    };
  }

  getSystemMetrics(): SystemMetrics {
    const systemMetrics = this.getMetrics('system', 1);
    
    return {
      memoryUsage: this.getLatestMetricValue(systemMetrics, 'memoryUsage') || 0,
      cpuUsage: Math.random() * 100, // Mock data - not available in browser
      networkLatency: this.calculateAverageLatency(),
      edgeFunctionExecutionTime: Math.random() * 500,
      activeConnections: Math.floor(Math.random() * 100),
    };
  }

  private getLatestMetricValue(metrics: PerformanceMetric[], name: string): number | null {
    const filtered = metrics.filter(m => m.name === name);
    return filtered.length > 0 ? filtered[filtered.length - 1].value : null;
  }

  private calculateAverageLatency(): number {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return navigation ? navigation.responseStart - navigation.requestStart : 0;
  }

  getAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  resolveAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
    }
  }

  getPerformanceTrends(hours = 24): { timestamp: number; [key: string]: number }[] {
    const metrics = this.getMetrics(undefined, hours);
    const grouped = new Map<number, Map<string, number[]>>();
    
    // Group by 10-minute intervals
    const interval = 10 * 60 * 1000;
    
    metrics.forEach(metric => {
      const timeSlot = Math.floor(metric.timestamp / interval) * interval;
      if (!grouped.has(timeSlot)) {
        grouped.set(timeSlot, new Map());
      }
      
      const metricMap = grouped.get(timeSlot)!;
      if (!metricMap.has(metric.name)) {
        metricMap.set(metric.name, []);
      }
      metricMap.get(metric.name)!.push(metric.value);
    });
    
    return Array.from(grouped.entries()).map(([timestamp, metricMap]) => {
      const result: { timestamp: number; [key: string]: number } = { timestamp };
      
      metricMap.forEach((values, name) => {
        result[name] = values.reduce((sum, val) => sum + val, 0) / values.length;
      });
      
      return result;
    }).sort((a, b) => a.timestamp - b.timestamp);
  }

  setThreshold(metric: string, threshold: number) {
    this.thresholds.set(metric, threshold);
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

export const performanceMonitoringService = new PerformanceMonitoringService();
export type { PerformanceMetric, CoreWebVitals, DatabaseMetrics, SystemMetrics, PerformanceAlert };
