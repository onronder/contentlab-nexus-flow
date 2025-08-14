import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { useCurrentUserId } from './useCurrentUserId';
import { 
  advancedFileProcessingService,
  BatchProcessingOptions,
  ProcessingJob,
  BatchUploadSession,
  DeduplicationResult,
  FileFolder
} from '@/services/advancedFileProcessingService';

export interface BatchUploadProgress {
  sessionId: string;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  status: string;
  currentFile?: string;
  overallProgress: number;
  estimatedTimeRemaining?: number;
}

export const useAdvancedFileManagement = () => {
  const { toast } = useToast();
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const [batchProgress, setBatchProgress] = useState<BatchUploadProgress | null>(null);

  // Batch Upload Mutation
  const batchUploadMutation = useMutation({
    mutationFn: async ({
      files,
      projectId,
      options = {}
    }: {
      files: File[];
      projectId: string;
      options?: BatchProcessingOptions;
    }) => {
      if (!userId) throw new Error('User not authenticated');

      // Create batch session
      const session = await advancedFileProcessingService.createBatchSession(
        projectId,
        userId,
        files,
        options
      );

      setBatchProgress({
        sessionId: session.id,
        totalFiles: session.totalFiles,
        processedFiles: 0,
        failedFiles: 0,
        status: 'processing',
        overallProgress: 0
      });

      // Process batch
      const results = await advancedFileProcessingService.processBatch(
        session.id,
        files,
        (updatedSession, fileProgress) => {
          setBatchProgress({
            sessionId: updatedSession.id,
            totalFiles: updatedSession.totalFiles,
            processedFiles: updatedSession.processedFiles,
            failedFiles: updatedSession.failedFiles,
            status: updatedSession.status,
            overallProgress: (updatedSession.processedFiles / updatedSession.totalFiles) * 100,
            estimatedTimeRemaining: undefined // Could calculate based on processing speed
          });
        }
      );

      setBatchProgress(null);
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      queryClient.invalidateQueries({ queryKey: ['batchSessions'] });
      toast({
        title: "Batch upload completed",
        description: `Successfully processed ${results.length} files`,
      });
    },
    onError: (error: any) => {
      setBatchProgress(null);
      toast({
        title: "Batch upload failed",
        description: error.message || "Failed to process files",
        variant: "destructive",
      });
    }
  });

  // Folder Management
  const createFolderMutation = useMutation({
    mutationFn: async ({
      name,
      projectId,
      parentId,
      teamId
    }: {
      name: string;
      projectId: string;
      parentId?: string;
      teamId?: string;
    }) => {
      if (!userId) throw new Error('User not authenticated');
      
      return advancedFileProcessingService.createFolder(
        name,
        projectId,
        userId,
        parentId,
        teamId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast({
        title: "Folder created",
        description: "New folder created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create folder",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Deduplication
  const mergeDuplicatesMutation = useMutation({
    mutationFn: async ({
      deduplicationId,
      keepOriginal = true
    }: {
      deduplicationId: string;
      keepOriginal?: boolean;
    }) => {
      return advancedFileProcessingService.mergeDuplicateFiles(deduplicationId, keepOriginal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      queryClient.invalidateQueries({ queryKey: ['duplicates'] });
      toast({
        title: "Duplicates merged",
        description: "Duplicate files have been successfully merged",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to merge duplicates",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // File Versioning
  const createVersionMutation = useMutation({
    mutationFn: async ({
      contentId,
      filePath,
      fileSize,
      contentHash,
      changeSummary
    }: {
      contentId: string;
      filePath: string;
      fileSize: number;
      contentHash: string;
      changeSummary?: string;
    }) => {
      return advancedFileProcessingService.createFileVersion(
        contentId,
        filePath,
        fileSize,
        contentHash,
        changeSummary,
        userId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileVersions'] });
      toast({
        title: "Version created",
        description: "New file version created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create version",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Queries
  const useFolderHierarchy = (projectId: string) => {
    return useQuery({
      queryKey: ['folders', projectId],
      queryFn: () => advancedFileProcessingService.getFolderHierarchy(projectId),
      enabled: !!projectId
    });
  };

  const useProcessingJobs = (status?: string) => {
    return useQuery({
      queryKey: ['processingJobs', status],
      queryFn: () => advancedFileProcessingService.getProcessingJobs(status),
      refetchInterval: 5000 // Refresh every 5 seconds
    });
  };

  const useFileVersions = (contentId: string) => {
    return useQuery({
      queryKey: ['fileVersions', contentId],
      queryFn: () => advancedFileProcessingService.getFileVersions(contentId),
      enabled: !!contentId
    });
  };

  // Processing Jobs
  const createProcessingJobMutation = useMutation({
    mutationFn: async ({
      contentId,
      jobType,
      inputData,
      priority = 0
    }: {
      contentId: string;
      jobType: ProcessingJob['jobType'];
      inputData: any;
      priority?: number;
    }) => {
      return advancedFileProcessingService.createProcessingJob(
        contentId,
        jobType,
        inputData,
        priority
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processingJobs'] });
      toast({
        title: "Processing job created",
        description: "File processing job has been queued",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create processing job",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Utility functions
  const cancelBatchUpload = useCallback(() => {
    if (batchProgress) {
      setBatchProgress(null);
      toast({
        title: "Upload cancelled",
        description: "Batch upload has been cancelled",
      });
    }
  }, [batchProgress, toast]);

  const resetBatchProgress = useCallback(() => {
    setBatchProgress(null);
  }, []);

  return {
    // Mutations
    batchUpload: batchUploadMutation.mutate,
    createFolder: createFolderMutation.mutate,
    mergeDuplicates: mergeDuplicatesMutation.mutate,
    createVersion: createVersionMutation.mutate,
    createProcessingJob: createProcessingJobMutation.mutate,

    // State
    isBatchUploading: batchUploadMutation.isPending,
    batchProgress,
    isCreatingFolder: createFolderMutation.isPending,
    isMergingDuplicates: mergeDuplicatesMutation.isPending,
    isCreatingVersion: createVersionMutation.isPending,

    // Queries
    useFolderHierarchy,
    useProcessingJobs,
    useFileVersions,

    // Utilities
    cancelBatchUpload,
    resetBatchProgress,

    // Errors
    batchUploadError: batchUploadMutation.error,
    folderError: createFolderMutation.error,
    duplicatesError: mergeDuplicatesMutation.error,
    versionError: createVersionMutation.error
  };
};