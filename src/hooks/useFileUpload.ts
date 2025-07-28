import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUserId } from './useCurrentUserId';
import { useToast } from './use-toast';
import { 
  FileUploadService, 
  UploadProgress, 
  UploadResult, 
  UploadParams 
} from '@/services/fileUploadService';
import { supabase } from '@/integrations/supabase/client';

interface FileUploadOptions {
  onSuccess?: (data: UploadResult[]) => void;
  onError?: (error: any) => void;
}

interface UploadFileParams {
  file: File;
  projectId: string;
  contentType: string;
  title?: string;
  description?: string;
}

interface UploadMultipleFilesParams {
  files: File[];
  projectId: string;
  contentType: string;
}

export const useFileUpload = (options: FileUploadOptions = {}) => {
  const { toast } = useToast();
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());
  const [isUploading, setIsUploading] = useState(false);

  const { onSuccess, onError } = options;

  const fileUploadService = FileUploadService.getInstance();

  // Single file upload mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (params: UploadFileParams) => {
      if (!userId) throw new Error('User not authenticated');

      setIsUploading(true);
      
      const result = await fileUploadService.uploadFile({
        ...params,
        userId,
        onProgress: (progress) => {
          setUploadProgress(prev => new Map(prev.set(progress.contentId, progress)));
        }
      });

      return [result]; // Return as array for consistency
    },
    onSuccess: (data) => {
      setIsUploading(false);
      setUploadProgress(new Map());
      queryClient.invalidateQueries({ queryKey: ['content'] });
      toast({
        title: "Upload successful",
        description: `File uploaded successfully`,
      });
      onSuccess?.(data);
    },
    onError: (error: any) => {
      setIsUploading(false);
      setUploadProgress(new Map());
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
      onError?.(error);
    }
  });

  // Multiple files upload mutation
  const uploadMultipleFilesMutation = useMutation({
    mutationFn: async (params: UploadMultipleFilesParams) => {
      if (!userId) throw new Error('User not authenticated');

      setIsUploading(true);
      
      const results = await fileUploadService.uploadMultipleFiles(
        params.files,
        userId,
        params.projectId,
        params.contentType,
        (overallProgress, fileProgresses) => {
          const progressMap = new Map();
          fileProgresses.forEach(fp => {
            progressMap.set(fp.contentId, fp);
          });
          setUploadProgress(progressMap);
        }
      );

      return results;
    },
    onSuccess: (data) => {
      setIsUploading(false);
      setUploadProgress(new Map());
      queryClient.invalidateQueries({ queryKey: ['content'] });
      toast({
        title: "Upload successful",
        description: `${data.length} file(s) uploaded successfully`,
      });
      onSuccess?.(data);
    },
    onError: (error: any) => {
      setIsUploading(false);
      setUploadProgress(new Map());
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      });
      onError?.(error);
    }
  });

  // Legacy mutation for backwards compatibility
  const uploadMutation = useMutation({
    mutationFn: async ({
      files,
      projectId,
      contentType,
    }: {
      files: File[];
      projectId: string;
      contentType: string;
    }) => {
      if (!userId) throw new Error('User not authenticated');

      if (files.length === 1) {
        return uploadFileMutation.mutateAsync({
          file: files[0],
          projectId,
          contentType
        });
      } else {
        return uploadMultipleFilesMutation.mutateAsync({
          files,
          projectId,
          contentType
        });
      }
    }
  });

  const validateFiles = (files: File[], contentType: string): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      try {
        // This will throw if validation fails
        fileUploadService['validateFile'](file, contentType as any);
        valid.push(file);
      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Validation failed'}`);
      }
    });

    return { valid, errors };
  };

  const cancelUpload = async (uploadId: string) => {
    await fileUploadService.cancelUpload(uploadId);
    setUploadProgress(prev => {
      const newMap = new Map(prev);
      newMap.delete(uploadId);
      return newMap;
    });
  };

  return {
    // New enhanced methods
    uploadFile: uploadFileMutation.mutate,
    uploadMultipleFiles: uploadMultipleFilesMutation.mutate,
    
    // Legacy method for backwards compatibility
    uploadFiles: uploadMutation.mutate,
    
    // State and utilities
    isUploading: isUploading || uploadFileMutation.isPending || uploadMultipleFilesMutation.isPending,
    uploadProgress,
    validateFiles,
    cancelUpload,
    error: uploadFileMutation.error || uploadMultipleFilesMutation.error,
    reset: () => {
      uploadFileMutation.reset();
      uploadMultipleFilesMutation.reset();
      setUploadProgress(new Map());
    }
  };
};

// Hook for getting file URLs from Supabase Storage
export const useFileUrl = () => {
  return {
    getFileUrl: (bucket: string, path: string) => {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    },
    getContentFileUrl: (path: string) => {
      const { data } = supabase.storage.from('content-files').getPublicUrl(path);
      return data.publicUrl;
    },
    getThumbnailUrl: (path: string) => {
      const { data } = supabase.storage.from('content-thumbnails').getPublicUrl(path);
      return data.publicUrl;
    }
  };
};