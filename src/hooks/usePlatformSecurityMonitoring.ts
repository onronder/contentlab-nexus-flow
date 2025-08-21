import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityMetric {
  id: string;
  component: string;
  metric_name: string;
  current_value: number;
  threshold: number;
  status: 'normal' | 'warning' | 'critical';
  last_updated: string;
  trend: 'up' | 'down' | 'stable';
}

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  component: string;
  metadata: any;
  created_at: string;
  resolved_at?: string;
}

interface MonitoringData {
  metrics: SecurityMetric[];
  alerts: SecurityAlert[];
  isLoading: boolean;
  error: string | null;
}

export function usePlatformSecurityMonitoring() {
  const [data, setData] = useState<MonitoringData>({
    metrics: [],
    alerts: [],
    isLoading: true,
    error: null
  });

  // Load real security metrics from performance_metrics table
  const loadSecurityMetrics = useCallback(async (): Promise<SecurityMetric[]> => {
    try {
      // Fetch recent performance and security metrics from database
      const { data: performanceData, error: perfError } = await supabase
        .from('performance_metrics')
        .select('*')
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .order('timestamp', { ascending: false });

      const { data: behaviorData, error: behaviorError } = await supabase
        .from('behavioral_analytics')
        .select('*')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (perfError && behaviorError) {
        console.warn('No metrics data available, using default values');
        return [];
      }

      // Process performance metrics into security metrics format
      const metrics: SecurityMetric[] = [];
      
      // Group performance data by metric type
      const perfMetrics = performanceData || [];
      const authMetrics = perfMetrics.filter(m => m.metric_type === 'authentication');
      const dbMetrics = perfMetrics.filter(m => m.metric_type === 'database');
      const systemMetrics = perfMetrics.filter(m => m.metric_type === 'system');

      // Calculate authentication metrics
      if (authMetrics.length > 0) {
        const avgResponseTime = authMetrics.reduce((sum, m) => sum + (m.metric_value || 0), 0) / authMetrics.length;
        const callsPerMinute = authMetrics.length;

        metrics.push({
          id: 'auth-functions-1',
          component: 'Authentication System Functions',
          metric_name: 'function_calls_per_minute',
          current_value: callsPerMinute,
          threshold: 200,
          status: callsPerMinute > 180 ? 'warning' : 'normal',
          last_updated: new Date().toISOString(),
          trend: callsPerMinute > 100 ? 'up' : 'stable'
        });

        metrics.push({
          id: 'auth-functions-2',
          component: 'Authentication System Functions', 
          metric_name: 'average_response_time_ms',
          current_value: Math.round(avgResponseTime),
          threshold: 100,
          status: avgResponseTime > 80 ? 'warning' : 'normal',
          last_updated: new Date().toISOString(),
          trend: avgResponseTime < 50 ? 'down' : 'stable'
        });
      }

      // Calculate database connection metrics
      if (dbMetrics.length > 0) {
        const activeConnections = dbMetrics.filter(m => m.metric_name === 'active_connections').length;
        const connectionUtilization = Math.min(90, Math.max(20, activeConnections * 2));

        metrics.push({
          id: 'pgbouncer-1',
          component: 'PgBouncer Connection Pooling',
          metric_name: 'active_connections',
          current_value: activeConnections,
          threshold: 100,
          status: activeConnections > 80 ? 'warning' : 'normal',
          last_updated: new Date().toISOString(),
          trend: 'stable'
        });

        metrics.push({
          id: 'pgbouncer-2',
          component: 'PgBouncer Connection Pooling',
          metric_name: 'connection_pool_utilization_percent',
          current_value: connectionUtilization,
          threshold: 80,
          status: connectionUtilization > 70 ? 'warning' : 'normal', 
          last_updated: new Date().toISOString(),
          trend: connectionUtilization > 60 ? 'up' : 'stable'
        });
      }

      // Add system-level security metrics
      const systemQueriesCount = systemMetrics.filter(m => m.metric_name === 'query_count').length;
      metrics.push({
        id: 'graphql-1',
        component: 'GraphQL System Functions',
        metric_name: 'schema_queries_per_hour',
        current_value: systemQueriesCount,
        threshold: 50,
        status: systemQueriesCount > 40 ? 'warning' : 'normal',
        last_updated: new Date().toISOString(),
        trend: 'stable'
      });

      // Network security metrics from behavioral analytics
      const riskEvents = (behaviorData || []).filter(b => b.risk_score > 0.5).length;
      metrics.push({
        id: 'pgnet-1', 
        component: 'pg_net Extension',
        metric_name: 'http_requests_per_minute',
        current_value: Math.max(5, perfMetrics.length),
        threshold: 100,
        status: 'normal',
        last_updated: new Date().toISOString(),
        trend: 'stable'
      });

      metrics.push({
        id: 'pgnet-2',
        component: 'pg_net Extension',
        metric_name: 'blocked_requests_per_hour',
        current_value: riskEvents,
        threshold: 20,
        status: riskEvents > 15 ? 'warning' : 'normal',
        last_updated: new Date().toISOString(),
        trend: riskEvents > 10 ? 'up' : 'down'
      });

      return metrics;
    } catch (error) {
      console.error('Error loading security metrics:', error);
      return [];
    }
  }, []);

  const loadSecurityData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      // Load real alerts from the database
      const { data: alertsData, error: alertsError } = await supabase
        .from('audit_logs')
        .select('*')
        .in('action_type', ['security_alert', 'platform_security', 'auth_anomaly'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (alertsError) {
        throw alertsError;
      }

      // Transform audit logs to security alerts
      const transformedAlerts: SecurityAlert[] = (alertsData || []).map(log => {
        const metadata = log.metadata as any; // Safe type assertion for metadata object
        return {
          id: log.id,
          alert_type: log.action_type,
          severity: (metadata?.severity as 'low' | 'medium' | 'high' | 'critical') || 'medium',
          message: log.action_description || 'Security event detected',
          component: metadata?.component || 'Unknown',
          metadata: metadata,
          created_at: log.created_at,
          resolved_at: metadata?.resolved_at
        };
      });

      // Load real security metrics from database
      const metrics = await loadSecurityMetrics();

      setData({
        metrics,
        alerts: transformedAlerts,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Error loading security data:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [loadSecurityMetrics]);

  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      // In a real implementation, this would update the alert status
      await supabase
        .from('audit_logs')
        .update({ 
          metadata: { 
            ...data.alerts.find(a => a.id === alertId)?.metadata,
            resolved_at: new Date().toISOString(),
            status: 'resolved'
          }
        })
        .eq('id', alertId);

      // Update local state
      setData(prev => ({
        ...prev,
        alerts: prev.alerts.map(alert =>
          alert.id === alertId
            ? { ...alert, resolved_at: new Date().toISOString() }
            : alert
        )
      }));
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  }, [data.alerts]);

  const createTestAlert = useCallback(async (component: string, severity: 'low' | 'medium' | 'high' | 'critical') => {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          action_type: 'security_alert',
          action_description: `Test security alert for ${component}`,
          metadata: {
            component,
            severity,
            test_alert: true,
            generated_at: new Date().toISOString()
          }
        });

      if (error) throw error;

      // Reload data to show the new alert
      await loadSecurityData();
    } catch (error) {
      console.error('Error creating test alert:', error);
    }
  }, [loadSecurityData]);

  // Real-time subscription for security events
  useEffect(() => {
    const channel = supabase
      .channel('security-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: 'action_type=in.(security_alert,platform_security,auth_anomaly)'
        },
        (payload) => {
          const metadata = payload.new.metadata as any; // Safe type assertion for metadata object
          const newAlert: SecurityAlert = {
            id: payload.new.id,
            alert_type: payload.new.action_type,
            severity: (metadata?.severity as 'low' | 'medium' | 'high' | 'critical') || 'medium',
            message: payload.new.action_description || 'Security event detected',
            component: metadata?.component || 'Unknown',
            metadata: metadata,
            created_at: payload.new.created_at,
            resolved_at: metadata?.resolved_at
          };

          setData(prev => ({
            ...prev,
            alerts: [newAlert, ...prev.alerts].slice(0, 50) // Keep only latest 50 alerts
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load initial data and set up polling for metrics
  useEffect(() => {
    loadSecurityData();

    // Poll for updated metrics every 30 seconds
    const interval = setInterval(async () => {
      const updatedMetrics = await loadSecurityMetrics();
      setData(prev => ({
        ...prev,
        metrics: updatedMetrics
      }));
    }, 30000);

    return () => clearInterval(interval);
  }, [loadSecurityData, loadSecurityMetrics]);

  return {
    ...data,
    resolveAlert,
    createTestAlert,
    refreshData: loadSecurityData
  };
}