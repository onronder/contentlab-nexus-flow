import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useCancelAnalysis } from '@/hooks/useAnalysisMutations';
import { useApiHealth } from '@/hooks/useApiHealth';
import { useCircuitBreakerStatus } from '@/hooks/useCircuitBreakerStatus';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Loader2, 
  X, 
  TrendingUp,
  Zap,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EnhancedAnalysisProgressProps {
  analysisId: string;
  competitorName: string;
  analysisType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  createdAt: string;
  estimatedCompletionTime?: number;
  onCancel?: () => void;
  onRetry?: () => void;
}

export function EnhancedAnalysisProgress({
  analysisId,
  competitorName,
  analysisType,
  status,
  progress = 0,
  createdAt,
  estimatedCompletionTime,
  onCancel,
  onRetry
}: EnhancedAnalysisProgressProps) {
  const { toast } = useToast();
  const { isOperational, getStatusText, estimatedWaitTime } = useApiHealth();
  const { queueLength, isCircuitBreakerOpen } = useCircuitBreakerStatus();
  const cancelMutation = useCancelAnalysis();
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    if (!onCancel) return;
    
    setIsCancelling(true);
    try {
      await cancelMutation.mutateAsync({ analysisId });
      onCancel();
    } catch (error) {
      toast({
        title: "Cancellation Failed",
        description: "Unable to cancel the analysis. It may have already completed.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'cancelled':
        return <X className="h-4 w-4 text-gray-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEstimatedTimeRemaining = () => {
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      return null;
    }

    if (estimatedCompletionTime) {
      const remaining = estimatedCompletionTime - Date.now();
      if (remaining > 0) {
        return Math.ceil(remaining / 1000);
      }
    }

    // Fallback estimate based on queue position and API status
    if (status === 'pending' && queueLength > 0) {
      return estimatedWaitTime / 1000 + 30; // 30s for processing
    }

    if (status === 'processing') {
      return 30; // Average processing time
    }

    return null;
  };

  const timeRemaining = getEstimatedTimeRemaining();

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-sm">{competitorName}</CardTitle>
              <CardDescription className="text-xs">
                {analysisType.replace('_', ' ').toUpperCase()} Analysis
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`${getStatusColor()} font-medium`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {(status === 'pending' || status === 'processing') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress 
              value={progress} 
              className="h-2"
              // Add animation for pending/processing states
              style={status === 'processing' ? { 
                background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary-foreground)) 100%)' 
              } : undefined}
            />
          </div>
        )}

        {/* Time Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Started</div>
            <div className="font-mono text-xs">
              {formatDistanceToNow(new Date(createdAt))} ago
            </div>
          </div>
          {timeRemaining && (
            <div>
              <div className="text-muted-foreground">Est. Remaining</div>
              <div className="font-mono text-xs">
                {timeRemaining > 60 
                  ? `${Math.ceil(timeRemaining / 60)}m` 
                  : `${Math.ceil(timeRemaining)}s`
                }
              </div>
            </div>
          )}
        </div>

        {/* API Status Indicators */}
        {(status === 'pending' || status === 'processing') && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-3 w-3" />
                <span className="font-medium">API Status</span>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Service Status</span>
                <Badge 
                  variant={isOperational ? "default" : "destructive"}
                  className="text-xs"
                >
                  {getStatusText()}
                </Badge>
              </div>
              
              {queueLength > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Queue Position</span>
                  <span className="font-mono">{queueLength} ahead</span>
                </div>
              )}

              {isCircuitBreakerOpen && (
                <div className="flex items-center gap-2 text-xs text-warning">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Service temporarily unavailable - will retry automatically</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          {(status === 'pending' || status === 'processing') && onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isCancelling}
              className="text-xs"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </>
              )}
            </Button>
          )}
          
          {status === 'failed' && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="text-xs"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Retry Analysis
            </Button>
          )}

          {status === 'completed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast({
                  title: "Analysis Complete",
                  description: `${competitorName} analysis has been completed successfully.`,
                });
              }}
              className="text-xs"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              View Results
            </Button>
          )}
        </div>

        {/* Error Details for Failed Status */}
        {status === 'failed' && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Analysis Failed</span>
            </div>
            <p className="text-xs text-muted-foreground">
              The analysis could not be completed. This may be due to API rate limits, 
              service unavailability, or invalid competitor data.
            </p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="mt-2 text-xs"
              >
                Try Again
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}