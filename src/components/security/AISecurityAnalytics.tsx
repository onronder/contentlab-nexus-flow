import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Brain, TrendingUp, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface AIUsageAnalytics {
  id: string;
  model_used: string;
  tokens_used: number;
  cost_estimate: number;
  endpoint: string;
  operation_type: string;
  processing_time_ms: number;
  success: boolean;
  created_at: string;
}

interface AIJobQueue {
  id: string;
  job_type: string;
  status: string;
  priority: number;
  progress_percent: number;
  created_at: string;
  completed_at?: string;
}

export function AISecurityAnalytics() {
  const { toast } = useToast();

  // Fetch AI usage analytics for the last 7 days
  const { data: aiUsage, isLoading: usageLoading } = useQuery({
    queryKey: ['ai-usage-analytics-security'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_usage_analytics')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data as AIUsageAnalytics[];
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch AI job queue status
  const { data: jobQueue, isLoading: queueLoading } = useQuery({
    queryKey: ['ai-job-queue-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_job_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (error) throw error;
      return data as AIJobQueue[];
    },
    refetchInterval: 30000
  });

  // Calculate analytics
  const analytics = aiUsage ? {
    totalRequests: aiUsage.length,
    successRate: (aiUsage.filter(u => u.success).length / aiUsage.length) * 100,
    totalCost: aiUsage.reduce((sum, u) => sum + (u.cost_estimate || 0), 0),
    totalTokens: aiUsage.reduce((sum, u) => sum + u.tokens_used, 0),
    avgProcessingTime: aiUsage.reduce((sum, u) => sum + u.processing_time_ms, 0) / aiUsage.length,
    failedRequests: aiUsage.filter(u => !u.success).length,
    topEndpoints: Object.entries(
      aiUsage.reduce((acc, u) => {
        acc[u.endpoint] = (acc[u.endpoint] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).sort(([,a], [,b]) => b - a).slice(0, 3)
  } : null;

  const queueStats = jobQueue ? {
    totalJobs: jobQueue.length,
    pendingJobs: jobQueue.filter(j => j.status === 'pending').length,
    processingJobs: jobQueue.filter(j => j.status === 'processing').length,
    completedJobs: jobQueue.filter(j => j.status === 'completed').length,
    failedJobs: jobQueue.filter(j => j.status === 'failed').length
  } : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'secondary';
      case 'processing': return 'default';
      case 'pending': return 'outline';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const handleProcessJobs = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-job-processor', {
        body: { action: 'process' }
      });

      if (error) throw error;

      toast({
        title: data.processed ? "Job Processed" : "No Jobs Available",
        description: data.processed 
          ? `Processed job ${data.jobId} in ${data.processingTime}ms`
          : "No pending AI jobs in the queue",
      });
    } catch (error) {
      toast({
        title: "Job Processing Failed",
        description: "Unable to process AI jobs. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (usageLoading || queueLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2 mt-2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Usage Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Requests</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalRequests || 0}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.successRate ? `${analytics.successRate.toFixed(1)}%` : '0%'}
            </div>
            <Progress value={analytics?.successRate || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics?.totalCost?.toFixed(4) || '0.0000'}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics?.totalTokens?.toLocaleString() || 0} tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.avgProcessingTime ? `${Math.round(analytics.avgProcessingTime)}ms` : '0ms'}
            </div>
            <p className="text-xs text-muted-foreground">Processing time</p>
          </CardContent>
        </Card>
      </div>

      {/* Job Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle>AI Job Queue Status</CardTitle>
          <CardDescription>
            Monitor asynchronous AI processing jobs and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 mb-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="text-center">
              <div className="text-2xl font-bold">{queueStats?.totalJobs || 0}</div>
              <p className="text-xs text-muted-foreground">Total Jobs</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{queueStats?.pendingJobs || 0}</div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{queueStats?.processingJobs || 0}</div>
              <p className="text-xs text-muted-foreground">Processing</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{queueStats?.completedJobs || 0}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{queueStats?.failedJobs || 0}</div>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <Button onClick={handleProcessJobs} size="sm">
              Process Next Job
            </Button>
          </div>

          {/* Recent Jobs */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Recent Jobs</h4>
            {jobQueue?.slice(0, 5).map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                    <span className="text-sm font-medium">{job.job_type}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Priority: {job.priority} • 
                    Progress: {job.progress_percent}% • 
                    {new Date(job.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
            
            {(!jobQueue || jobQueue.length === 0) && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No jobs in queue
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Failed Requests Alert */}
      {analytics && analytics.failedRequests > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Failed AI Requests Detected
            </CardTitle>
            <CardDescription>
              {analytics.failedRequests} AI requests have failed in the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Monitor the error patterns and consider investigating potential issues with API keys, 
              rate limiting, or input validation.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Top Endpoints */}
      {analytics && analytics.topEndpoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Used AI Endpoints</CardTitle>
            <CardDescription>
              AI services with the highest usage in the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.topEndpoints.map(([endpoint, count], index) => (
                <div key={endpoint} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{endpoint}</span>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">{count} requests</div>
                    <Badge variant="outline">#{index + 1}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}