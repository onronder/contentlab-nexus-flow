import { useAsyncJobPolling, AsyncJob } from '@/hooks/useAsyncJobPolling';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Clock, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface JobProgressTrackerProps {
  jobId: string;
  onComplete?: (job: AsyncJob) => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

export function JobProgressTracker({ 
  jobId, 
  onComplete, 
  onCancel,
  showCancel = true 
}: JobProgressTrackerProps) {
  const { job, isPolling, cancelJob } = useAsyncJobPolling({
    jobId,
    onComplete,
  });

  if (!job) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Loading job details...</span>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    switch (job.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <X className="h-4 w-4 text-gray-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const handleCancel = async () => {
    await cancelJob(jobId);
    onCancel?.();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            {job.job_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge variant="outline" className={getStatusColor()}>
              {job.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {(job.status === 'processing' || job.status === 'pending') && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{job.progress_percent}%</span>
            </div>
            <Progress value={job.progress_percent} className="h-2" />
          </div>
        )}

        {/* Progress Message */}
        {job.progress_message && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            {job.progress_message}
          </div>
        )}

        {/* Error Details */}
        {job.status === 'failed' && job.error_data && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="font-medium mb-1">Error Details:</div>
            <div className="text-xs opacity-90">
              {typeof job.error_data === 'string' 
                ? job.error_data 
                : job.error_data.message || 'An unknown error occurred'
              }
            </div>
          </div>
        )}

        {/* Success Message */}
        {job.status === 'completed' && (
          <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="font-medium">Job completed successfully!</div>
            {job.output_data?.summary && (
              <div className="text-xs mt-1 opacity-90">{job.output_data.summary}</div>
            )}
          </div>
        )}

        {/* Timing Information */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Started {formatDistanceToNow(new Date(job.created_at))} ago</span>
          {job.status !== 'pending' && (
            <span>Last updated {formatDistanceToNow(new Date(job.updated_at))} ago</span>
          )}
        </div>

        {/* Actions */}
        {showCancel && (job.status === 'pending' || job.status === 'processing') && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Cancel Job
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}