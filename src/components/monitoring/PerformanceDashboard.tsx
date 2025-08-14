import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePerformanceMonitoring } from "@/hooks/usePerformanceMonitoring";
import { ProjectLineChart, ProjectBarChart } from "@/components/analytics/AnalyticsCharts";
import { 
  Monitor, 
  Database, 
  Cpu, 
  MemoryStick, 
  Network, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  X
} from "lucide-react";

export function PerformanceDashboard() {
  const { 
    webVitals, 
    databaseMetrics, 
    systemMetrics, 
    alerts, 
    trends, 
    performanceScore,
    resolveAlert 
  } = usePerformanceMonitoring();

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const getVitalStatus = (metric: string, value: number) => {
    const thresholds = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 }
    };
    
    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'default';
    
    if (value <= threshold.good) return 'success';
    if (value <= threshold.poor) return 'warning';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Performance Score Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getScoreColor(performanceScore)}`}>
                {performanceScore}
              </div>
              <div className="text-sm text-muted-foreground">Performance Score</div>
            </div>
            <Progress value={performanceScore} className="flex-1" />
            <Badge variant={performanceScore >= 90 ? 'default' : performanceScore >= 70 ? 'secondary' : 'destructive'}>
              {performanceScore >= 90 ? 'Excellent' : performanceScore >= 70 ? 'Good' : 'Poor'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Performance Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <Alert key={alert.id} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                <div className="flex items-center justify-between">
                  <AlertDescription className="flex-1">
                    {alert.message}
                  </AlertDescription>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => resolveAlert(alert.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="vitals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vitals">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="system">System Resources</TabsTrigger>
          <TabsTrigger value="database">Database Performance</TabsTrigger>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="vitals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">LCP</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(webVitals.lcp)}ms</div>
                <Badge variant={getVitalStatus('lcp', webVitals.lcp) === 'destructive' ? 'destructive' : 'default'} className="text-xs">
                  Largest Contentful Paint
                </Badge>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">FID</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(webVitals.fid)}ms</div>
                <Badge variant={getVitalStatus('fid', webVitals.fid) === 'destructive' ? 'destructive' : 'default'} className="text-xs">
                  First Input Delay
                </Badge>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">CLS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{webVitals.cls.toFixed(3)}</div>
                <Badge variant={getVitalStatus('cls', webVitals.cls) === 'destructive' ? 'destructive' : 'default'} className="text-xs">
                  Cumulative Layout Shift
                </Badge>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">FCP</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(webVitals.fcp)}ms</div>
                <Badge variant="outline" className="text-xs">
                  First Contentful Paint
                </Badge>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">TTFB</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(webVitals.ttfb)}ms</div>
                <Badge variant="outline" className="text-xs">
                  Time to First Byte
                </Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MemoryStick className="h-4 w-4" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-2xl font-bold">{Math.round(systemMetrics.memoryUsage)}%</span>
                    <Badge variant={systemMetrics.memoryUsage > 80 ? 'destructive' : 'default'}>
                      {systemMetrics.memoryUsage > 80 ? 'High' : 'Normal'}
                    </Badge>
                  </div>
                  <Progress value={systemMetrics.memoryUsage} />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Cpu className="h-4 w-4" />
                  CPU Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-2xl font-bold">{Math.round(systemMetrics.cpuUsage)}%</span>
                    <Badge variant={systemMetrics.cpuUsage > 70 ? 'destructive' : 'default'}>
                      {systemMetrics.cpuUsage > 70 ? 'High' : 'Normal'}
                    </Badge>
                  </div>
                  <Progress value={systemMetrics.cpuUsage} />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Network className="h-4 w-4" />
                  Network Latency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(systemMetrics.networkLatency)}ms</div>
                <Badge variant={systemMetrics.networkLatency > 500 ? 'secondary' : 'default'} className="text-xs">
                  {systemMetrics.networkLatency > 500 ? 'Slow' : 'Fast'}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Database className="h-4 w-4" />
                  Query Count
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{databaseMetrics.queryCount}</div>
                <p className="text-xs text-muted-foreground">Last hour</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  Avg Query Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(databaseMetrics.avgQueryTime)}ms</div>
                <Badge variant={databaseMetrics.avgQueryTime > 1000 ? 'destructive' : 'default'} className="text-xs">
                  {databaseMetrics.avgQueryTime > 1000 ? 'Slow' : 'Fast'}
                </Badge>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Slow Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{databaseMetrics.slowQueries}</div>
                <p className="text-xs text-muted-foreground">&gt;1s execution time</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cache Hit Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{Math.round(databaseMetrics.cacheHitRatio)}%</div>
                <Badge variant={databaseMetrics.cacheHitRatio > 80 ? 'default' : 'secondary'} className="text-xs">
                  {databaseMetrics.cacheHitRatio > 80 ? 'Good' : 'Poor'}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProjectLineChart
              title="Core Web Vitals Trends"
              description="LCP, FID, and CLS over time"
              data={trends.map(t => ({ name: new Date(t.timestamp).toLocaleTimeString(), value: t.lcp || 0 }))}
              lines={[
                { dataKey: 'value', name: 'LCP (ms)' },
              ]}
              showArea
              height={300}
            />
            
            <ProjectLineChart
              title="System Resource Trends"
              description="Memory and CPU usage over time"
              data={trends.map(t => ({ name: new Date(t.timestamp).toLocaleTimeString(), value: t.memoryUsage || 0 }))}
              lines={[
                { dataKey: 'value', name: 'Memory (%)' },
              ]}
              showArea
              height={300}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}