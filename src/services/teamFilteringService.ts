import { supabase } from '@/integrations/supabase/client';
import { Team } from '@/types/team';

export class TeamFilteringService {
  // Check if user can access a specific team's data
  static async canAccessTeamData(userId: string, teamId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .eq('is_active', true)
      .eq('status', 'active')
      .single();

    return !error && !!data;
  }

  // Get all teams accessible to a user
  static async getUserAccessibleTeams(userId: string): Promise<Team[]> {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        teams!inner(
          *,
          team_members(count)
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('status', 'active');

    if (error) throw error;
    
    return data?.map(item => ({
      ...item.teams,
      settings: typeof item.teams.settings === 'string' 
        ? JSON.parse(item.teams.settings) 
        : item.teams.settings || {}
    })).filter(Boolean) || [];
  }

  // Get filtered projects for a team
  static async getTeamProjects(teamId: string, filters?: {
    status?: string;
    industry?: string;
    projectType?: string;
    search?: string;
  }) {
    let query = supabase
      .from('projects')
      .select(`
        *,
        project_team_members(count),
        project_competitors(count),
        profiles!projects_created_by_fkey(full_name, avatar_url)
      `)
      .eq('team_id', teamId);

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.industry) {
      query = query.eq('industry', filters.industry);
    }
    if (filters?.projectType) {
      query = query.eq('project_type', filters.projectType);
    }
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Get filtered content for a team
  static async getTeamContent(teamId: string, filters?: {
    status?: string;
    contentType?: string;
    categoryId?: string;
    search?: string;
  }) {
    let query = supabase
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
        content_tags(tag),
        content_categories(name, color),
        profiles!content_items_user_id_fkey(full_name, avatar_url)
      `)
      .eq('team_id', teamId);

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.contentType) {
      query = query.eq('content_type', filters.contentType);
    }
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Get team-specific competitive intelligence
  static async getTeamCompetitiveIntelligence(teamId: string, filters?: {
    industryFilter?: string;
    threatLevel?: string;
    competitiveTier?: string;
    search?: string;
  }) {
    let query = supabase
      .from('project_competitors')
      .select(`
        *,
        projects!inner(
          id,
          name,
          team_id,
          industry
        ),
        competitor_analysis_metadata(
          status,
          confidence_score,
          completed_at,
          analysis_type
        ),
        competitor_serp_data(count),
        competitor_website_snapshots(count)
      `)
      .eq('projects.team_id', teamId);

    // Apply filters
    if (filters?.industryFilter) {
      query = query.eq('projects.industry', filters.industryFilter);
    }
    if (filters?.threatLevel) {
      query = query.eq('threat_level', filters.threatLevel);
    }
    if (filters?.competitiveTier) {
      query = query.eq('competitive_tier', filters.competitiveTier);
    }
    if (filters?.search) {
      query = query.or(`company_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Get team analytics summary
  static async getTeamAnalyticsSummary(teamId: string, dateRange?: { start: Date; end: Date }) {
    // Get project metrics for the team
    const { data: projectMetrics, error: projectError } = await supabase
      .from('project_analytics')
      .select(`
        *,
        projects!inner(team_id)
      `)
      .eq('projects.team_id', teamId)
      .gte('measurement_date', dateRange?.start?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('measurement_date', dateRange?.end?.toISOString() || new Date().toISOString());

    if (projectError) throw projectError;

    // Get content analytics for the team
    const { data: contentMetrics, error: contentError } = await supabase
      .from('content_analytics')
      .select(`
        *,
        content_items!inner(team_id)
      `)
      .eq('content_items.team_id', teamId)
      .gte('analytics_date', dateRange?.start?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('analytics_date', dateRange?.end?.toISOString() || new Date().toISOString());

    if (contentError) throw contentError;

    // Aggregate the metrics
    const aggregatedMetrics = {
      totalViews: contentMetrics?.reduce((sum, item) => sum + (item.views || 0), 0) || 0,
      totalEngagement: contentMetrics?.reduce((sum, item) => sum + (item.likes || 0) + (item.shares || 0) + (item.comments || 0), 0) || 0,
      averagePerformanceScore: contentMetrics?.length ? 
        contentMetrics.reduce((sum, item) => sum + (item.performance_score || 0), 0) / contentMetrics.length : 0,
      projectMetricsCount: projectMetrics?.length || 0,
      contentMetricsCount: contentMetrics?.length || 0,
    };

    return {
      aggregatedMetrics,
      projectMetrics: projectMetrics || [],
      contentMetrics: contentMetrics || [],
    };
  }

  // Get team activity feed
  static async getTeamActivityFeed(teamId: string, limit: number = 20, offset: number = 0) {
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        profiles!activity_logs_user_id_fkey(full_name, avatar_url)
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  // Check user permissions within a team
  static async getUserTeamPermissions(userId: string, teamId: string) {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        *,
        user_roles(
          slug,
          hierarchy_level,
          name,
          description
        )
      `)
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .eq('is_active', true)
      .eq('status', 'active')
      .single();

    if (error) throw error;

    const hierarchyLevel = data?.user_roles?.hierarchy_level || 0;

    return {
      member: data,
      permissions: {
        canManage: hierarchyLevel >= 8, // owners and admins
        canManageProjects: hierarchyLevel >= 6, // managers and above
        canAnalyze: hierarchyLevel >= 5, // analysts and above
        canEdit: hierarchyLevel >= 4, // editors and above
        canView: hierarchyLevel >= 1, // all members
        canInvite: hierarchyLevel >= 6, // managers and above
        canExport: hierarchyLevel >= 5, // analysts and above
      },
    };
  }

  // Switch team context with validation
  static async switchTeamContext(userId: string, newTeamId: string): Promise<boolean> {
    // Verify user has access to the new team
    const hasAccess = await this.canAccessTeamData(userId, newTeamId);
    
    if (!hasAccess) {
      throw new Error('You do not have access to this team');
    }

    // Log the team switch activity
    await supabase
      .from('activity_logs')
      .insert({
        team_id: newTeamId,
        user_id: userId,
        activity_type: 'system_event',
        action: 'team_switched',
        description: 'User switched team context',
        metadata: { previous_team_context: 'switched' },
      });

    return true;
  }
}