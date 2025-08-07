import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useApiHealth } from '@/hooks/useApiHealth';
import { useCircuitBreakerStatus } from '@/hooks/useCircuitBreakerStatus';
import { Activity, AlertTriangle, CheckCircle, Clock, RefreshCw, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ApiStatusIndicatorProps {
  variant?: 'compact' | 'detailed';
  showRefreshButton?: boolean;
}

export function ApiStatusIndicator({ 
  variant = 'compact', 
  showRefreshButton = false 
}: ApiStatusIndicatorProps) {
  const { 
    healthInfo, 
    lastUpdate, 
    forceHealthCheck, 
    getHealthScore, 
    getStatusColor, 
    getStatusText,
    isOperational
  } = useApiHealth();
  
  const { 
    status: queueStatus, 
    resetCircuitBreaker, 
    isCircuitBreakerOpen 
  } = useCircuitBreakerStatus();

  const handleRefresh = async () => {
    await forceHealthCheck();
  };

  const handleResetCircuitBreaker = () => {
    resetCircuitBreaker();
  };

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getStatusColor() }}
              />
              <Badge variant={isOperational ? 'default' : 'destructive'}>
                API {getStatusText()}
              </Badge>
              {queueStatus.queueLength > 0 && (
                <Badge variant="outline">
                  {queueStatus.queueLength} queued
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-2 text-sm">
              <div>Health Score: {getHealthScore()}%</div>
              <div>Response Time: {healthInfo.responseTime}ms</div>
              <div>Error Rate: {(healthInfo.errorRate * 100).toFixed(1)}%</div>
              <div>Tokens Available: {healthInfo.rateLimitStatus.tokensAvailable}/{healthInfo.rateLimitStatus.maxTokens}</div>
              <div>Last Updated: {formatDistanceToNow(new Date(lastUpdate))} ago</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <CardTitle className="text-sm">API Status</CardTitle>
          </div>
          {showRefreshButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
        <CardDescription>
          OpenAI API Health & Rate Limiting
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOperational ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <span className="font-medium">{getStatusText()}</span>
          </div>
          <Badge 
            variant={isOperational ? 'default' : 'destructive'}
            style={{ backgroundColor: getStatusColor() }}
          >
            {getHealthScore()}% Health
          </Badge>
        </div>

        {/* Health Score Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Health Score</span>
            <span>{getHealthScore()}%</span>
          </div>
          <Progress value={getHealthScore()} className="h-2" />
        </div>

        {/* Rate Limiting Status */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3" />
            <span className="text-sm font-medium">Rate Limiting</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Tokens Available</div>
              <div className="font-mono">
                {healthInfo.rateLimitStatus.tokensAvailable}/{healthInfo.rateLimitStatus.maxTokens}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Refill Rate</div>
              <div className="font-mono">
                {healthInfo.rateLimitStatus.refillRate}/sec
              </div>
            </div>
          </div>
          {healthInfo.rateLimitStatus.isThrottled && (
            <div className="flex items-center gap-2 text-warning">
              <Clock className="h-3 w-3" />
              <span className="text-xs">
                Throttled - Wait {Math.ceil(healthInfo.estimatedWaitTime / 1000)}s
              </span>
            </div>
          )}
        </div>

        {/* Circuit Breaker Status */}
        {isCircuitBreakerOpen && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">Circuit Breaker Open</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetCircuitBreaker}
                className="h-7 text-xs"
              >
                Reset
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Automatic recovery in {Math.ceil(((queueStatus as any).circuitBreakerTimeRemaining || 0) / 60000)} minutes
            </p>
          </div>
        )}

        {/* Queue Status */}
        {queueStatus.queueLength > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Request Queue</span>
              <Badge variant="outline">
                {queueStatus.queueLength} requests
              </Badge>
            </div>
            {queueStatus.estimatedWaitTime > 0 && (
              <div className="text-xs text-muted-foreground">
                Estimated wait: {Math.ceil(queueStatus.estimatedWaitTime / 1000)}s
              </div>
            )}
          </div>
        )}

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
          <div>
            <div className="text-muted-foreground">Response Time</div>
            <div className="font-mono">{healthInfo.responseTime}ms</div>
          </div>
          <div>
            <div className="text-muted-foreground">Error Rate</div>
            <div className="font-mono">
              {(healthInfo.errorRate * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Last Update */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Last updated {formatDistanceToNow(new Date(lastUpdate))} ago
        </div>
      </CardContent>
    </Card>
  );
}