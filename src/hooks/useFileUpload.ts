import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { storageService } from '@/services/contentService';
import { useCurrentUserId } from './useCurrentUserId';
import { useToast } from './use-toast';

interface FileUploadOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
}

interface UploadProgress {
  [key: string]: number;
}

export const useFileUpload = (options: FileUploadOptions = {}) => {
  const { toast } = useToast();
  const userId = useCurrentUserId();
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [isUploading, setIsUploading] = useState(false);

  const {
    maxFileSize = 100 * 1024 * 1024, // 100MB default
    allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ],
    onSuccess,
    onError
  } = options;

  const uploadMutation = useMutation({
    mutationFn: async ({
      files,
      projectId,
      contentType,
      generateThumbnail = true
    }: {
      files: File[];
      projectId: string;
      contentType: string;
      generateThumbnail?: boolean;
    }) => {
      if (!userId) throw new Error('User not authenticated');

      setIsUploading(true);
      const results = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileId = `${Date.now()}-${i}`;

        // Validate file
        if (file.size > maxFileSize) {
          throw new Error(`File ${file.name} is too large. Maximum size is ${maxFileSize / 1024 / 1024}MB`);
        }

        if (!allowedTypes.includes(file.type)) {
          throw new Error(`File type ${file.type} is not allowed`);
        }

        // Create file path: {user_id}/{project_id}/{content_id}/{filename}
        const contentId = crypto.randomUUID();
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `${userId}/${projectId}/${contentId}/${fileName}`;

        try {
          // Update progress
          setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

          // Upload main file
          const uploadResult = await storageService.uploadFile(file, filePath);
          
          setUploadProgress(prev => ({ ...prev, [fileId]: 50 }));

          let thumbnailPath = null;

          // Generate thumbnail for images
          if (generateThumbnail && file.type.startsWith('image/')) {
            try {
              const thumbnailBlob = await generateImageThumbnail(file);
              const thumbnailFileName = `thumb_${fileName}`;
              const thumbnailFilePath = `${userId}/${projectId}/${contentId}/${thumbnailFileName}`;
              
              const thumbnailFile = new File([thumbnailBlob], thumbnailFileName, { type: 'image/jpeg' });
              await storageService.uploadThumbnail(thumbnailFile, thumbnailFilePath);
              thumbnailPath = thumbnailFilePath;
            } catch (error) {
              console.warn('Failed to generate thumbnail:', error);
            }
          }

          setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

          results.push({
            contentId,
            fileName: file.name,
            filePath,
            thumbnailPath,
            fileSize: file.size,
            mimeType: file.type,
            uploadResult
          });

        } catch (error) {
          setUploadProgress(prev => ({ ...prev, [fileId]: -1 })); // Error state
          throw error;
        }
      }

      return results;
    },
    onSuccess: (data) => {
      setIsUploading(false);
      setUploadProgress({});
      toast({
        title: "Upload successful",
        description: `${data.length} file(s) uploaded successfully`,
      });
      onSuccess?.(data);
    },
    onError: (error: any) => {
      setIsUploading(false);
      setUploadProgress({});
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      });
      onError?.(error);
    }
  });

  // Helper function to generate image thumbnails
  const generateImageThumbnail = (file: File, maxWidth = 300, maxHeight = 300): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate thumbnail'));
            }
          },
          'image/jpeg',
          0.7 // 70% quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const validateFiles = (files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      if (file.size > maxFileSize) {
        errors.push(`${file.name}: File too large (max ${Math.round(maxFileSize / 1024 / 1024)}MB)`);
      } else if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: File type not allowed`);
      } else {
        valid.push(file);
      }
    });

    return { valid, errors };
  };

  return {
    uploadFiles: uploadMutation.mutate,
    isUploading: isUploading || uploadMutation.isPending,
    uploadProgress,
    validateFiles,
    error: uploadMutation.error,
    reset: uploadMutation.reset
  };
};

// Hook for getting file URLs
export const useFileUrl = () => {
  return {
    getFileUrl: (bucket: string, path: string) => storageService.getFileUrl(bucket, path),
    getContentFileUrl: (path: string) => storageService.getFileUrl('content-files', path),
    getThumbnailUrl: (path: string) => storageService.getFileUrl('content-thumbnails', path)
  };
};