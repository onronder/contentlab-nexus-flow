import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Shield, ShieldAlert, ShieldCheck, RefreshCw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CircuitBreakerStatusProps {
  className?: string;
  showAdminControls?: boolean;
}

interface QueueStatus {
  queueLength: number;
  isProcessing: boolean;
  circuitBreakerOpen: boolean;
  estimatedWaitTime: number;
}

export function CircuitBreakerStatus({ 
  className,
  showAdminControls = false
}: CircuitBreakerStatusProps) {
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    queueLength: 0,
    isProcessing: false,
    circuitBreakerOpen: false,
    estimatedWaitTime: 0
  });
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Poll queue status every 5 seconds
  useEffect(() => {
    const checkStatus = () => {
      try {
        const status = (window as any).requestQueueService?.getQueueStatus();
        if (status) {
          setQueueStatus(status);
          
          // If circuit breaker is open, calculate time remaining
          if (status.circuitBreakerOpen) {
            const now = Date.now();
            const breakerOpenTime = (window as any).requestQueueService?.circuitBreakerOpenedAt || now;
            const timeoutDuration = 10 * 60 * 1000; // 10 minutes
            const remaining = Math.max(0, timeoutDuration - (now - breakerOpenTime));
            setTimeRemaining(remaining);
          } else {
            setTimeRemaining(0);
          }
        }
      } catch (error) {
        console.warn('Failed to get queue status:', error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const handleReset = () => {
    try {
      (window as any).requestQueueService?.clearQueue();
      setQueueStatus(prev => ({ ...prev, queueLength: 0, circuitBreakerOpen: false }));
      setTimeRemaining(0);
    } catch (error) {
      console.error('Failed to reset circuit breaker:', error);
    }
  };

  const getStatusConfig = () => {
    if (queueStatus.circuitBreakerOpen) {
      return {
        icon: ShieldAlert,
        variant: 'destructive' as const,
        title: 'Analysis Service Temporarily Unavailable',
        message: `Rate limit protection active. Service will resume in ${Math.ceil(timeRemaining / 60000)} minutes.`,
        badgeText: 'Rate Limited',
        badgeVariant: 'destructive' as const
      };
    }

    if (queueStatus.queueLength > 0) {
      return {
        icon: Clock,
        variant: 'default' as const,
        title: 'Analysis Queue Active',
        message: `${queueStatus.queueLength} analysis requests in queue. Estimated wait: ${Math.ceil(queueStatus.estimatedWaitTime / 60000)} minutes.`,
        badgeText: `Queue: ${queueStatus.queueLength}`,
        badgeVariant: 'secondary' as const
      };
    }

    if (queueStatus.isProcessing) {
      return {
        icon: RefreshCw,
        variant: 'default' as const,
        title: 'Analysis In Progress',
        message: 'Analysis service is currently processing requests.',
        badgeText: 'Processing',
        badgeVariant: 'secondary' as const
      };
    }

    return {
      icon: ShieldCheck,
      variant: 'default' as const,
      title: 'Analysis Service Ready',
      message: 'All systems operational. Ready to start new analysis.',
      badgeText: 'Ready',
      badgeVariant: 'secondary' as const
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  // Don't show if everything is normal and no admin controls
  if (!queueStatus.circuitBreakerOpen && queueStatus.queueLength === 0 && !queueStatus.isProcessing && !showAdminControls) {
    return null;
  }

  return (
    <Alert variant={config.variant} className={cn('mb-4', className)}>
      <Icon className={cn(
        'h-4 w-4',
        queueStatus.isProcessing && 'animate-spin'
      )} />
      <div className="flex items-center justify-between w-full">
        <div className="flex-1">
          <AlertDescription className="font-medium mb-1">
            {config.title}
          </AlertDescription>
          <AlertDescription className="text-sm opacity-90 mb-2">
            {config.message}
          </AlertDescription>
          
          {/* Progress bar for circuit breaker timeout */}
          {queueStatus.circuitBreakerOpen && timeRemaining > 0 && (
            <div className="mt-2">
              <Progress 
                value={((10 * 60 * 1000 - timeRemaining) / (10 * 60 * 1000)) * 100} 
                className="h-2"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Auto-reset in {Math.ceil(timeRemaining / 1000)}s
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={config.badgeVariant}>
            {config.badgeText}
          </Badge>
          
          {showAdminControls && (queueStatus.circuitBreakerOpen || queueStatus.queueLength > 0) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReset}
              className="h-8"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}