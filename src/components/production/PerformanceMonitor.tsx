import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, Clock, Database, Wifi, AlertTriangle, CheckCircle } from 'lucide-react';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'poor';
  threshold: { good: number; warning: number };
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const measurePerformance = async () => {
      const startTime = performance.now();
      
      // Measure Core Web Vitals
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      // Measure database query performance
      const dbStart = performance.now();
      try {
        await fetch('/api/health-check'); // Simulate DB query
      } catch (error) {
        console.log('Health check endpoint not available');
      }
      const dbTime = performance.now() - dbStart;

      // Get memory usage if available
      const memory = (performance as any).memory;
      
      const performanceMetrics: PerformanceMetric[] = [
        {
          name: 'Page Load Time',
          value: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
          unit: 'ms',
          status: navigation && navigation.loadEventEnd - navigation.fetchStart < 2000 ? 'good' : 
                 navigation && navigation.loadEventEnd - navigation.fetchStart < 4000 ? 'warning' : 'poor',
          threshold: { good: 2000, warning: 4000 }
        },
        {
          name: 'DOM Content Loaded',
          value: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : 0,
          unit: 'ms',
          status: navigation && navigation.domContentLoadedEventEnd - navigation.fetchStart < 1500 ? 'good' :
                 navigation && navigation.domContentLoadedEventEnd - navigation.fetchStart < 3000 ? 'warning' : 'poor',
          threshold: { good: 1500, warning: 3000 }
        },
        {
          name: 'First Paint',
          value: navigation && 'firstPaint' in navigation ? (navigation as any).firstPaint : 0,
          unit: 'ms',
          status: 'good',
          threshold: { good: 1000, warning: 2000 }
        },
        {
          name: 'Database Response',
          value: dbTime,
          unit: 'ms',
          status: dbTime < 500 ? 'good' : dbTime < 1000 ? 'warning' : 'poor',
          threshold: { good: 500, warning: 1000 }
        }
      ];

      if (memory) {
        performanceMetrics.push({
          name: 'Memory Usage',
          value: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          unit: 'MB',
          status: memory.usedJSHeapSize < 50 * 1024 * 1024 ? 'good' :
                 memory.usedJSHeapSize < 100 * 1024 * 1024 ? 'warning' : 'poor',
          threshold: { good: 50, warning: 100 }
        });
      }

      setMetrics(performanceMetrics);
      setIsLoading(false);
    };

    measurePerformance();
    
    // Update metrics every 30 seconds
    const interval = setInterval(measurePerformance, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: PerformanceMetric['status']) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: PerformanceMetric['status']) => {
    switch (status) {
      case 'good': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'poor': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getProgressValue = (metric: PerformanceMetric) => {
    const max = metric.threshold.warning * 1.5;
    return Math.min((metric.value / max) * 100, 100);
  };

  const overallStatus = metrics.length > 0 ? 
    metrics.some(m => m.status === 'poor') ? 'poor' :
    metrics.some(m => m.status === 'warning') ? 'warning' : 'good' : 'good';

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Activity className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Performance Monitor
        </CardTitle>
        <CardDescription>
          Real-time performance metrics and Core Web Vitals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {overallStatus !== 'good' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Performance issues detected. Review metrics below and optimize as needed.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          {metrics.map((metric, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(metric.status)}
                  <span className="font-medium">{metric.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-sm ${getStatusColor(metric.status)}`}>
                    {metric.value.toFixed(0)} {metric.unit}
                  </span>
                  <Badge 
                    variant={metric.status === 'good' ? 'default' : 
                            metric.status === 'warning' ? 'secondary' : 'destructive'}
                  >
                    {metric.status}
                  </Badge>
                </div>
              </div>
              <Progress 
                value={getProgressValue(metric)} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Good: &lt; {metric.threshold.good}{metric.unit}</span>
                <span>Warning: &lt; {metric.threshold.warning}{metric.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Database className="h-4 w-4" />
            Production Recommendations
          </h4>
          <div className="space-y-2 text-sm">
            {overallStatus === 'good' && (
              <p className="text-green-600">✓ All performance metrics are within optimal ranges</p>
            )}
            {metrics.some(m => m.name === 'Page Load Time' && m.status !== 'good') && (
              <p className="text-yellow-600">• Consider optimizing bundle size and implementing code splitting</p>
            )}
            {metrics.some(m => m.name === 'Database Response' && m.status !== 'good') && (
              <p className="text-yellow-600">• Database queries may benefit from indexing or optimization</p>
            )}
            {metrics.some(m => m.name === 'Memory Usage' && m.status !== 'good') && (
              <p className="text-yellow-600">• Memory usage is high - check for memory leaks or optimize data structures</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}