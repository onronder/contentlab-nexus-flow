import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  DollarSign,
  Clock,
  Zap
} from 'lucide-react';
import { externalApiMonitoringService, type ApiUsageStats, type ApiHealthStatus } from '@/services/externalApiMonitoringService';
import { useToast } from '@/components/ui/use-toast';

interface ExternalApiMonitoringProps {
  projectId: string;
}

export function ExternalApiMonitoring({ projectId }: ExternalApiMonitoringProps) {
  const [usageStats, setUsageStats] = useState<ApiUsageStats[]>([]);
  const [healthStatus, setHealthStatus] = useState<ApiHealthStatus[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [costThreshold, setCostThreshold] = useState({ totalCost: 0, percentUsed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const { toast } = useToast();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [stats, health, alertsData, costData] = await Promise.all([
        externalApiMonitoringService.getApiUsageStats(projectId, timeRange),
        externalApiMonitoringService.checkApiHealth(),
        externalApiMonitoringService.getAlerts(projectId),
        externalApiMonitoringService.checkCostThresholds(projectId, 100)
      ]);

      setUsageStats(stats);
      setHealthStatus(health);
      setAlerts(alertsData);
      setCostThreshold(costData);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
      toast({
        title: 'Error Loading Data',
        description: 'Failed to load monitoring data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadData();
    toast({
      title: 'Data Refreshed',
      description: 'Monitoring data has been updated.',
    });
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      await externalApiMonitoringService.dismissAlert(alertId);
      await loadData();
      toast({
        title: 'Alert Dismissed',
        description: 'The alert has been dismissed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to dismiss alert.',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, timeRange]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'degraded': return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'down': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="ml-2">Loading monitoring data...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">External API Monitoring</h2>
          <p className="text-muted-foreground">
            Monitor BrightData API usage, costs, and performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-1 border rounded-md bg-background"
          >
            <option value="hour">Last Hour</option>
            <option value="day">Last Day</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage Stats</TabsTrigger>
          <TabsTrigger value="health">Health Status</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Cost</p>
                  <p className="text-2xl font-bold">${costThreshold.totalCost.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-muted-foreground" />
              </div>
              <Progress value={costThreshold.percentUsed} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {costThreshold.percentUsed.toFixed(1)}% of monthly limit
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold">
                    {usageStats.reduce((sum, stat) => sum + stat.totalRequests, 0)}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">
                  {usageStats.reduce((sum, stat) => sum + stat.successfulRequests, 0)} successful
                </p>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response Time</p>
                  <p className="text-2xl font-bold">
                    {usageStats.length > 0 
                      ? Math.round(usageStats.reduce((sum, stat) => sum + stat.averageResponseTime, 0) / usageStats.length)
                      : 0}ms
                  </p>
                </div>
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Zap className="w-4 h-4 mr-2" />
                API Health Status
              </h3>
              <div className="space-y-2">
                {healthStatus.map((api, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center">
                      {getStatusIcon(api.status)}
                      <span className="ml-2 font-medium">{api.apiName}</span>
                    </div>
                    <div className="text-right">
                      <Badge variant={api.status === 'healthy' ? 'default' : 'destructive'}>
                        {api.status}
                      </Badge>
                      {api.responseTime && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {api.responseTime}ms
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Recent Alerts
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="p-2 border rounded">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Badge variant={getSeverityColor(alert.severity)} className="mb-1">
                          {alert.severity}
                        </Badge>
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.description}
                        </p>
                      </div>
                      {!alert.is_dismissed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDismissAlert(alert.id)}
                        >
                          Dismiss
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No alerts to display
                  </p>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {usageStats.map((stat, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{stat.apiProvider}</h3>
                  <Badge variant="outline">{stat.timeRange}</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Requests</p>
                    <p className="text-xl font-bold">{stat.totalRequests}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-xl font-bold">
                      {stat.totalRequests > 0 
                        ? Math.round((stat.successfulRequests / stat.totalRequests) * 100)
                        : 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                    <p className="text-xl font-bold">${stat.totalCost.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Response</p>
                    <p className="text-xl font-bold">{Math.round(stat.averageResponseTime)}ms</p>
                  </div>
                </div>
              </Card>
            ))}
            {usageStats.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No usage data available for the selected time range.</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {healthStatus.map((api, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getStatusIcon(api.status)}
                    <div className="ml-3">
                      <h3 className="font-semibold">{api.apiName}</h3>
                      <p className="text-sm text-muted-foreground">
                        Last checked: {api.lastCheck.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={api.status === 'healthy' ? 'default' : 'destructive'}
                      className="mb-2"
                    >
                      {api.status.toUpperCase()}
                    </Badge>
                    {api.responseTime && (
                      <p className="text-sm text-muted-foreground">
                        Response: {api.responseTime}ms
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Error Rate: {api.errorRate}%
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-3">
            {alerts.map((alert) => (
              <Card key={alert.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">{alert.alert_type}</Badge>
                      {alert.is_dismissed && (
                        <Badge variant="secondary">DISMISSED</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold">{alert.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {alert.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!alert.is_dismissed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDismissAlert(alert.id)}
                    >
                      Dismiss
                    </Button>
                  )}
                </div>
              </Card>
            ))}
            {alerts.length === 0 && (
              <Card className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No alerts to display.</p>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}