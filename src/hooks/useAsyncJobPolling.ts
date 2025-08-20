import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AsyncJob {
  id: string;
  job_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress_percent: number;
  progress_message?: string;
  output_data?: any;
  error_data?: any;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface UseAsyncJobPollingOptions {
  jobId?: string;
  onComplete?: (job: AsyncJob) => void;
  onError?: (error: any) => void;
  pollInterval?: number;
  autoStop?: boolean;
}

export function useAsyncJobPolling(options: UseAsyncJobPollingOptions = {}) {
  const { jobId, onComplete, onError, pollInterval = 2000, autoStop = true } = options;
  const [job, setJob] = useState<AsyncJob | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchJob = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_job_queue')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return data as AsyncJob;
    } catch (err: any) {
      console.error('Error fetching job:', err);
      setError(err.message);
      onError?.(err);
      return null;
    }
  }, [onError]);

  const startPolling = useCallback((id: string) => {
    if (isPolling) return;
    
    setIsPolling(true);
    setError(null);

    const poll = async () => {
      const jobData = await fetchJob(id);
      if (!jobData) return;

      setJob(jobData);

      if (jobData.status === 'completed') {
        setIsPolling(false);
        onComplete?.(jobData);
        if (autoStop) {
          toast({
            title: 'Job Completed',
            description: `${jobData.job_type} has finished successfully.`,
          });
        }
      } else if (jobData.status === 'failed') {
        setIsPolling(false);
        onError?.(jobData.error_data);
        if (autoStop) {
          toast({
            title: 'Job Failed',
            description: `${jobData.job_type} encountered an error.`,
            variant: 'destructive',
          });
        }
      } else if (jobData.status === 'cancelled') {
        setIsPolling(false);
        if (autoStop) {
          toast({
            title: 'Job Cancelled',
            description: `${jobData.job_type} was cancelled.`,
            variant: 'destructive',
          });
        }
      }
    };

    // Initial poll
    poll();

    // Set up interval polling
    const interval = setInterval(poll, pollInterval);

    // Cleanup function
    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [fetchJob, isPolling, onComplete, onError, pollInterval, autoStop, toast]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  const cancelJob = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('ai_job_queue')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      setJob(prev => prev ? { ...prev, status: 'cancelled' } : null);
      setIsPolling(false);

      toast({
        title: 'Job Cancelled',
        description: 'The job has been cancelled successfully.',
      });
    } catch (err: any) {
      console.error('Error cancelling job:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to cancel the job.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Auto-start polling if jobId is provided
  useEffect(() => {
    if (jobId && !isPolling) {
      const cleanup = startPolling(jobId);
      return cleanup;
    }
  }, [jobId, startPolling, isPolling]);

  return {
    job,
    isPolling,
    error,
    startPolling,
    stopPolling,
    cancelJob,
    fetchJob,
  };
}

// Hook for managing multiple jobs
export function useAsyncJobQueue() {
  const [jobs, setJobs] = useState<AsyncJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUserJobs = useCallback(async (status?: string) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('ai_job_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      setJobs(data as AsyncJob[]);
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitJob = useCallback(async (jobType: string, inputData: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-job-processor', {
        body: {
          action: 'submit',
          jobType,
          inputData,
        },
      });

      if (error) throw error;

      // Refresh jobs list
      await fetchUserJobs();

      return data.jobId;
    } catch (err: any) {
      console.error('Error submitting job:', err);
      throw err;
    }
  }, [fetchUserJobs]);

  useEffect(() => {
    fetchUserJobs();
  }, [fetchUserJobs]);

  return {
    jobs,
    isLoading,
    fetchUserJobs,
    submitJob,
  };
}