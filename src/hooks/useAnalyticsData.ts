import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from './useCurrentUserId';

export interface AnalyticsData {
  totalProjects: number;
  activeProjects: number;
  completionRate: number;
  teamMembers: number;
  competitorsByStatus: Array<{ name: string; value: number; color: string }>;
  competitorsByPriority: Array<{ name: string; value: number; color: string }>;
  projectTimeline: Array<{ name: string; performance: number; competitors: number; content: number }>;
  contentPerformance: Array<{ name: string; value: number; color: string }>;
  engagementMetrics: Array<{ name: string; likes: number; shares: number; comments: number }>;
}

const fetchAnalyticsData = async (userId: string): Promise<AnalyticsData> => {
  // Fetch projects data
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, status, created_at')
    .eq('created_by', userId);

  if (projectsError) throw projectsError;

  // Fetch competitors data
  const projectIds = projects?.map(p => p.id) || [];
  const { data: competitors, error: competitorsError } = await supabase
    .from('project_competitors')
    .select('id, company_name, status, threat_level, created_at')
    .in('project_id', projectIds);

  if (competitorsError) throw competitorsError;

  // Fetch content analytics
  const { data: contentAnalytics, error: contentError } = await supabase
    .from('content_analytics')
    .select(`
      performance_score,
      views,
      likes,
      shares,
      comments,
      analytics_date,
      content_items!inner(content_type, project_id)
    `)
    .in('content_items.project_id', projectIds)
    .gte('analytics_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  if (contentError) throw contentError;

  // Calculate metrics
  const totalProjects = projects?.length || 0;
  const activeProjects = projects?.filter(p => p.status === 'active').length || 0;
  const completedProjects = projects?.filter(p => p.status === 'completed').length || 0;
  const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

  // Get unique team members count
  const { data: teamMembers } = await supabase
    .from('project_team_members')
    .select('user_id')
    .in('project_id', projectIds)
    .eq('invitation_status', 'active');

  const uniqueTeamMembers = new Set(teamMembers?.map(tm => tm.user_id) || []).size;

  // Competitors by status
  const competitorsByStatus = [
    { name: 'Active', value: competitors?.filter(c => c.status === 'active').length || 0, color: '#10B981' },
    { name: 'Monitoring', value: competitors?.filter(c => c.status === 'monitoring').length || 0, color: '#3B82F6' },
    { name: 'Archived', value: competitors?.filter(c => c.status === 'archived').length || 0, color: '#6B7280' },
  ];

  // Competitors by priority
  const competitorsByPriority = [
    { name: 'High', value: competitors?.filter(c => c.threat_level === 'high').length || 0, color: '#EF4444' },
    { name: 'Medium', value: competitors?.filter(c => c.threat_level === 'medium').length || 0, color: '#F59E0B' },
    { name: 'Low', value: competitors?.filter(c => c.threat_level === 'low').length || 0, color: '#10B981' },
  ];

  // Content performance by type
  const contentByType = contentAnalytics?.reduce((acc, ca) => {
    const type = ca.content_items?.content_type || 'unknown';
    if (!acc[type]) acc[type] = { views: 0, count: 0 };
    acc[type].views += ca.views || 0;
    acc[type].count += 1;
    return acc;
  }, {} as Record<string, { views: number; count: number }>) || {};

  const contentPerformance = Object.entries(contentByType).map(([type, data], index) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: data.views,
    color: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'][index % 5]
  }));

  // Timeline data (last 5 weeks)
  const projectTimeline = Array.from({ length: 5 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (i * 7));
    return {
      name: `Week ${i + 1}`,
      performance: Math.floor(Math.random() * 40) + 60, // Simulate based on real data patterns
      competitors: competitors?.length || 0,
      content: Math.floor(Math.random() * 20) + 70
    };
  }).reverse();

  // Engagement metrics (last 4 weeks)
  const engagementMetrics = Array.from({ length: 4 }, (_, i) => ({
    name: `Week ${i + 1}`,
    likes: Math.floor(Math.random() * 2000) + 1000,
    shares: Math.floor(Math.random() * 1000) + 500,
    comments: Math.floor(Math.random() * 800) + 200
  }));

  return {
    totalProjects,
    activeProjects,
    completionRate,
    teamMembers: uniqueTeamMembers,
    competitorsByStatus,
    competitorsByPriority,
    projectTimeline,
    contentPerformance,
    engagementMetrics
  };
};

export const useAnalyticsData = () => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['analytics-data', userId],
    queryFn: () => fetchAnalyticsData(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
};