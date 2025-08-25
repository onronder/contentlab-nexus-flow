import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeamContext } from '@/contexts/TeamContext';
import { useAuth } from '@/hooks/useAuth';

// Team-aware project queries
export function useTeamProjects() {
  const { currentTeam } = useTeamContext();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team-projects', currentTeam?.id],
    queryFn: async () => {
      if (!user || !currentTeam) return [];

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_team_members:project_team_members(count),
          project_competitors:project_competitors(count)
        `)
        .eq('team_id', currentTeam.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!currentTeam,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Team-aware content queries
export function useTeamContent() {
  const { currentTeam } = useTeamContext();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team-content', currentTeam?.id],
    queryFn: async () => {
      if (!user || !currentTeam) return [];

      const { data, error } = await supabase
        .from('content_items')
        .select(`
          *,
          content_analytics(
            views,
            likes,
            shares,
            comments,
            performance_score
          ),
          content_tags(tag)
        `)
        .eq('team_id', currentTeam.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!currentTeam,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

// Team-aware competitive intelligence
export function useTeamCompetitors() {
  const { currentTeam } = useTeamContext();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team-competitors', currentTeam?.id],
    queryFn: async () => {
      if (!user || !currentTeam) return [];

      const { data, error } = await supabase
        .from('project_competitors')
        .select(`
          *,
          projects!inner(
            id,
            name,
            team_id
          ),
          competitor_analysis_metadata(
            status,
            confidence_score,
            completed_at
          )
        `)
        .eq('projects.team_id', currentTeam.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!currentTeam,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Team-aware analytics data
export function useTeamAnalytics() {
  const { currentTeam } = useTeamContext();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team-analytics', currentTeam?.id],
    queryFn: async () => {
      if (!user || !currentTeam) return null;

      // Get project analytics for team projects
      const { data: projectAnalytics, error: projectError } = await supabase
        .from('project_analytics')
        .select(`
          *,
          projects!inner(team_id)
        `)
        .eq('projects.team_id', currentTeam.id);

      if (projectError) throw projectError;

      // Get content analytics for team content
      const { data: contentAnalytics, error: contentError } = await supabase
        .from('content_analytics')
        .select(`
          *,
          content_items!inner(team_id)
        `)
        .eq('content_items.team_id', currentTeam.id);

      if (contentError) throw contentError;

      // Get team activity
      const { data: teamActivity, error: activityError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('team_id', currentTeam.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (activityError) throw activityError;

      return {
        projectAnalytics: projectAnalytics || [],
        contentAnalytics: contentAnalytics || [],
        teamActivity: teamActivity || [],
      };
    },
    enabled: !!user && !!currentTeam,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Team member permissions check
export function useTeamPermissions() {
  const { currentTeam } = useTeamContext();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team-permissions', currentTeam?.id, user?.id],
    queryFn: async () => {
      if (!user || !currentTeam) return null;

      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          user_roles(
            slug,
            hierarchy_level,
            name
          )
        `)
        .eq('team_id', currentTeam.id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('status', 'active')
        .single();

      if (error) throw error;

      const canManage = data?.user_roles?.hierarchy_level >= 6; // managers and above
      const canAnalyze = data?.user_roles?.hierarchy_level >= 5; // analysts and above
      const canEdit = data?.user_roles?.hierarchy_level >= 4; // editors and above

      return {
        member: data,
        permissions: {
          canManage,
          canAnalyze,
          canEdit,
          canView: true, // all team members can view
        },
      };
    },
    enabled: !!user && !!currentTeam,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Filtered dashboard stats based on current team
export function useTeamDashboardStats() {
  const { currentTeam } = useTeamContext();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team-dashboard-stats', currentTeam?.id],
    queryFn: async () => {
      if (!user || !currentTeam) {
        // Return default stats when no team is selected
        return {
          totalProjects: 0,
          activeProjects: 0,
          totalContent: 0,
          publishedContent: 0,
          totalCompetitors: 0,
          recentActivity: [],
        };
      }

      try {
        // Get team project count and stats
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('id, status, created_at')
          .eq('team_id', currentTeam.id);

        if (projectsError) throw projectsError;

        // Get team content count and stats
        const { data: content, error: contentError } = await supabase
          .from('content_items')
          .select('id, status, created_at')
          .eq('team_id', currentTeam.id);

        if (contentError) throw contentError;

        // Get team competitors count
        const { data: competitors, error: competitorsError } = await supabase
          .from('project_competitors')
          .select(`
            id,
            projects!inner(team_id)
          `)
          .eq('projects.team_id', currentTeam.id);

        if (competitorsError) throw competitorsError;

        // Get recent team activity
        const { data: recentActivity, error: activityError } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('team_id', currentTeam.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (activityError) throw activityError;

        return {
          totalProjects: projects?.length || 0,
          activeProjects: projects?.filter(p => p.status === 'active').length || 0,
          totalContent: content?.length || 0,
          publishedContent: content?.filter(c => c.status === 'published').length || 0,
          totalCompetitors: competitors?.length || 0,
          recentActivity: recentActivity || [],
        };
      } catch (error) {
        console.warn('Error fetching team dashboard stats:', error);
        // Return default stats on error
        return {
          totalProjects: 0,
          activeProjects: 0,
          totalContent: 0,
          publishedContent: 0,
          totalCompetitors: 0,
          recentActivity: [],
        };
      }
    },
    enabled: !!user, // Only require user, not team (so we can show default stats)
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}