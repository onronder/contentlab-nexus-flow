import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUserId } from './useCurrentUserId';
import { contentService, analyticsService, tagsService, categoriesService } from '@/services/contentService';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

// Content queries
export const useContentItems = (projectId: string) => {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['content-items', projectId],
    queryFn: () => contentService.getContentItems(projectId),
    enabled: !!projectId && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Real-time subscription
  useEffect(() => {
    if (!projectId || !userId) return;

    const channel = supabase
      .channel('content-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_items',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['content-items', projectId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, userId, queryClient]);

  return query;
};

export const useContentItem = (id: string) => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['content-item', id],
    queryFn: () => contentService.getContentItem(id),
    enabled: !!id && !!userId,
  });
};

export const useSearchContent = (projectId: string, query: string) => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['search-content', projectId, query],
    queryFn: () => contentService.searchContent(projectId, query),
    enabled: !!projectId && !!query && query.length > 2 && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useFilteredContent = (
  projectId: string,
  filters: {
    content_type?: string;
    status?: string;
    category_id?: string;
    user_id?: string;
  }
) => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['filtered-content', projectId, filters],
    queryFn: () => contentService.filterContent(projectId, filters),
    enabled: !!projectId && !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

// Analytics queries
export const useContentAnalytics = (contentId: string) => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['content-analytics', contentId],
    queryFn: () => analyticsService.getContentAnalytics(contentId),
    enabled: !!contentId && !!userId,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
};

// Tags queries
export const useContentTags = (contentId: string) => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['content-tags', contentId],
    queryFn: () => tagsService.getContentTags(contentId),
    enabled: !!contentId && !!userId,
  });
};

export const usePopularTags = () => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['popular-tags'],
    queryFn: () => tagsService.getPopularTags(),
    enabled: !!userId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Categories queries
export const useContentCategories = () => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['content-categories'],
    queryFn: () => categoriesService.getCategories(),
    enabled: !!userId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

// Content mutations
export const useCreateContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contentService.createContentItem,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content-items', data.project_id] });
      queryClient.setQueryData(['content-item', data.id], data);
    },
  });
};

export const useUpdateContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      contentService.updateContentItem(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content-items', data.project_id] });
      queryClient.setQueryData(['content-item', data.id], data);
    },
  });
};

export const useDeleteContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contentService.deleteContentItem,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
      queryClient.removeQueries({ queryKey: ['content-item', id] });
    },
  });
};

// Analytics mutations
export const useUpdateAnalytics = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentId, analytics }: { contentId: string; analytics: any }) =>
      analyticsService.updateAnalytics(contentId, analytics),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content-analytics', data.content_id] });
    },
  });
};

// Tags mutations
export const useAddTags = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentId, tags }: { contentId: string; tags: string[] }) =>
      tagsService.addTags(contentId, tags),
    onSuccess: (_, { contentId }) => {
      queryClient.invalidateQueries({ queryKey: ['content-tags', contentId] });
      queryClient.invalidateQueries({ queryKey: ['popular-tags'] });
    },
  });
};

export const useRemoveTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentId, tag }: { contentId: string; tag: string }) =>
      tagsService.removeTag(contentId, tag),
    onSuccess: (_, { contentId }) => {
      queryClient.invalidateQueries({ queryKey: ['content-tags', contentId] });
      queryClient.invalidateQueries({ queryKey: ['popular-tags'] });
    },
  });
};