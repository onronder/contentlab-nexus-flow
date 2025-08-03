import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from './useCurrentUserId';
import { logDatabaseError } from '@/utils/errorMonitoring';

export interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  type: 'project' | 'competitor' | 'team' | 'content' | 'analytics';
  icon: string;
  color: string;
  metadata?: any;
}

const fetchRecentActivity = async (userId: string): Promise<ActivityItem[]> => {
  try {
    // Simplified query that works with the new RLS policies
    const { data: activities, error } = await supabase
      .from('activity_logs')
      .select(`
        id,
        action,
        description,
        activity_type,
        created_at,
        metadata,
        user_id,
        project_id,
        team_id
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      logDatabaseError(error, 'fetchRecentActivity', { userId });
      return [];
    }

    return activities?.map(activity => transformActivityToItem(activity)) || [];
  } catch (error) {
    logDatabaseError(error as Error, 'fetchRecentActivity', { userId });
    return [];
  }
};

// Remove this function as it's no longer needed with the simplified query

const transformActivityToItem = (activity: any): ActivityItem => {
  const timeAgo = getTimeAgo(new Date(activity.created_at));
  
  // Map activity types to icons and colors
  const typeMapping = {
    'project_created': { icon: 'Building2', color: 'bg-primary', type: 'project' as const },
    'project_updated': { icon: 'Building2', color: 'bg-success', type: 'project' as const },
    'competitor_added': { icon: 'Target', color: 'bg-primary', type: 'competitor' as const },
    'competitor_updated': { icon: 'Target', color: 'bg-warning', type: 'competitor' as const },
    'team_member_added': { icon: 'Users', color: 'bg-secondary', type: 'team' as const },
    'team_member_invited': { icon: 'Users', color: 'bg-secondary', type: 'team' as const },
    'content_created': { icon: 'FileText', color: 'bg-success', type: 'content' as const },
    'content_published': { icon: 'FileText', color: 'bg-primary', type: 'content' as const },
    'analysis_completed': { icon: 'BarChart3', color: 'bg-warning', type: 'analytics' as const },
    'default': { icon: 'Activity', color: 'bg-muted', type: 'project' as const }
  };

  const mapping = typeMapping[activity.action as keyof typeof typeMapping] || typeMapping.default;

  return {
    id: activity.id,
    title: activity.description || `${activity.action.replace(/_/g, ' ')} activity`,
    subtitle: activity.metadata?.entity_name || 'System activity',
    time: timeAgo,
    type: mapping.type,
    icon: mapping.icon,
    color: mapping.color,
    metadata: activity.metadata
  };
};

const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }
};

export const useRecentActivity = () => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['recent-activity', userId],
    queryFn: () => fetchRecentActivity(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on RLS policy errors
      if (error?.message?.includes('permission denied') || 
          error?.message?.includes('policy')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};