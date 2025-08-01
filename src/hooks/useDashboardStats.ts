import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from './useCurrentUserId';

export interface DashboardStats {
  activeProjects: number;
  competitorsTracked: number;
  teamMembers: number;
  contentItems: number;
  projectsChange: number;
  competitorsChange: number;
  teamMembersChange: number;
  contentItemsChange: number;
}

const fetchDashboardStats = async (userId: string): Promise<DashboardStats> => {
  // Get current date and last month date for comparison
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  
  // Fetch active projects count
  const { data: currentProjects, error: projectsError } = await supabase
    .from('projects')
    .select('id, created_at')
    .eq('created_by', userId)
    .eq('status', 'active');

  if (projectsError) throw projectsError;

  const { data: lastMonthProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('created_by', userId)
    .eq('status', 'active')
    .lte('created_at', lastMonth.toISOString());

  // Fetch competitors count
  const { data: currentCompetitors, error: competitorsError } = await supabase
    .from('project_competitors')
    .select('id, created_at, project_id')
    .in('project_id', currentProjects?.map(p => p.id) || []);

  if (competitorsError) throw competitorsError;

  const { data: lastMonthCompetitors } = await supabase
    .from('project_competitors')
    .select('id')
    .in('project_id', lastMonthProjects?.map(p => p.id) || [])
    .lte('created_at', lastMonth.toISOString());

  // Fetch team members count (unique across all user's projects)
  const { data: currentTeamMembers, error: teamError } = await supabase
    .from('project_team_members')
    .select('user_id, project_id, created_at')
    .in('project_id', currentProjects?.map(p => p.id) || [])
    .eq('invitation_status', 'active');

  if (teamError) throw teamError;

  const uniqueTeamMembers = new Set(currentTeamMembers?.map(tm => tm.user_id) || []).size;

  const { data: lastMonthTeamMembers } = await supabase
    .from('project_team_members')
    .select('user_id')
    .in('project_id', lastMonthProjects?.map(p => p.id) || [])
    .eq('invitation_status', 'active')
    .lte('created_at', lastMonth.toISOString());

  const lastMonthUniqueTeamMembers = new Set(lastMonthTeamMembers?.map(tm => tm.user_id) || []).size;

  // Fetch content items count
  const { data: currentContent, error: contentError } = await supabase
    .from('content_items')
    .select('id, created_at')
    .eq('user_id', userId)
    .neq('status', 'archived');

  if (contentError) throw contentError;

  const { data: lastMonthContent } = await supabase
    .from('content_items')
    .select('id')
    .eq('user_id', userId)
    .neq('status', 'archived')
    .lte('created_at', lastMonth.toISOString());

  // Calculate changes
  const activeProjects = currentProjects?.length || 0;
  const competitorsTracked = currentCompetitors?.length || 0;
  const contentItems = currentContent?.length || 0;

  const lastMonthProjectsCount = lastMonthProjects?.length || 0;
  const lastMonthCompetitorsCount = lastMonthCompetitors?.length || 0;
  const lastMonthContentCount = lastMonthContent?.length || 0;

  const projectsChange = lastMonthProjectsCount > 0 
    ? Math.round(((activeProjects - lastMonthProjectsCount) / lastMonthProjectsCount) * 100)
    : activeProjects > 0 ? 100 : 0;

  const competitorsChange = lastMonthCompetitorsCount > 0
    ? Math.round(((competitorsTracked - lastMonthCompetitorsCount) / lastMonthCompetitorsCount) * 100)
    : competitorsTracked > 0 ? 100 : 0;

  const teamMembersChange = lastMonthUniqueTeamMembers > 0
    ? Math.round(((uniqueTeamMembers - lastMonthUniqueTeamMembers) / lastMonthUniqueTeamMembers) * 100)
    : uniqueTeamMembers > 0 ? 100 : 0;

  const contentItemsChange = lastMonthContentCount > 0
    ? Math.round(((contentItems - lastMonthContentCount) / lastMonthContentCount) * 100)
    : contentItems > 0 ? 100 : 0;

  return {
    activeProjects,
    competitorsTracked,
    teamMembers: uniqueTeamMembers,
    contentItems,
    projectsChange,
    competitorsChange,
    teamMembersChange,
    contentItemsChange
  };
};

export const useDashboardStats = () => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['dashboard-stats', userId],
    queryFn: () => fetchDashboardStats(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};