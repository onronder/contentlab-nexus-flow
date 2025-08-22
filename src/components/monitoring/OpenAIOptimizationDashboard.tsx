import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Zap, Shield, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { openaiOptimizationService } from '@/services/openaiOptimizationService';

export function OpenAIOptimizationDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await openaiOptimizationService.getMetrics();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch optimization metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleOptimizeConfiguration = async () => {
    try {
      await openaiOptimizationService.optimizeConfiguration();
      toast({
        title: 'Configuration Optimized',
        description: 'OpenAI service configuration has been automatically optimized based on usage patterns.'
      });
    } catch (error) {
      toast({
        title: 'Optimization Failed',
        description: 'Failed to optimize configuration. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleEmergencyOptimization = async () => {
    try {
      await openaiOptimizationService.enableEmergencyOptimization();
      toast({
        title: 'Emergency Optimization Enabled',
        description: 'Aggressive cost reduction measures have been activated.',
        variant: 'destructive'
      });
    } catch (error) {
      toast({
        title: 'Emergency Optimization Failed',
        description: 'Failed to enable emergency optimization.',
        variant: 'destructive'
      });
    }
  };

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">OpenAI Optimization</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { cache, circuitBreaker, deduplication, overall } = metrics;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">OpenAI Optimization</h2>
        <div className="flex gap-2">
          <Button onClick={handleOptimizeConfiguration} variant="outline">
            <Zap className="mr-2 h-4 w-4" />
            Auto-Optimize
          </Button>
          <Button onClick={handleEmergencyOptimization} variant="destructive">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Emergency Mode
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(overall.successRate * 100).toFixed(1)}%
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Progress value={overall.successRate * 100} className="flex-1" />
              <Badge variant={overall.successRate > 0.9 ? 'default' : 'destructive'}>
                {overall.successRate > 0.9 ? 'Healthy' : 'Degraded'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(cache.hitRate * 100).toFixed(1)}%
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Progress value={cache.hitRate * 100} className="flex-1" />
              <Badge variant={cache.hitRate > 0.5 ? 'default' : 'secondary'}>
                {cache.hitRate > 0.5 ? 'Efficient' : 'Low'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${overall.costSavings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total saved through optimization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Circuit Breaker</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {circuitBreaker.state.state}
            </div>
            <Badge 
              variant={circuitBreaker.state.state === 'CLOSED' ? 'default' : 'destructive'}
              className="mt-2"
            >
              {circuitBreaker.state.state === 'CLOSED' ? 'Protected' : 'Triggered'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Cache Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Cache Performance</CardTitle>
            <CardDescription>Response caching statistics and efficiency</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Total Requests</p>
                <p className="text-2xl font-bold">{cache.totalRequests}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Cache Hits</p>
                <p className="text-2xl font-bold text-green-600">{cache.hits}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Cache Misses</p>
                <p className="text-2xl font-bold text-orange-600">{cache.misses}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Storage Used</p>
                <p className="text-2xl font-bold">{cache.storageUsed}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Hit Rate</span>
                <span className="text-sm font-medium">{(cache.hitRate * 100).toFixed(1)}%</span>
              </div>
              <Progress value={cache.hitRate * 100} />
            </div>
          </CardContent>
        </Card>

        {/* Circuit Breaker Status */}
        <Card>
          <CardHeader>
            <CardTitle>Circuit Breaker Status</CardTitle>
            <CardDescription>API protection and failure tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">State</p>
                <Badge variant={circuitBreaker.state.state === 'CLOSED' ? 'default' : 'destructive'}>
                  {circuitBreaker.state.state}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Failures</p>
                <p className="text-lg font-bold">{circuitBreaker.state.failures}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Daily Cost</p>
                <p className="text-lg font-bold">${circuitBreaker.state.dailyCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Daily Requests</p>
                <p className="text-lg font-bold">{circuitBreaker.state.dailyRequests}</p>
              </div>
            </div>
            
            {circuitBreaker.state.state === 'OPEN' && circuitBreaker.health.timeToRecovery && (
              <div className="p-3 bg-destructive/10 rounded-lg">
                <p className="text-sm font-medium text-destructive">
                  Recovery in {Math.ceil(circuitBreaker.health.timeToRecovery / 60000)} minutes
                </p>
                <p className="text-xs text-muted-foreground">
                  {circuitBreaker.health.reason}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deduplication Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Request Deduplication</CardTitle>
            <CardDescription>Duplicate request prevention and batching</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Total Requests</p>
                <p className="text-2xl font-bold">{deduplication.totalRequests}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Duplicates Prevented</p>
                <p className="text-2xl font-bold text-green-600">{deduplication.duplicateRequests}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Batched Requests</p>
                <p className="text-2xl font-bold text-blue-600">{deduplication.batchedRequests}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Efficiency</p>
                <p className="text-2xl font-bold">{(deduplication.efficiency * 100).toFixed(1)}%</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Optimization Rate</span>
                <span className="text-sm font-medium">{(deduplication.efficiency * 100).toFixed(1)}%</span>
              </div>
              <Progress value={deduplication.efficiency * 100} />
            </div>
          </CardContent>
        </Card>

        {/* Overall Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Performance</CardTitle>
            <CardDescription>Combined optimization metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Total Requests</p>
                <p className="text-2xl font-bold">{overall.totalRequests}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Average Cost</p>
                <p className="text-2xl font-bold">${overall.averageCost.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Performance Gain</p>
                <p className="text-2xl font-bold text-green-600">
                  {overall.performanceImprovement.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Total Savings</p>
                <p className="text-2xl font-bold text-green-600">${overall.costSavings.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}