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

  // Mock security metrics for platform components
  const generateMockMetrics = useCallback((): SecurityMetric[] => {
    const baseTime = Date.now();
    return [
      {
        id: 'auth-functions-1',
        component: 'Authentication System Functions',
        metric_name: 'function_calls_per_minute',
        current_value: Math.floor(Math.random() * 100) + 50,
        threshold: 200,
        status: 'normal',
        last_updated: new Date(baseTime - Math.random() * 60000).toISOString(),
        trend: 'stable'
      },
      {
        id: 'auth-functions-2',
        component: 'Authentication System Functions',
        metric_name: 'average_response_time_ms',
        current_value: Math.floor(Math.random() * 20) + 5,
        threshold: 100,
        status: 'normal',
        last_updated: new Date(baseTime - Math.random() * 60000).toISOString(),
        trend: 'down'
      },
      {
        id: 'pgbouncer-1',
        component: 'PgBouncer Connection Pooling',
        metric_name: 'active_connections',
        current_value: Math.floor(Math.random() * 50) + 10,
        threshold: 100,
        status: 'normal',
        last_updated: new Date(baseTime - Math.random() * 60000).toISOString(),
        trend: 'stable'
      },
      {
        id: 'pgbouncer-2',
        component: 'PgBouncer Connection Pooling',
        metric_name: 'connection_pool_utilization_percent',
        current_value: Math.floor(Math.random() * 30) + 20,
        threshold: 80,
        status: 'normal',
        last_updated: new Date(baseTime - Math.random() * 60000).toISOString(),
        trend: 'up'
      },
      {
        id: 'graphql-1',
        component: 'GraphQL System Functions',
        metric_name: 'schema_queries_per_hour',
        current_value: Math.floor(Math.random() * 10) + 1,
        threshold: 50,
        status: 'normal',
        last_updated: new Date(baseTime - Math.random() * 60000).toISOString(),
        trend: 'stable'
      },
      {
        id: 'pgnet-1',
        component: 'pg_net Extension',
        metric_name: 'http_requests_per_minute',
        current_value: Math.floor(Math.random() * 20) + 5,
        threshold: 100,
        status: 'normal',
        last_updated: new Date(baseTime - Math.random() * 60000).toISOString(),
        trend: 'stable'
      },
      {
        id: 'pgnet-2',
        component: 'pg_net Extension',
        metric_name: 'blocked_requests_per_hour',
        current_value: Math.floor(Math.random() * 5),
        threshold: 20,
        status: Math.random() > 0.8 ? 'warning' : 'normal',
        last_updated: new Date(baseTime - Math.random() * 60000).toISOString(),
        trend: 'down'
      }
    ];
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

      // Generate mock metrics (in production, these would come from monitoring services)
      const metrics = generateMockMetrics();

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
  }, [generateMockMetrics]);

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
    const interval = setInterval(() => {
      setData(prev => ({
        ...prev,
        metrics: generateMockMetrics()
      }));
    }, 30000);

    return () => clearInterval(interval);
  }, [loadSecurityData, generateMockMetrics]);

  return {
    ...data,
    resolveAlert,
    createTestAlert,
    refreshData: loadSecurityData
  };
}