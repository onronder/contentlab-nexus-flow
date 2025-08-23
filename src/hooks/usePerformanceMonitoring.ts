import { useState, useEffect, useMemo } from 'react';
import { performanceMonitoringService } from '@/services/performanceMonitoringService';

interface CoreWebVitals {
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
}

interface PerformanceMetrics {
  [key: string]: {
    count: number;
    min: number;
    max: number;
    avg: number;
    median: number;
    p90: number;
    p95: number;
    p99: number;
    latest: number;
  } | null;
}

export function usePerformanceMonitoring(refreshInterval = 5000) {
  const [webVitals, setWebVitals] = useState<CoreWebVitals>({
    lcp: 0, fid: 0, cls: 0, fcp: 0, ttfb: 0
  });
  const [allMetrics, setAllMetrics] = useState<PerformanceMetrics>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const updateMetrics = async () => {
      try {
        setIsLoading(true);
        
        // Get Core Web Vitals
        const vitals = performanceMonitoringService.getCoreWebVitals();
        setWebVitals({
          lcp: vitals.lcp?.latest || 0,
          fid: vitals.fid?.latest || 0, 
          cls: vitals.cls?.latest || 0,
          fcp: vitals.fcp?.latest || 0,
          ttfb: 0 // Will be calculated from navigation metrics
        });
        
        // Get all performance metrics
        const metrics = performanceMonitoringService.getAllMetrics();
        setAllMetrics(metrics);
        
      } catch (error) {
        console.error('Error updating performance metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Calculate performance score based on Core Web Vitals
  const performanceScore = useMemo(() => {
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
    
    return Math.max(0, Math.round(score));
  }, [webVitals]);

  // Get performance budget violations
  const budgetViolations = useMemo(() => {
    const budgets = {
      core_web_vitals_lcp: 2500,
      core_web_vitals_fcp: 1800,
      core_web_vitals_cls: 0.1,
      api_call: 500,
      component_render: 100
    };
    
    return performanceMonitoringService.checkPerformanceBudget(budgets);
  }, [allMetrics]);

  // Performance recommendations
  const recommendations = useMemo(() => {
    const recs: string[] = [];
    
    if (webVitals.lcp > 2500) {
      recs.push('Optimize Largest Contentful Paint by optimizing images and server response times');
    }
    
    if (webVitals.fid > 100) {
      recs.push('Reduce First Input Delay by minimizing JavaScript execution time');
    }
    
    if (webVitals.cls > 0.1) {
      recs.push('Improve Cumulative Layout Shift by setting size attributes on images and videos');
    }
    
    if (budgetViolations.length > 0) {
      recs.push(`${budgetViolations.length} performance budget violations detected`);
    }
    
    return recs;
  }, [webVitals, budgetViolations]);

  // Mark performance milestone
  const markMilestone = (label: string) => {
    performanceMonitoringService.markStart(label);
    return () => performanceMonitoringService.markEnd(label);
  };

  // Measure API call performance  
  const measureApiCall = <T>(label: string, apiCall: () => Promise<T>): Promise<T> => {
    return performanceMonitoringService.measureApiCall(label, apiCall);
  };

  // Send metrics to database
  const sendMetricsToDatabase = async (userId?: string, teamId?: string) => {
    await performanceMonitoringService.sendMetricsToDatabase(userId, teamId);
  };

  // Clear all metrics
  const clearMetrics = () => {
    performanceMonitoringService.clearMetrics();
    setAllMetrics({});
    setWebVitals({ lcp: 0, fid: 0, cls: 0, fcp: 0, ttfb: 0 });
  };

  return {
    webVitals,
    allMetrics,
    performanceScore,
    budgetViolations,
    recommendations,
    isLoading,
    markMilestone,
    measureApiCall,
    sendMetricsToDatabase,
    clearMetrics,
    // Utility methods
    getMetricStats: (name: string) => performanceMonitoringService.getMetricStats(name),
    getAllMetrics: () => performanceMonitoringService.getAllMetrics(),
  };
}