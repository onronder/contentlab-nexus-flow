import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface FileProcessingJob {
  id: string;
  content_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  job_type: 'document_processing' | 'thumbnail_generation' | 'content_analysis';
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  processing_metadata: Record<string, any>;
  result_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface ProcessingProgress {
  contentId: string;
  progress: number;
  status: string;
  message?: string;
}

export const useFileProcessing = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingProgress, setProcessingProgress] = useState<Map<string, ProcessingProgress>>(new Map());

  // Query to get processing jobs for user's content
  const { data: processingJobs, isLoading } = useQuery({
    queryKey: ['file-processing-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('file_processing_jobs')
        .select(`
          *,
          content_items (
            id,
            title,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    }
  });

  // Mutation to start file processing
  const startProcessingMutation = useMutation({
    mutationFn: async ({ 
      contentId, 
      jobType = 'document_processing' 
    }: { 
      contentId: string; 
      jobType?: FileProcessingJob['job_type'] 
    }) => {
      // Create processing job record
      const { data: job, error: jobError } = await supabase
        .from('file_processing_jobs')
        .insert({
          content_id: contentId,
          job_type: jobType,
          status: 'pending'
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Get content item details
      const { data: contentItem, error: contentError } = await supabase
        .from('content_items')
        .select('file_path, mime_type, title')
        .eq('id', contentId)
        .single();

      if (contentError) throw contentError;

      // Call document processor edge function
      if (jobType === 'document_processing' && contentItem.file_path) {
        const { error: processingError } = await supabase.functions.invoke('document-processor', {
          body: {
            contentId,
            filePath: contentItem.file_path,
            extractText: true,
            generateThumbnail: true,
            analyzeStructure: true
          }
        });

        if (processingError) {
          // Update job status to failed
          await supabase
            .from('file_processing_jobs')
            .update({ 
              status: 'failed', 
              error_message: processingError.message,
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id);
          
          throw processingError;
        }
      }

      return job;
    },
    onSuccess: (job) => {
      toast({
        title: "Processing started",
        description: `File processing initiated for job ${job.id}`,
      });
      queryClient.invalidateQueries({ queryKey: ['file-processing-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['content'] });
    },
    onError: (error: any) => {
      toast({
        title: "Processing failed",
        description: error.message || "Failed to start file processing",
        variant: "destructive",
      });
    }
  });

  // Mutation to trigger content analysis using OpenAI
  const analyzeContentMutation = useMutation({
    mutationFn: async ({ contentId }: { contentId: string }) => {
      const { data, error } = await supabase.functions.invoke('content-analyzer', {
        body: { contentId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Analysis started",
        description: "Content analysis has been initiated",
      });
      queryClient.invalidateQueries({ queryKey: ['content'] });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to start content analysis",
        variant: "destructive",
      });
    }
  });

  // Real-time subscription for processing job updates
  useEffect(() => {
    const channel = supabase
      .channel('file-processing-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'file_processing_jobs'
        },
        (payload) => {
          const job = payload.new as FileProcessingJob;
          
          setProcessingProgress(prev => {
            const newMap = new Map(prev);
            newMap.set(job.content_id, {
              contentId: job.content_id,
              progress: job.status === 'completed' ? 100 : job.status === 'failed' ? 0 : 50,
              status: job.status,
              message: job.error_message || 'Processing...'
            });
            return newMap;
          });

          // Show toast for completed/failed jobs
          if (job.status === 'completed') {
            toast({
              title: "Processing completed",
              description: "File has been processed successfully",
            });
          } else if (job.status === 'failed') {
            toast({
              title: "Processing failed",
              description: job.error_message || "File processing failed",
              variant: "destructive",
            });
          }

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['file-processing-jobs'] });
          queryClient.invalidateQueries({ queryKey: ['content'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast, queryClient]);

  // Auto-trigger processing for newly uploaded content
  const autoProcessContent = (contentId: string, mimeType: string) => {
    // Determine job type based on mime type
    let jobType: FileProcessingJob['job_type'] = 'document_processing';
    
    if (mimeType.startsWith('image/')) {
      jobType = 'thumbnail_generation';
    } else if (mimeType.includes('pdf') || mimeType.includes('document')) {
      jobType = 'document_processing';
    }

    // Start processing automatically
    startProcessingMutation.mutate({ contentId, jobType });
  };

  return {
    // Data
    processingJobs,
    processingProgress,
    isLoading,

    // Actions
    startProcessing: startProcessingMutation.mutate,
    analyzeContent: analyzeContentMutation.mutate,
    autoProcessContent,

    // State
    isStartingProcessing: startProcessingMutation.isPending,
    isAnalyzing: analyzeContentMutation.isPending
  };
};

export type { FileProcessingJob, ProcessingProgress };