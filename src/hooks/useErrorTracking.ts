/**
 * React hook for error tracking and alerting
 */
import { useEffect, useState, useCallback } from 'react';
import { errorTrackingService, ErrorAlert, ErrorTrend } from '@/services/errorTrackingService';
import { useToast } from '@/hooks/use-toast';

export interface ErrorTrackingState {
  alerts: ErrorAlert[];
  trends: ErrorTrend[];
  statistics: {
    total: number;
    active: number;
    critical: number;
    last24h: number;
    averageResolutionTime: number;
    topErrorTypes: Array<{ type: string; count: number }>;
    impactedUsers: number;
  };
  isLoading: boolean;
}

export function useErrorTracking(
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
) {
  const [state, setState] = useState<ErrorTrackingState>({
    alerts: [],
    trends: [],
    statistics: {
      total: 0,
      active: 0,
      critical: 0,
      last24h: 0,
      averageResolutionTime: 0,
      topErrorTypes: [],
      impactedUsers: 0
    },
    isLoading: true
  });
  
  const { toast } = useToast();

  const refreshData = useCallback(() => {
    try {
      const alerts = errorTrackingService.getActiveAlerts();
      const trends = errorTrackingService.getErrorTrends();
      const statistics = errorTrackingService.getAlertStatistics();
      
      setState({
        alerts,
        trends,
        statistics,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to refresh error tracking data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const trackError = useCallback((error: Error | string, context?: any) => {
    try {
      const alert = errorTrackingService.trackError(error, context);
      
      // Show toast for critical errors
      if (alert?.severity === 'critical') {
        toast({
          title: "Critical Error Detected",
          description: alert.message,
          variant: "destructive"
        });
      }
      
      // Refresh data to show new alert
      setTimeout(refreshData, 100);
      
      return alert;
    } catch (err) {
      console.error('Failed to track error:', err);
    }
  }, [refreshData, toast]);

  const acknowledgeAlert = useCallback((alertId: string, userId: string) => {
    const success = errorTrackingService.acknowledgeAlert(alertId, userId);
    if (success) {
      refreshData();
      toast({
        title: "Alert Acknowledged",
        description: "Alert has been marked as acknowledged"
      });
    }
    return success;
  }, [refreshData, toast]);

  const resolveAlert = useCallback((alertId: string, userId: string) => {
    const success = errorTrackingService.resolveAlert(alertId, userId);
    if (success) {
      refreshData();
      toast({
        title: "Alert Resolved",
        description: "Alert has been marked as resolved"
      });
    }
    return success;
  }, [refreshData, toast]);

  const getFilteredAlerts = useCallback((filters?: {
    severity?: string;
    status?: string;
    timeRange?: number;
  }) => {
    return errorTrackingService.getActiveAlerts(filters);
  }, []);

  useEffect(() => {
    refreshData();
    
    if (autoRefresh) {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshData, autoRefresh, refreshInterval]);

  return {
    ...state,
    refreshData,
    trackError,
    acknowledgeAlert,
    resolveAlert,
    getFilteredAlerts
  };
}

// Hook for tracking errors in components
export function useErrorBoundary() {
  const { trackError } = useErrorTracking(false);
  
  const captureError = useCallback((error: Error, errorInfo?: any) => {
    trackError(error, {
      component: 'error-boundary',
      action: 'component-error',
      metadata: errorInfo
    });
  }, [trackError]);

  return { captureError };
}

// Hook for tracking API errors
export function useApiErrorTracking() {
  const { trackError } = useErrorTracking(false);
  
  const trackApiError = useCallback((error: Error | string, endpoint: string, metadata?: any) => {
    trackError(error, {
      component: 'api',
      action: endpoint,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  }, [trackError]);

  return { trackApiError };
}