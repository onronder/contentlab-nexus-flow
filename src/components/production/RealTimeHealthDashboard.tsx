import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Database, 
  Server, 
  Wifi, 
  Shield, 
  Clock, 
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SystemMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  threshold: { warning: number; critical: number };
  trend: 'up' | 'down' | 'stable';
  lastUpdated: Date;
}

interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

interface PerformanceAlert {
  id: string;
  metric: string;
  threshold: number;
  currentValue: number;
  severity: 'warning' | 'critical';
  timestamp: Date;
}

export const RealTimeHealthDashboard: React.FC = () => {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [performanceAlerts, setPerformanceAlerts] = useState<PerformanceAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const generateSystemMetrics = useCallback((): SystemMetric[] => {
    const now = new Date();
    return [
      {
        id: 'response_time',
        name: 'Average Response Time',
        value: Math.random() * 500 + 100,
        unit: 'ms',
        status: Math.random() > 0.8 ? 'warning' : 'healthy',
        threshold: { warning: 500, critical: 1000 },
        trend: Math.random() > 0.5 ? 'stable' : 'down',
        lastUpdated: now
      },
      {
        id: 'database_connections',
        name: 'Database Connections',
        value: Math.floor(Math.random() * 100) + 20,
        unit: 'active',
        status: Math.random() > 0.9 ? 'warning' : 'healthy',
        threshold: { warning: 80, critical: 95 },
        trend: 'stable',
        lastUpdated: now
      },
      {
        id: 'memory_usage',
        name: 'Memory Usage',
        value: Math.random() * 40 + 40,
        unit: '%',
        status: Math.random() > 0.85 ? 'warning' : 'healthy',
        threshold: { warning: 80, critical: 95 },
        trend: Math.random() > 0.6 ? 'stable' : 'up',
        lastUpdated: now
      },
      {
        id: 'cpu_usage',
        name: 'CPU Usage',
        value: Math.random() * 30 + 20,
        unit: '%',
        status: 'healthy',
        threshold: { warning: 70, critical: 90 },
        trend: 'stable',
        lastUpdated: now
      },
      {
        id: 'error_rate',
        name: 'Error Rate',
        value: Math.random() * 2,
        unit: '%',
        status: Math.random() > 0.9 ? 'warning' : 'healthy',
        threshold: { warning: 1, critical: 5 },
        trend: Math.random() > 0.7 ? 'stable' : 'down',
        lastUpdated: now
      },
      {
        id: 'cache_hit_rate',
        name: 'Cache Hit Rate',
        value: Math.random() * 20 + 80,
        unit: '%',
        status: 'healthy',
        threshold: { warning: 70, critical: 50 },
        trend: 'stable',
        lastUpdated: now
      }
    ];
  }, []);

  const generateSecurityEvents = useCallback((): SecurityEvent[] => {
    const events = [
      'Multiple failed login attempts',
      'Unusual API access pattern detected',
      'Rate limit exceeded',
      'Suspicious IP activity',
      'Invalid token usage'
    ];
    
    return Array.from({ length: Math.floor(Math.random() * 3) }, (_, i) => ({
      id: `security_${i}`,
      type: ['authentication', 'authorization', 'rate_limiting', 'suspicious_activity'][Math.floor(Math.random() * 4)],
      severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
      message: events[Math.floor(Math.random() * events.length)],
      timestamp: new Date(Date.now() - Math.random() * 3600000),
      resolved: Math.random() > 0.3
    }));
  }, []);

  const generatePerformanceAlerts = useCallback((): PerformanceAlert[] => {
    const alerts = [];
    const criticalMetrics = metrics.filter(m => m.status === 'critical' || m.status === 'warning');
    
    criticalMetrics.forEach(metric => {
      if (Math.random() > 0.7) {
        alerts.push({
          id: `alert_${metric.id}`,
          metric: metric.name,
          threshold: metric.threshold.warning,
          currentValue: metric.value,
          severity: metric.status === 'critical' ? 'critical' : 'warning',
          timestamp: new Date()
        });
      }
    });
    
    return alerts;
  }, [metrics]);

  const fetchRealTimeData = useCallback(async () => {
    try {
      setIsConnected(true);
      
      // Simulate real-time data fetch from edge functions
      const newMetrics = generateSystemMetrics();
      const newSecurityEvents = generateSecurityEvents();
      const newAlerts = generatePerformanceAlerts();
      
      setMetrics(newMetrics);
      setSecurityEvents(newSecurityEvents);
      setPerformanceAlerts(newAlerts);
      setLastUpdate(new Date());
      
      // Check for critical alerts
      const criticalAlerts = newAlerts.filter(a => a.severity === 'critical');
      if (criticalAlerts.length > 0) {
        toast({
          title: "Critical Performance Alert",
          description: `${criticalAlerts.length} critical issues detected`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to fetch real-time data:', error);
      setIsConnected(false);
      toast({
        title: "Connection Error",
        description: "Failed to fetch real-time monitoring data",
        variant: "destructive",
      });
    }
  }, [generateSystemMetrics, generateSecurityEvents, generatePerformanceAlerts, toast]);

  useEffect(() => {
    fetchRealTimeData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchRealTimeData, 5000); // Update every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchRealTimeData, autoRefresh]);

  const getStatusColor = (status: SystemMetric['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: SystemMetric['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: SystemMetric['trend']) => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      case 'stable': return '→';
      default: return '→';
    }
  };

  const getProgressValue = (metric: SystemMetric) => {
    const max = metric.unit === '%' ? 100 : metric.threshold.critical * 1.2;
    return Math.min((metric.value / max) * 100, 100);
  };

  const overallHealth = metrics.length > 0 ? 
    metrics.some(m => m.status === 'critical') ? 'critical' :
    metrics.some(m => m.status === 'warning') ? 'warning' : 'healthy' : 'healthy';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Real-Time System Health</h2>
          <p className="text-muted-foreground">
            Live monitoring of system performance and security
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(overallHealth)}
              System Status
            </div>
            <Badge variant={overallHealth === 'healthy' ? 'default' : 
                           overallHealth === 'warning' ? 'secondary' : 'destructive'}>
              {overallHealth.toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overallHealth !== 'healthy' && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {overallHealth === 'critical' 
                  ? 'Critical issues detected - immediate attention required'
                  : 'Warning conditions detected - monitoring recommended'
                }
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* System Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>{metric.name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs">{getTrendIcon(metric.trend)}</span>
                  {getStatusIcon(metric.status)}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-bold ${getStatusColor(metric.status)}`}>
                    {metric.value.toFixed(metric.unit === '%' ? 1 : 0)}
                  </span>
                  <span className="text-sm text-muted-foreground">{metric.unit}</span>
                </div>
                <Progress value={getProgressValue(metric)} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Warning: {metric.threshold.warning}{metric.unit}</span>
                  <span>Critical: {metric.threshold.critical}{metric.unit}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Alerts */}
      {performanceAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Performance Alerts
            </CardTitle>
            <CardDescription>
              Active performance issues requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {performanceAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`h-4 w-4 ${alert.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'}`} />
                    <div>
                      <p className="font-medium">{alert.metric}</p>
                      <p className="text-sm text-muted-foreground">
                        Current: {alert.currentValue.toFixed(1)} | Threshold: {alert.threshold}
                      </p>
                    </div>
                  </div>
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Events */}
      {securityEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Events
            </CardTitle>
            <CardDescription>
              Recent security-related events and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {securityEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className={`h-4 w-4 ${
                      event.severity === 'critical' ? 'text-red-500' :
                      event.severity === 'high' ? 'text-orange-500' :
                      event.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                    }`} />
                    <div>
                      <p className="font-medium">{event.message}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.type} • {event.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      event.severity === 'critical' ? 'destructive' :
                      event.severity === 'high' ? 'destructive' :
                      event.severity === 'medium' ? 'secondary' : 'outline'
                    }>
                      {event.severity}
                    </Badge>
                    {event.resolved && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Infrastructure Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Database className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="font-medium">Database</p>
              <p className="text-sm text-green-600">Healthy</p>
            </div>
            <div className="text-center">
              <Server className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="font-medium">API</p>
              <p className="text-sm text-green-600">Operational</p>
            </div>
            <div className="text-center">
              <Wifi className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="font-medium">CDN</p>
              <p className="text-sm text-green-600">Optimized</p>
            </div>
            <div className="text-center">
              <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="font-medium">Security</p>
              <p className="text-sm text-green-600">Protected</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};