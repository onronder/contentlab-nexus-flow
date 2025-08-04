import { useQuery } from '@tanstack/react-query';
import { ContentService } from '@/services/contentService';
import { useTeamContext } from '@/contexts/TeamContext';
import { ContentFilters } from '@/types/content';

/**
 * Team-aware content queries that automatically filter by current team context
 */

const contentService = ContentService.getInstance();

export function useTeamContent(projectId: string, filters?: ContentFilters) {
  const { currentTeam } = useTeamContext();

  return useQuery({
    queryKey: ['content', 'team', projectId, currentTeam?.id, filters],
    queryFn: () => contentService.getContentByProject(projectId, filters, currentTeam?.id),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useTeamContentStats(projectId: string) {
  const { data: content = [], isLoading } = useTeamContent(projectId);

  const stats = {
    total: content.length,
    draft: content.filter(c => c.status === 'draft').length,
    under_review: content.filter(c => c.status === 'under_review').length,
    published: content.filter(c => c.status === 'published').length,
    scheduled: content.filter(c => c.status === 'scheduled').length,
    archived: content.filter(c => c.status === 'archived').length,
    rejected: content.filter(c => c.status === 'rejected').length,
    // Content types
    blog_post: content.filter(c => c.content_type === 'blog_post').length,
    video: content.filter(c => c.content_type === 'video').length,
    image: content.filter(c => c.content_type === 'image').length,
    document: content.filter(c => c.content_type === 'document').length,
    social: content.filter(c => c.content_type === 'social').length,
    // Workflow statuses
    created: content.filter(c => c.workflow_status === 'created').length,
    inProgress: content.filter(c => c.workflow_status === 'in_progress').length,
    reviewRequested: content.filter(c => c.workflow_status === 'review_requested').length,
    approved: content.filter(c => c.workflow_status === 'approved').length,
    changesRequested: content.filter(c => c.workflow_status === 'changes_requested').length,
    workflowPublished: content.filter(c => c.workflow_status === 'published').length,
  };

  return {
    stats,
    content,
    isLoading,
  };
}

export function useTeamContentByStatus(projectId: string, status: string) {
  const { data: content = [], isLoading } = useTeamContent(projectId, {
    status: status as any
  });

  return {
    content,
    isLoading,
    count: content.length,
  };
}

export function useTeamContentByType(projectId: string, contentType: string) {
  const { data: content = [], isLoading } = useTeamContent(projectId, {
    content_type: contentType as any
  });

  return {
    content,
    isLoading,
    count: content.length,
  };
}

export function useTeamContentByWorkflow(projectId: string, workflowStatus: string) {
  const { data: content = [], isLoading } = useTeamContent(projectId, {
    workflow_status: workflowStatus as any
  });

  return {
    content,
    isLoading,
    count: content.length,
  };
}

export function useTeamContentSearch(projectId: string, searchTerm: string) {
  const { data: allContent = [], isLoading } = useTeamContent(projectId);

  const filteredContent = searchTerm
    ? allContent.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.content_tags?.some(tag => tag.tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : allContent;

  return {
    content: filteredContent,
    isLoading,
    count: filteredContent.length,
  };
}

export function useTeamContentAnalytics(projectId: string) {
  const { data: content = [], isLoading } = useTeamContent(projectId);

  // Calculate aggregated analytics across team content
  const analytics = content.reduce((acc, item) => {
    const latest = item.content_analytics?.[0]; // Most recent analytics
    if (latest) {
      acc.totalViews += latest.views || 0;
      acc.totalLikes += latest.likes || 0;
      acc.totalShares += latest.shares || 0;
      acc.totalComments += latest.comments || 0;
      acc.totalDownloads += latest.downloads || 0;
      acc.totalImpressions += latest.impressions || 0;
    }
    return acc;
  }, {
    totalViews: 0,
    totalLikes: 0,
    totalShares: 0,
    totalComments: 0,
    totalDownloads: 0,
    totalImpressions: 0,
  });

  const engagementRate = analytics.totalImpressions > 0 
    ? ((analytics.totalLikes + analytics.totalShares + analytics.totalComments) / analytics.totalImpressions) * 100
    : 0;

  return {
    analytics: {
      ...analytics,
      engagementRate,
      averagePerformance: content.length > 0 ? analytics.totalViews / content.length : 0,
    },
    isLoading,
  };
}