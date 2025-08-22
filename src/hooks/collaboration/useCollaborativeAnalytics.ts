import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeamContext } from '@/contexts/TeamContext';

interface CollaborationMetric {
  userId: string;
  userName: string;
  role: string;
  contributionScore: number;
  commentsCount: number;
  versionsCreated: number;
  reviewsCompleted: number;
  responseTime: number;
  qualityRating: number;
  lastActive: Date;
}

interface TeamProductivityData {
  date: string;
  contentCreated: number;
  reviewsCompleted: number;
  collaborationEvents: number;
  issuesResolved: number;
}

interface ContentImpactMetric {
  contentId: string;
  title: string;
  contributors: number;
  versions: number;
  comments: number;
  viewCount: number;
  engagementScore: number;
  businessValue: number;
}

interface WorkflowEfficiencyData {
  stageName: string;
  averageTime: number;
  bottleneckCount: number;
  successRate: number;
}

export const useCollaborativeAnalytics = (teamId: string, dateRange: { start: Date; end: Date }) => {
  const { currentTeam } = useTeamContext();

  const collaborationMetricsQuery = useQuery({
    queryKey: ['collaboration-metrics', teamId, dateRange],
    queryFn: async (): Promise<CollaborationMetric[]> => {
      if (!currentTeam?.id) return [];

      // Get team members with their activity
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select(`
          user_id,
          profiles!inner(full_name, email),
          user_roles!inner(name),
          created_at,
          is_active
        `)
        .eq('team_id', currentTeam.id)
        .eq('is_active', true);

      if (!teamMembers) return [];

      const metrics: CollaborationMetric[] = [];

      for (const member of teamMembers) {
        // Get comments count
        const { count: commentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('author_id', member.user_id)
          .eq('team_id', currentTeam.id)
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());

        // Get content created (versions)
        const { count: versionsCreated } = await supabase
          .from('content_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', member.user_id)
          .eq('team_id', currentTeam.id)
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());

        // Calculate contribution score based on activity
        const baseScore = 50;
        const commentScore = Math.min((commentsCount || 0) * 2, 30);
        const versionScore = Math.min((versionsCreated || 0) * 5, 40);
        const contributionScore = Math.min(baseScore + commentScore + versionScore, 100);

        // Get recent activity for response time calculation
        const { data: recentActivity } = await supabase
          .from('activity_logs')
          .select('created_at')
          .eq('user_id', member.user_id)
          .eq('team_id', currentTeam.id)
          .gte('created_at', dateRange.start.toISOString())
          .order('created_at', { ascending: false })
          .limit(10);

        // Calculate average response time (hours between activities)
        let responseTime = 24; // Default 24 hours
        if (recentActivity && recentActivity.length > 1) {
          const timeDiffs = [];
          for (let i = 0; i < recentActivity.length - 1; i++) {
            const diff = new Date(recentActivity[i].created_at).getTime() - 
                        new Date(recentActivity[i + 1].created_at).getTime();
            timeDiffs.push(diff / (1000 * 60 * 60)); // Convert to hours
          }
          responseTime = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
        }

        metrics.push({
          userId: member.user_id,
          userName: member.profiles.full_name || member.profiles.email,
          role: member.user_roles.name,
          contributionScore,
          commentsCount: commentsCount || 0,
          versionsCreated: versionsCreated || 0,
          reviewsCompleted: Math.floor((commentsCount || 0) * 0.6), // Estimate based on comments
          responseTime: Math.round(responseTime * 10) / 10,
          qualityRating: Math.min(4.0 + (contributionScore / 100), 5.0),
          lastActive: recentActivity?.[0] ? new Date(recentActivity[0].created_at) : new Date()
        });
      }

      return metrics;
    },
    enabled: !!teamId && !!currentTeam?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const productivityDataQuery = useQuery({
    queryKey: ['team-productivity', teamId, dateRange],
    queryFn: async (): Promise<TeamProductivityData[]> => {
      if (!currentTeam?.id) return [];

      const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
      const productivityData: TeamProductivityData[] = [];

      for (let i = 0; i < Math.min(days, 30); i++) {
        const currentDate = new Date(dateRange.start);
        currentDate.setDate(currentDate.getDate() + i);
        const nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 1);

        // Get content created on this day
        const { count: contentCreated } = await supabase
          .from('content_items')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', currentTeam.id)
          .gte('created_at', currentDate.toISOString().split('T')[0])
          .lt('created_at', nextDate.toISOString().split('T')[0]);

        // Get comments (reviews) on this day
        const { count: reviewsCompleted } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', currentTeam.id)
          .gte('created_at', currentDate.toISOString().split('T')[0])
          .lt('created_at', nextDate.toISOString().split('T')[0]);

        // Get collaboration events (activity logs)
        const { count: collaborationEvents } = await supabase
          .from('activity_logs')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', currentTeam.id)
          .in('activity_type', ['collaboration', 'content_management', 'team_management'])
          .gte('created_at', currentDate.toISOString().split('T')[0])
          .lt('created_at', nextDate.toISOString().split('T')[0]);

        productivityData.push({
          date: currentDate.toISOString().split('T')[0],
          contentCreated: contentCreated || 0,
          reviewsCompleted: reviewsCompleted || 0,
          collaborationEvents: collaborationEvents || 0,
          issuesResolved: Math.floor((collaborationEvents || 0) * 0.3) // Estimate
        });
      }

      return productivityData;
    },
    enabled: !!teamId && !!currentTeam?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const contentImpactQuery = useQuery({
    queryKey: ['content-impact', teamId, dateRange],
    queryFn: async (): Promise<ContentImpactMetric[]> => {
      if (!currentTeam?.id) return [];

      const { data: contentItems } = await supabase
        .from('content_items')
        .select(`
          id,
          title,
          created_at,
          content_analytics(views, engagement_rate, performance_score)
        `)
        .eq('team_id', currentTeam.id)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .limit(10);

      if (!contentItems) return [];

      const contentImpact: ContentImpactMetric[] = [];

      for (const item of contentItems) {
        // Get comments count
        const { count: comments } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('resource_id', item.id)
          .eq('resource_type', 'content');

        // Get unique contributors (users who commented or modified)
        const { data: contributors } = await supabase
          .from('comments')
          .select('author_id')
          .eq('resource_id', item.id)
          .eq('resource_type', 'content');

        const uniqueContributors = new Set(contributors?.map(c => c.author_id) || []).size;

        // Calculate metrics from analytics
        const analytics = item.content_analytics?.[0];
        const viewCount = analytics?.views || 0;
        const engagementScore = Math.round(analytics?.engagement_rate || 0);
        const businessValue = Math.round(analytics?.performance_score || 0);

        contentImpact.push({
          contentId: item.id,
          title: item.title,
          contributors: Math.max(uniqueContributors, 1),
          versions: 1, // Could be enhanced with version tracking
          comments: comments || 0,
          viewCount,
          engagementScore,
          businessValue
        });
      }

      return contentImpact;
    },
    enabled: !!teamId && !!currentTeam?.id,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  const workflowEfficiencyQuery = useQuery({
    queryKey: ['workflow-efficiency', teamId],
    queryFn: async (): Promise<WorkflowEfficiencyData[]> => {
      if (!currentTeam?.id) return [];

      // Get content workflow data
      const { data: contentItems } = await supabase
        .from('content_items')
        .select('workflow_status, created_at, published_at, reviewed_at')
        .eq('team_id', currentTeam.id)
        .not('published_at', 'is', null);

      if (!contentItems || contentItems.length === 0) {
        return [
          { stageName: 'Content Creation', averageTime: 0, bottleneckCount: 0, successRate: 100 },
          { stageName: 'Review Process', averageTime: 0, bottleneckCount: 0, successRate: 100 },
          { stageName: 'Final Approval', averageTime: 0, bottleneckCount: 0, successRate: 100 },
          { stageName: 'Publication', averageTime: 0, bottleneckCount: 0, successRate: 100 }
        ];
      }

      // Calculate average times and success rates
      const reviewTimes = contentItems
        .filter(item => item.reviewed_at && item.created_at)
        .map(item => {
          const created = new Date(item.created_at).getTime();
          const reviewed = new Date(item.reviewed_at!).getTime();
          return (reviewed - created) / (1000 * 60 * 60 * 24); // Days
        });

      const publishTimes = contentItems
        .filter(item => item.published_at && item.reviewed_at)
        .map(item => {
          const reviewed = new Date(item.reviewed_at!).getTime();
          const published = new Date(item.published_at!).getTime();
          return (published - reviewed) / (1000 * 60 * 60 * 24); // Days
        });

      const avgReviewTime = reviewTimes.length > 0 
        ? reviewTimes.reduce((sum, time) => sum + time, 0) / reviewTimes.length 
        : 0;

      const avgPublishTime = publishTimes.length > 0
        ? publishTimes.reduce((sum, time) => sum + time, 0) / publishTimes.length
        : 0;

      return [
        {
          stageName: 'Content Creation',
          averageTime: 1.5, // Estimated
          bottleneckCount: Math.floor(contentItems.length * 0.1),
          successRate: Math.round((contentItems.filter(i => i.reviewed_at).length / contentItems.length) * 100)
        },
        {
          stageName: 'Review Process',
          averageTime: avgReviewTime,
          bottleneckCount: Math.floor(reviewTimes.filter(t => t > 3).length),
          successRate: Math.round((reviewTimes.length / contentItems.length) * 100)
        },
        {
          stageName: 'Final Approval',
          averageTime: avgPublishTime,
          bottleneckCount: Math.floor(publishTimes.filter(t => t > 1).length),
          successRate: Math.round((publishTimes.length / contentItems.length) * 100)
        },
        {
          stageName: 'Publication',
          averageTime: 0.5, // Estimated
          bottleneckCount: 0,
          successRate: 100
        }
      ];
    },
    enabled: !!teamId && !!currentTeam?.id,
    staleTime: 20 * 60 * 1000, // 20 minutes
  });

  return {
    collaborationMetrics: collaborationMetricsQuery.data || [],
    productivityData: productivityDataQuery.data || [],
    contentImpact: contentImpactQuery.data || [],
    workflowEfficiency: workflowEfficiencyQuery.data || [],
    isLoading: collaborationMetricsQuery.isLoading || productivityDataQuery.isLoading || 
              contentImpactQuery.isLoading || workflowEfficiencyQuery.isLoading,
    error: collaborationMetricsQuery.error || productivityDataQuery.error || 
           contentImpactQuery.error || workflowEfficiencyQuery.error
  };
};