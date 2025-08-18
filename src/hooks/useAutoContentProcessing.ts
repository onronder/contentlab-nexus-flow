import { useEffect } from 'react';
import { useCreateContent } from './useContentMutations';
import { useFileProcessing } from './useFileProcessing';

/**
 * Hook that automatically triggers file processing when content is created
 */
export const useAutoContentProcessing = () => {
  const { autoProcessContent } = useFileProcessing();

  // Enhanced create content that auto-triggers processing
  const enhanceCreateContent = (originalCreateContent: ReturnType<typeof useCreateContent>) => {
    return {
      ...originalCreateContent,
      mutate: (contentData: any, options?: any) => {
        originalCreateContent.mutate(contentData, {
          ...options,
          onSuccess: (createdContent: any) => {
            // Auto-trigger processing if file was uploaded
            if (createdContent.file_path && createdContent.mime_type) {
              // Small delay to ensure content is fully committed to database
              setTimeout(() => {
                autoProcessContent(createdContent.id, createdContent.mime_type);
              }, 500);
            }
            options?.onSuccess?.(createdContent);
          }
        });
      }
    };
  };

  return { enhanceCreateContent };
};