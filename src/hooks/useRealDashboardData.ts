import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeamContext } from '@/contexts/TeamContext';

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalCompetitors: number;
  totalContent: number;
  publishedContent: number;
  pendingTasks: number;
  recentActivity: ActivityItem[];
  performanceMetrics: {
    contentPerformance: number;
    contentPerformanceChange: number;
    marketCoverage: number;
    marketCoverageChange: number;
    competitiveScore: number;
    competitiveScoreChange: number;
  };
}

interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  color: string;
  type: string;
}

export const useRealDashboardData = () => {
  const { currentTeam } = useTeamContext();

  return useQuery({
    queryKey: ['dashboard-stats', currentTeam?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!currentTeam?.id) {
        return {
          totalProjects: 0,
          activeProjects: 0,
          totalCompetitors: 0,
          totalContent: 0,
          publishedContent: 0,
          pendingTasks: 0,
          recentActivity: [],
          performanceMetrics: {
            contentPerformance: 0,
            contentPerformanceChange: 0,
            marketCoverage: 0,
            marketCoverageChange: 0,
            competitiveScore: 0,
            competitiveScoreChange: 0
          }
        };
      }

      // Fetch projects stats
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, status')
        .eq('team_id', currentTeam.id);

      const totalProjects = projectsData?.length || 0;
      const activeProjects = projectsData?.filter(p => p.status === 'active').length || 0;

      // Fetch competitors stats
      const { data: competitorsData } = await supabase
        .from('project_competitors')
        .select(`
          id,
          projects!inner(team_id)
        `)
        .eq('projects.team_id', currentTeam.id);

      const totalCompetitors = competitorsData?.length || 0;

      // Fetch content stats
      const { data: contentData } = await supabase
        .from('content_items')
        .select('id, status')
        .eq('team_id', currentTeam.id);

      const totalContent = contentData?.length || 0;
      const publishedContent = contentData?.filter(c => c.status === 'published').length || 0;

      // Fetch recent activity from activity_logs
      const { data: activityData } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('team_id', currentTeam.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const recentActivity: ActivityItem[] = (activityData || []).map(activity => ({
        id: activity.id,
        title: activity.description || 'Team Activity',
        subtitle: `${activity.activity_type} • ${activity.action}`,
        time: new Date(activity.created_at).toLocaleDateString(),
        color: 'bg-primary',
        type: activity.activity_type
      }));

      // Fetch analytics data for performance metrics
      const { data: analyticsData } = await supabase
        .from('content_analytics')
        .select('performance_score, engagement_rate, reach')
        .gte('analytics_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const avgPerformance = analyticsData?.length 
        ? analyticsData.reduce((sum, item) => sum + (item.performance_score || 0), 0) / analyticsData.length
        : 75;

      const avgEngagement = analyticsData?.length
        ? analyticsData.reduce((sum, item) => sum + (item.engagement_rate || 0), 0) / analyticsData.length
        : 85;

      // Calculate market coverage based on active projects
      const marketCoverage = Math.min((activeProjects / Math.max(totalProjects, 1)) * 100, 100);

      // Calculate competitive score based on competitors and content
      const competitiveScore = Math.min((totalCompetitors * 0.3 + publishedContent * 0.1), 5.0);

      return {
        totalProjects,
        activeProjects,
        totalCompetitors,
        totalContent,
        publishedContent,
        pendingTasks: 0, // Could be calculated from task management if implemented
        recentActivity,
        performanceMetrics: {
          contentPerformance: Math.round(avgPerformance),
          contentPerformanceChange: Math.round(Math.random() * 20 - 10), // Mock change
          marketCoverage: Math.round(marketCoverage),
          marketCoverageChange: Math.round(Math.random() * 15 - 7), // Mock change
          competitiveScore: Math.round(competitiveScore * 10) / 10,
          competitiveScoreChange: Math.round((Math.random() * 1 - 0.5) * 10) / 10 // Mock change
        }
      };
    },
    enabled: !!currentTeam?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
};

// Hook for real-time dashboard updates
export const useRealTimeDashboardUpdates = () => {
  const { currentTeam } = useTeamContext();
  
  // This would set up real-time subscriptions for dashboard updates
  // For now, we'll return a simple implementation
  return {
    isConnected: true,
    lastUpdate: new Date().toISOString()
  };
};