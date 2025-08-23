import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Zap,
  Clock,
  Users,
  Server,
  Database,
  Globe,
  Shield,
  Bell,
  Eye,
  BarChart3,
  RefreshCw,
  Settings,
  Download
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { realTimeMonitoringService, type SystemHealthStatus, type RealTimeMetric } from '@/services/realTimeMonitoringService';
import { multiChannelAlertingService, type AlertChannel } from '@/services/multiChannelAlertingService';
import { advancedErrorTrackingService, type ErrorPattern, type ErrorTrendAnalysis } from '@/services/advancedErrorTrackingService';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from '@/hooks/use-toast';

interface MetricChartData {
  timestamp: number;
  value: number;
  name: string;
}

export const AdvancedMonitoringDashboard = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealthStatus | null>(null);
  const [metrics, setMetrics] = useState<RealTimeMetric[]>([]);
  const [errorAnalysis, setErrorAnalysis] = useState<ErrorTrendAnalysis | null>(null);
  const [errorPatterns, setErrorPatterns] = useState<ErrorPattern[]>([]);
  const [alertChannels, setAlertChannels] = useState<AlertChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadInitialData();
    
    const unsubscribers = [
      realTimeMonitoringService.subscribe('system_health', (health) => {
        setSystemHealth(health);
      }),
      realTimeMonitoringService.subscribe('metric', (metric) => {
        setMetrics(prev => [...prev.slice(-99), metric]);
      })
    ];

    const refreshInterval = autoRefresh ? setInterval(refreshData, 30000) : null;

    return () => {
      unsubscribers.forEach(unsub => unsub());
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [autoRefresh]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Load system health
      const health = await realTimeMonitoringService.triggerManualHealthCheck();
      setSystemHealth(health);

      // Load recent metrics
      const recentMetrics = realTimeMonitoringService.getMetricsStream();
      setMetrics(recentMetrics.slice(-100));

      // Load error analysis
      const analysis = advancedErrorTrackingService.getRecentAnalysis();
      setErrorAnalysis(analysis);

      // Load error patterns
      const patterns = advancedErrorTrackingService.getErrorPatterns();
      setErrorPatterns(patterns);

      // Load alert channels
      const channels = multiChannelAlertingService.getChannels();
      setAlertChannels(channels);

    } catch (error) {
      console.error('Failed to load monitoring data:', error);
      toast({
        variant: "destructive",
        title: "Loading Error",
        description: "Failed to load monitoring data. Please refresh the page."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      const health = await realTimeMonitoringService.triggerManualHealthCheck();
      setSystemHealth(health);
      
      const analysis = advancedErrorTrackingService.getRecentAnalysis();
      setErrorAnalysis(analysis);
      
      const patterns = advancedErrorTrackingService.getErrorPatterns();
      setErrorPatterns(patterns);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  const chartData = useMemo(() => {
    if (!metrics.length) return [];
    
    return metrics
      .filter(m => m.metricType === 'performance')
      .slice(-20)
      .map(m => ({
        timestamp: m.timestamp,
        value: m.value,
        name: new Date(m.timestamp).toLocaleTimeString()
      }));
  }, [metrics]);

  const systemHealthChartData = useMemo(() => {
    if (!systemHealth) return [];
    
    return [
      { name: 'API', score: systemHealth.components.api.score, status: systemHealth.components.api.status },
      { name: 'Database', score: systemHealth.components.database.score, status: systemHealth.components.database.status },
      { name: 'Cache', score: systemHealth.components.cache.score, status: systemHealth.components.cache.status },
      { name: 'Security', score: systemHealth.components.security.score, status: systemHealth.components.security.status }
    ];
  }, [systemHealth]);

  const errorTrendData = useMemo(() => {
    if (!errorPatterns.length) return [];
    
    return errorPatterns
      .slice(0, 10)
      .map(pattern => ({
        name: pattern.pattern.slice(0, 30) + '...',
        frequency: pattern.frequency,
        severity: pattern.severity,
        users: pattern.affectedUsers.size
      }));
  }, [errorPatterns]);

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600'; 
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const testAlertChannel = async (channelId: string) => {
    try {
      const success = await multiChannelAlertingService.testChannel(channelId);
      toast({
        title: success ? "Test Successful" : "Test Failed",
        description: success ? "Alert channel is working correctly" : "Alert channel test failed",
        variant: success ? "default" : "destructive"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Test Error",
        description: "Failed to test alert channel"
      });
    }
  };

  const exportData = () => {
    const data = {
      systemHealth,
      metrics: metrics.slice(-100),
      errorAnalysis,
      errorPatterns,
      exportTime: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Monitoring</h1>
          <p className="text-muted-foreground">Real-time system monitoring and alerting</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Activity className={`w-4 h-4 ${getHealthStatusColor(systemHealth.overall)}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemHealth.score}/100</div>
              <p className={`text-xs ${getHealthStatusColor(systemHealth.overall)}`}>
                {systemHealth.overall.toUpperCase()}
              </p>
              <Progress value={systemHealth.score} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Performance</CardTitle>
              <Server className={`w-4 h-4 ${getHealthStatusColor(systemHealth.components.api.status)}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemHealth.components.api.responseTime}ms</div>
              <p className={`text-xs ${getHealthStatusColor(systemHealth.components.api.status)}`}>
                {systemHealth.components.api.status.toUpperCase()}
              </p>
              <Progress value={systemHealth.components.api.score} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database</CardTitle>
              <Database className={`w-4 h-4 ${getHealthStatusColor(systemHealth.components.database.status)}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemHealth.components.database.connectionPool}%</div>
              <p className={`text-xs ${getHealthStatusColor(systemHealth.components.database.status)}`}>
                Connection Pool
              </p>
              <Progress value={systemHealth.components.database.score} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache</CardTitle>
              <Zap className={`w-4 h-4 ${getHealthStatusColor(systemHealth.components.cache.status)}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(systemHealth.components.cache.hitRate * 100)}%</div>
              <p className={`text-xs ${getHealthStatusColor(systemHealth.components.cache.status)}`}>
                Hit Rate
              </p>
              <Progress value={systemHealth.components.cache.score} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security</CardTitle>
              <Shield className={`w-4 h-4 ${getHealthStatusColor(systemHealth.components.security.status)}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemHealth.components.security.threats}</div>
              <p className={`text-xs ${getHealthStatusColor(systemHealth.components.security.status)}`}>
                Active Threats
              </p>
              <Progress value={systemHealth.components.security.score} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Error Tracking</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Channels</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Real-time Metrics</CardTitle>
                <CardDescription>Performance metrics over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Component Health Scores</CardTitle>
                <CardDescription>Current system component status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={systemHealthChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="score" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {systemHealth?.predictions && (
            <Card>
              <CardHeader>
                <CardTitle>Health Predictions</CardTitle>
                <CardDescription>ML-based predictions for system health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Next Hour</span>
                      <Badge variant="outline">{systemHealth.predictions.nextHour.confidence * 100}% confidence</Badge>
                    </div>
                    <div className="text-2xl font-bold">{systemHealth.predictions.nextHour.score}/100</div>
                    <Progress value={systemHealth.predictions.nextHour.score} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Next Day</span>
                      <Badge variant="outline">{systemHealth.predictions.nextDay.confidence * 100}% confidence</Badge>
                    </div>
                    <div className="text-2xl font-bold">{systemHealth.predictions.nextDay.score}/100</div>
                    <Progress value={systemHealth.predictions.nextDay.score} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <div className="grid gap-4">
            {errorAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle>Error Analysis Summary</CardTitle>
                  <CardDescription>Recent error trends and analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">{errorAnalysis.totalErrors}</div>
                      <p className="text-xs text-muted-foreground">Total Errors ({errorAnalysis.timeRange})</p>
                    </div>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">{errorAnalysis.errorRate.toFixed(3)}</div>
                      <p className="text-xs text-muted-foreground">Errors per Second</p>
                    </div>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">{errorAnalysis.predictions.nextHour}</div>
                      <p className="text-xs text-muted-foreground">Predicted Next Hour</p>
                    </div>
                  </div>
                  
                  {errorAnalysis.recommendations.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                      <ul className="space-y-1">
                        {errorAnalysis.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <AlertTriangle className="w-3 h-3 mt-0.5 text-yellow-500" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Error Patterns</CardTitle>
                <CardDescription>Most frequent error patterns detected</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={errorTrendData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="frequency" fill="hsl(var(--destructive))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Error Patterns</CardTitle>
                <CardDescription>Active error patterns requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {errorPatterns.slice(0, 5).map((pattern) => (
                    <div key={pattern.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getSeverityColor(pattern.severity)}>
                            {pattern.severity}
                          </Badge>
                          <Badge variant="outline">{pattern.category}</Badge>
                        </div>
                        <h4 className="text-sm font-medium mb-1">{pattern.pattern}</h4>
                        <p className="text-xs text-muted-foreground">
                          {pattern.frequency} occurrences • {pattern.affectedUsers.size} users affected
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(pattern.lastSeen).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Channels</CardTitle>
              <CardDescription>Configure and manage notification channels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertChannels.map((channel) => (
                  <div key={channel.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        <span className="font-medium">{channel.name}</span>
                      </div>
                      <Badge variant="outline">{channel.type}</Badge>
                      <Badge variant={channel.enabled ? "default" : "secondary"}>
                        {channel.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {channel.severityFilter.join(', ')}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testAlertChannel(channel.id)}
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>System Health Forecast</CardTitle>
                <CardDescription>Predictive analytics for system performance</CardDescription>
              </CardHeader>
              <CardContent>
                {systemHealth?.predictions ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <TrendingUp className="w-8 h-8 text-green-500" />
                      <div>
                        <div className="text-2xl font-bold">{systemHealth.predictions.nextHour.score}%</div>
                        <p className="text-sm text-muted-foreground">Predicted health (1 hour)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <TrendingDown className="w-8 h-8 text-blue-500" />
                      <div>
                        <div className="text-2xl font-bold">{systemHealth.predictions.nextDay.score}%</div>
                        <p className="text-sm text-muted-foreground">Predicted health (24 hours)</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No prediction data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Rate Forecast</CardTitle>
                <CardDescription>Predicted error trends based on ML models</CardDescription>
              </CardHeader>
              <CardContent>
                {errorAnalysis?.predictions ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <BarChart3 className="w-8 h-8 text-orange-500" />
                      <div>
                        <div className="text-2xl font-bold">{errorAnalysis.predictions.nextHour}</div>
                        <p className="text-sm text-muted-foreground">Predicted errors (1 hour)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <BarChart3 className="w-8 h-8 text-red-500" />
                      <div>
                        <div className="text-2xl font-bold">{errorAnalysis.predictions.nextDay}</div>
                        <p className="text-sm text-muted-foreground">Predicted errors (24 hours)</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Confidence: {(errorAnalysis.predictions.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No error prediction data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};