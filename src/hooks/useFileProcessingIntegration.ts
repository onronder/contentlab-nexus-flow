import { useEffect } from 'react';
import { useFileProcessing } from './useFileProcessing';
import { useCreateContent } from './useContentMutations';

/**
 * Integration hook that connects file upload with processing pipeline
 */
export const useFileProcessingIntegration = () => {
  const { autoProcessContent } = useFileProcessing();

  // Hook into content creation to auto-trigger processing
  const enhanceCreateContent = (originalMutate: any) => {
    return (contentData: any) => {
      // Call original create content mutation
      originalMutate(contentData, {
        onSuccess: (createdContent: any) => {
          // Auto-trigger processing if file was uploaded
          if (createdContent.file_path && createdContent.mime_type) {
            setTimeout(() => {
              autoProcessContent(createdContent.id, createdContent.mime_type);
            }, 1000); // Small delay to ensure content is fully created
          }
        }
      });
    };
  };

  return {
    enhanceCreateContent
  };
};

/**
 * Enhanced file upload hook that automatically triggers processing
 */
export const useEnhancedFileUpload = (options: any = {}) => {
  const { autoProcessContent } = useFileProcessing();
  const originalCreateContent = useCreateContent();

  // Enhanced version that auto-triggers processing
  const createContentWithProcessing = {
    ...originalCreateContent,
    mutate: (contentData: any) => {
      originalCreateContent.mutate(contentData, {
        onSuccess: (createdContent: any) => {
          // Auto-trigger processing for uploaded files
          if (createdContent.file_path && createdContent.mime_type) {
            autoProcessContent(createdContent.id, createdContent.mime_type);
          }
          options.onSuccess?.(createdContent);
        },
        onError: options.onError
      });
    }
  };

  return {
    createContent: createContentWithProcessing,
    ...useFileProcessing()
  };
};