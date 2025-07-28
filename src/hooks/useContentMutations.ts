import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ContentService } from '@/services/contentService';
import { 
  ContentCreateInput, 
  ContentUpdateInput, 
  AnalyticsUpdateInput,
  EngagementType 
} from '@/types/content';
import { useToast } from '@/hooks/use-toast';

const contentService = ContentService.getInstance();

// ==================== CONTENT MUTATIONS ====================

export function useCreateContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: ContentCreateInput) => contentService.createContent(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      queryClient.invalidateQueries({ queryKey: ['content', 'list', data.project_id] });
      toast({
        title: 'Content created',
        description: `"${data.title}" has been created successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create content',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContentUpdateInput }) => 
      contentService.updateContent(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      queryClient.invalidateQueries({ queryKey: ['content', 'detail', data.id] });
      queryClient.invalidateQueries({ queryKey: ['content', 'list', data.project_id] });
      toast({
        title: 'Content updated',
        description: `"${data.title}" has been updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update content',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => contentService.deleteContent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      toast({
        title: 'Content deleted',
        description: 'Content has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete content',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}

export function useArchiveContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => contentService.archiveContent(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      queryClient.invalidateQueries({ queryKey: ['content', 'detail', data.id] });
      queryClient.invalidateQueries({ queryKey: ['content', 'list', data.project_id] });
      toast({
        title: 'Content archived',
        description: `"${data.title}" has been archived successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to archive content',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}

// ==================== BULK OPERATIONS ====================

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ contentIds, status }: { contentIds: string[]; status: string }) => 
      contentService.bulkUpdateStatus(contentIds, status as any),
    onSuccess: (_, { contentIds, status }) => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      toast({
        title: 'Content updated',
        description: `${contentIds.length} items updated to ${status}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update content',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}

export function useBulkDelete() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (contentIds: string[]) => contentService.bulkDelete(contentIds),
    onSuccess: (_, contentIds) => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      toast({
        title: 'Content deleted',
        description: `${contentIds.length} items deleted successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete content',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}

// ==================== TAG MUTATIONS ====================

export function useAddTags() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ contentId, tags }: { contentId: string; tags: string[] }) => 
      contentService.addTags(contentId, tags),
    onSuccess: (_, { contentId }) => {
      queryClient.invalidateQueries({ queryKey: ['content', 'detail', contentId] });
      queryClient.invalidateQueries({ queryKey: ['content', 'tags'] });
      queryClient.invalidateQueries({ queryKey: ['content'] });
      toast({
        title: 'Tags added',
        description: 'Tags have been added successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to add tags',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveTag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ contentId, tag }: { contentId: string; tag: string }) => 
      contentService.removeTag(contentId, tag),
    onSuccess: (_, { contentId }) => {
      queryClient.invalidateQueries({ queryKey: ['content', 'detail', contentId] });
      queryClient.invalidateQueries({ queryKey: ['content', 'tags'] });
      queryClient.invalidateQueries({ queryKey: ['content'] });
      toast({
        title: 'Tag removed',
        description: 'Tag has been removed successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to remove tag',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}

// ==================== ENGAGEMENT MUTATIONS ====================

export function useTrackEngagement() {
  return useMutation({
    mutationFn: ({ contentId, type }: { contentId: string; type: EngagementType }) => 
      contentService.trackEngagement(contentId, type),
    // Silent mutations for analytics - no toast notifications
    retry: 2,
  });
}

export function useTrackView() {
  return useMutation({
    mutationFn: (contentId: string) => contentService.trackView(contentId),
    // Silent mutations for analytics - no toast notifications
    retry: 2,
  });
}

// ==================== COMPOSITE HOOKS ====================

export function useContentMutations() {
  return {
    createContent: useCreateContent(),
    updateContent: useUpdateContent(),
    deleteContent: useDeleteContent(),
    archiveContent: useArchiveContent(),
    bulkUpdateStatus: useBulkUpdateStatus(),
    bulkDelete: useBulkDelete(),
    addTags: useAddTags(),
    removeTag: useRemoveTag(),
    trackEngagement: useTrackEngagement(),
    trackView: useTrackView(),
  };
}