import { useState, useEffect, useMemo } from 'react';
import { 
  performanceMonitoringService, 
  CoreWebVitals, 
  DatabaseMetrics, 
  SystemMetrics, 
  PerformanceAlert 
} from '@/services/performanceMonitoringService';

export function usePerformanceMonitoring(refreshInterval = 5000) {
  const [webVitals, setWebVitals] = useState<CoreWebVitals>({
    lcp: 0, fid: 0, cls: 0, fcp: 0, ttfb: 0
  });
  const [databaseMetrics, setDatabaseMetrics] = useState<DatabaseMetrics>({
    queryCount: 0, avgQueryTime: 0, slowQueries: 0, connectionPoolUsage: 0, cacheHitRatio: 0
  });
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    memoryUsage: 0, cpuUsage: 0, networkLatency: 0, edgeFunctionExecutionTime: 0, activeConnections: 0
  });
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);

  useEffect(() => {
    const updateMetrics = async () => {
      try {
        setWebVitals(performanceMonitoringService.getCoreWebVitals());
        
        const dbMetrics = await performanceMonitoringService.getDatabaseMetrics();
        setDatabaseMetrics(dbMetrics);
        
        const sysMetrics = await performanceMonitoringService.getSystemMetrics();
        setSystemMetrics(sysMetrics);
        
        setAlerts(performanceMonitoringService.getAlerts());
      } catch (error) {
        console.error('Error updating performance metrics:', error);
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const trends = useMemo(() => 
    performanceMonitoringService.getPerformanceTrends(24), 
    [webVitals, databaseMetrics, systemMetrics]
  );

  const performanceScore = useMemo(() => {
    // Calculate overall performance score based on Core Web Vitals
    let score = 100;
    
    // LCP scoring (0-4s scale)
    if (webVitals.lcp > 4000) score -= 30;
    else if (webVitals.lcp > 2500) score -= 15;
    
    // FID scoring (0-300ms scale)
    if (webVitals.fid > 300) score -= 25;
    else if (webVitals.fid > 100) score -= 10;
    
    // CLS scoring (0-0.25 scale)
    if (webVitals.cls > 0.25) score -= 25;
    else if (webVitals.cls > 0.1) score -= 10;
    
    // System metrics impact
    if (systemMetrics.memoryUsage > 80) score -= 10;
    if (systemMetrics.cpuUsage > 70) score -= 10;
    
    return Math.max(0, Math.round(score));
  }, [webVitals, systemMetrics]);

  const resolveAlert = (alertId: string) => {
    performanceMonitoringService.resolveAlert(alertId);
    setAlerts(performanceMonitoringService.getAlerts());
  };

  return {
    webVitals,
    databaseMetrics,
    systemMetrics,
    alerts,
    trends,
    performanceScore,
    resolveAlert,
  };
}