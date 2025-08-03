import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, XCircle, BarChart3, Clock, Zap } from 'lucide-react';
import { errorMonitoring, type ErrorMetrics } from '@/utils/errorMonitoring';
import { isDevelopment } from '@/utils/productionUtils';

export function HealthMonitor() {
  const [metrics, setMetrics] = useState<ErrorMetrics | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(errorMonitoring.getErrorMetrics());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (!isDevelopment() || !metrics) {
    return null;
  }

  const getHealthStatus = () => {
    if (metrics.errorRate > 10) return { status: 'critical', color: 'destructive' as const, icon: XCircle };
    if (metrics.errorRate > 5) return { status: 'warning', color: 'outline' as const, icon: AlertTriangle };
    if (metrics.errorCount > 0) return { status: 'minor', color: 'secondary' as const, icon: BarChart3 };
    return { status: 'healthy', color: 'default' as const, icon: CheckCircle };
  };

  const healthStatus = getHealthStatus();

  return (
    <Card className="mt-4 border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <healthStatus.icon className="h-4 w-4" />
            <CardTitle className="text-sm">Health Monitor</CardTitle>
            <Badge variant="outline" className="text-xs">
              DEV
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
        <CardDescription className="text-xs">
          Real-time error monitoring and application health
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant={healthStatus.color} className="text-xs">
              {healthStatus.status.toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {metrics.errorCount} errors in 24h
            </span>
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Zap className="h-3 w-3" />
            <span>{metrics.errorRate.toFixed(1)}/hr</span>
          </div>
          
          {metrics.lastError && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{metrics.lastError.toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {isExpanded && (
          <>
            <Separator className="my-4" />
            
            {metrics.errorCount > 0 ? (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-2">Common Errors</h4>
                  <div className="space-y-2">
                    {metrics.commonErrors.slice(0, 3).map((error, index) => (
                      <div key={index} className="text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-muted-foreground truncate max-w-[200px]">
                            {error.message}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {error.count}x
                            </Badge>
                            <span className="text-muted-foreground">
                              {error.lastOccurred.toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Errors detected. Check console for details or review error patterns above.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  No errors detected in the last 24 hours. Application is running smoothly.
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => errorMonitoring.clearBuffer()}
              >
                Clear Buffer
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setMetrics(errorMonitoring.getErrorMetrics())}
              >
                Refresh
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}