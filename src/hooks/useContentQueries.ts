import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUserId } from './useCurrentUserId';
import { ContentService } from '@/services/contentService';
import { ContentFilters } from '@/types/content';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

const contentService = ContentService.getInstance();

// Content queries
export const useContentItems = (projectId: string) => {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['content-items', projectId],
    queryFn: async () => {
      try {
        return await contentService.getContentByProject(projectId);
      } catch (error: any) {
        // Handle network timeouts and retries
        if (error?.code === 'PGRST301' || error?.message?.includes('timeout')) {
          throw new Error('Request timeout - please try again');
        }
        throw error;
      }
    },
    enabled: !!projectId && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on client errors except timeouts
      if (error?.status >= 400 && error?.status < 500 && !error?.message?.includes('timeout')) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // Real-time subscription with throttling
  useEffect(() => {
    if (!projectId || !userId) return;

    let timeoutId: NodeJS.Timeout;
    
    const handleChange = () => {
      // Throttle invalidations to prevent excessive refetches
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['content-items', projectId] });
      }, 1000);
    };

    const channel = supabase
      .channel(`content-items-changes-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_items',
          filter: `project_id=eq.${projectId}`
        },
        handleChange
      )
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [projectId, userId, queryClient]);

  return query;
};

export const useContentItem = (id: string) => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['content-item', id],
    queryFn: () => contentService.getContent(id),
    enabled: !!id && !!userId,
  });
};

export const useSearchContent = (projectId: string, query: string) => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['search-content', projectId, query],
    queryFn: () => contentService.searchContent(query, { project_id: projectId } as ContentFilters),
    enabled: !!projectId && !!query && query.length > 2 && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useFilteredContent = (
  projectId: string,
  filters: ContentFilters
) => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['filtered-content', projectId, filters],
    queryFn: () => contentService.getContentByProject(projectId, filters),
    enabled: !!projectId && !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

// Analytics queries
export const useContentAnalytics = (contentId: string) => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['content-analytics', contentId],
    queryFn: () => contentService.getAnalytics(contentId),
    enabled: !!contentId && !!userId,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
};

// Tags queries
export const useContentTags = (contentId: string) => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['content-tags', contentId],
    queryFn: async () => {
      const content = await contentService.getContent(contentId);
      return content.content_tags || [];
    },
    enabled: !!contentId && !!userId,
  });
};

export const usePopularTags = () => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['popular-tags'],
    queryFn: () => contentService.getPopularTags(),
    enabled: !!userId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Categories queries
export const useContentCategories = () => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['content-categories'],
    queryFn: async () => {
      // Since categories aren't in ContentService yet, return empty array
      return [];
    },
    enabled: !!userId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

// Content mutations
export const useCreateContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contentService.createContent.bind(contentService),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['content-items', data?.project_id] });
      queryClient.setQueryData(['content-item', data?.id], data);
    },
  });
};

export const useUpdateContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      contentService.updateContent(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content-items', data.project_id] });
      queryClient.setQueryData(['content-item', data.id], data);
    },
  });
};

export const useDeleteContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contentService.deleteContent.bind(contentService),
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
      contentService.updateAnalytics(contentId, analytics),
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
      contentService.addTags(contentId, tags),
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
      contentService.removeTag(contentId, tag),
    onSuccess: (_, { contentId }) => {
      queryClient.invalidateQueries({ queryKey: ['content-tags', contentId] });
      queryClient.invalidateQueries({ queryKey: ['popular-tags'] });
    },
  });
};