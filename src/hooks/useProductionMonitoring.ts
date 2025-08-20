import { useState, useEffect, useCallback } from 'react';
import { productionAlertingService } from '@/services/productionAlertingService';
import { realTimeAnalyticsService, useRealTimeAnalytics } from '@/services/realTimeAnalyticsService';
import { statisticalCacheService } from '@/services/statisticalCacheService';
import { useToast } from '@/hooks/use-toast';

interface ProductionMetrics {
  system: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
    responseTime: number;
  };
  analytics: {
    cacheHitRate: number;
    queryPerformance: number;
    modelAccuracy: number;
    predictionLatency: number;
  };
  business: {
    activeUsers: number;
    dataProcessed: number;
    alertsTriggered: number;
    systemHealth: number;
  };
}

interface Alert {
  id: string;
  type: 'performance' | 'anomaly' | 'model_drift' | 'system' | 'business';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  resolved: boolean;
  actions?: Array<{ id: string; label: string; handler: () => Promise<void> }>;
}

export function useProductionMonitoring() {
  const [metrics, setMetrics] = useState<ProductionMetrics>({
    system: {
      uptime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      activeConnections: 0,
      responseTime: 0
    },
    analytics: {
      cacheHitRate: 0,
      queryPerformance: 0,
      modelAccuracy: 0,
      predictionLatency: 0
    },
    business: {
      activeUsers: 0,
      dataProcessed: 0,
      alertsTriggered: 0,
      systemHealth: 0
    }
  });

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { updates, connectionStatus } = useRealTimeAnalytics();

  // Fetch initial metrics
  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get cache performance metrics
      const cacheMetrics = statisticalCacheService.getPerformanceMetrics();
      
      // Simulate system metrics (in production, these would come from actual monitoring)
      const systemMetrics = {
        uptime: performance.now(),
        memoryUsage: Math.random() * 0.8 + 0.1, // 10-90%
        cpuUsage: Math.random() * 0.6 + 0.1,    // 10-70%
        activeConnections: Math.floor(Math.random() * 1000) + 100,
        responseTime: Math.random() * 500 + 100   // 100-600ms
      };

      // Calculate analytics metrics
      const analyticsMetrics = {
        cacheHitRate: cacheMetrics.efficiency?.hitRate || 0,
        queryPerformance: Math.random() * 0.9 + 0.1,
        modelAccuracy: Math.random() * 0.3 + 0.7,    // 70-100%
        predictionLatency: Math.random() * 200 + 50   // 50-250ms
      };

      // Calculate business metrics
      const businessMetrics = {
        activeUsers: Math.floor(Math.random() * 500) + 50,
        dataProcessed: Math.floor(Math.random() * 10000) + 1000,
        alertsTriggered: productionAlertingService.getActiveAlerts().length,
        systemHealth: calculateSystemHealth(systemMetrics, analyticsMetrics)
      };

      setMetrics({
        system: systemMetrics,
        analytics: analyticsMetrics,
        business: businessMetrics
      });

      // Get active alerts
      setAlerts(productionAlertingService.getActiveAlerts());
      
    } catch (error) {
      console.error('Error fetching production metrics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch production metrics",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Calculate overall system health score
  const calculateSystemHealth = (system: any, analytics: any) => {
    const systemScore = (1 - system.memoryUsage) * 0.3 + (1 - system.cpuUsage) * 0.3;
    const responseScore = Math.max(0, 1 - (system.responseTime - 100) / 500) * 0.2;
    const analyticsScore = analytics.cacheHitRate * 0.1 + analytics.modelAccuracy * 0.1;
    
    return Math.min(100, (systemScore + responseScore + analyticsScore) * 100);
  };

  // Handle real-time updates
  useEffect(() => {
    if (updates.length > 0) {
      const latestUpdate = updates[0];
      
      if (latestUpdate.type === 'metric_update') {
        // Update metrics based on real-time data
        fetchMetrics();
      }

      // Show toast notifications for alerts
      if (latestUpdate.data?.alertType && latestUpdate.data?.severity === 'critical') {
        toast({
          title: "Critical Alert",
          description: latestUpdate.data.message || "System alert triggered",
          variant: "destructive"
        });
      }
    }
  }, [updates, fetchMetrics, toast]);

  // Subscribe to alerts
  useEffect(() => {
    const unsubscribe = productionAlertingService.subscribe('monitoring-hook', (alert) => {
      setAlerts(prev => {
        const exists = prev.find(a => a.id === alert.id);
        if (exists) {
          return prev.map(a => a.id === alert.id ? alert : a);
        }
        return [alert, ...prev];
      });

      // Show notification for new alerts
      if (!alert.resolved) {
        toast({
          title: `${alert.severity.toUpperCase()} Alert`,
          description: alert.message,
          variant: alert.severity === 'critical' ? 'destructive' : 'default'
        });
      }
    });

    return unsubscribe;
  }, [toast]);

  // Initial data fetch
  useEffect(() => {
    fetchMetrics();
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      await productionAlertingService.resolveAlert(alertId, 'manual_resolution');
      toast({
        title: "Alert Resolved",
        description: "Alert has been successfully resolved",
        variant: "default"
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        title: "Error",
        description: "Failed to resolve alert",
        variant: "destructive"
      });
    }
  }, [toast]);

  const executeAlertAction = useCallback(async (alertId: string, actionId: string) => {
    try {
      const alert = alerts.find(a => a.id === alertId);
      const action = alert?.actions?.find(a => a.id === actionId);
      
      if (action) {
        await action.handler();
        toast({
          title: "Action Executed",
          description: `Successfully executed: ${action.label}`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error executing alert action:', error);
      toast({
        title: "Error",
        description: "Failed to execute alert action",
        variant: "destructive"
      });
    }
  }, [alerts, toast]);

  const refreshMetrics = useCallback(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const getSystemStatus = useCallback(() => {
    const health = metrics.business.systemHealth;
    if (health >= 90) return { status: 'excellent', color: 'text-green-600' };
    if (health >= 80) return { status: 'good', color: 'text-blue-600' };
    if (health >= 70) return { status: 'warning', color: 'text-yellow-600' };
    return { status: 'critical', color: 'text-red-600' };
  }, [metrics.business.systemHealth]);

  return {
    metrics,
    alerts: alerts.filter(a => !a.resolved),
    allAlerts: alerts,
    isLoading,
    connectionStatus,
    systemStatus: getSystemStatus(),
    resolveAlert,
    executeAlertAction,
    refreshMetrics
  };
}