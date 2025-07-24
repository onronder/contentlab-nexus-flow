import { supabase } from '@/integrations/supabase/client';

// Analytics data interfaces
export interface ProjectAnalyticsData {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  teamMembers: number;
  averageDuration: number;
  completionRate: number;
  teamProductivity: number;
  successScore: number;
  projectsByStatus: Array<{ status: string; count: number; percentage: number }>;
  projectsByPriority: Array<{ priority: string; count: number; percentage: number }>;
  projectsByIndustry: Array<{ industry: string; count: number; percentage: number }>;
  projectTimeline: Array<{
    id: string;
    name: string;
    startDate: Date | null;
    endDate: Date | null;
    status: string;
    progress: number;
  }>;
  trendsData: Array<{
    date: string;
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
  }>;
  lastUpdated: Date;
}

export interface AnalyticsError {
  code: string;
  message: string;
  details?: any;
}

class AnalyticsService {
  private async executeQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    errorContext: string
  ): Promise<T> {
    try {
      const { data, error } = await queryFn();
      
      if (error) {
        console.error(`Analytics error in ${errorContext}:`, error);
        throw new AnalyticsServiceError(
          'QUERY_ERROR',
          `Failed to fetch ${errorContext}: ${error.message}`,
          error
        );
      }
      
      if (!data) {
        throw new AnalyticsServiceError(
          'NO_DATA',
          `No data returned for ${errorContext}`,
          null
        );
      }
      
      return data;
    } catch (error) {
      if (error instanceof AnalyticsServiceError) {
        throw error;
      }
      
      console.error(`Unexpected error in ${errorContext}:`, error);
      throw new AnalyticsServiceError(
        'UNEXPECTED_ERROR',
        `Unexpected error in ${errorContext}`,
        error
      );
    }
  }

  async fetchProjectCounts(userId: string): Promise<{
    total: number;
    active: number;
    completed: number;
    planning: number;
    paused: number;
    archived: number;
  }> {
    return this.executeQuery(async () => {
      // Get projects the user owns or is a member of
      const { data: userProjects, error } = await supabase
        .from('projects')
        .select(`
          id,
          status,
          created_by,
          project_team_members!inner(user_id, invitation_status)
        `)
        .or(`created_by.eq.${userId},project_team_members.user_id.eq.${userId}`)
        .eq('project_team_members.invitation_status', 'active');

      if (error) return { data: null, error };

      // Deduplicate projects (user might be both owner and member)
      const uniqueProjects = Array.from(
        new Map(userProjects.map(p => [p.id, p])).values()
      );

      const counts = {
        total: uniqueProjects.length,
        active: uniqueProjects.filter(p => p.status === 'active').length,
        completed: uniqueProjects.filter(p => p.status === 'completed').length,
        planning: uniqueProjects.filter(p => p.status === 'planning').length,
        paused: uniqueProjects.filter(p => p.status === 'paused').length,
        archived: uniqueProjects.filter(p => p.status === 'archived').length,
      };

      return { data: counts, error: null };
    }, 'project counts');
  }

  async fetchTeamMemberCount(userId: string): Promise<number> {
    return this.executeQuery(async () => {
      // Get unique team members across all user's projects
      const { data, error } = await supabase
        .from('project_team_members')
        .select(`
          user_id,
          project_id,
          projects!inner(created_by)
        `)
        .or(`projects.created_by.eq.${userId}`)
        .eq('invitation_status', 'active');

      if (error) return { data: null, error };

      // Count unique team members
      const uniqueMembers = new Set(data.map(member => member.user_id));
      return { data: uniqueMembers.size, error: null };
    }, 'team member count');
  }

  async fetchProjectDurations(userId: string): Promise<number> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          start_date,
          actual_end_date,
          target_end_date,
          status,
          created_by,
          project_team_members!inner(user_id, invitation_status)
        `)
        .or(`created_by.eq.${userId},project_team_members.user_id.eq.${userId}`)
        .eq('project_team_members.invitation_status', 'active')
        .not('start_date', 'is', null);

      if (error) return { data: null, error };

      // Calculate durations for completed projects or current duration for active projects
      const durations = data
        .map(project => {
          if (!project.start_date) return null;
          
          const startDate = new Date(project.start_date);
          const endDate = project.actual_end_date 
            ? new Date(project.actual_end_date)
            : project.status === 'completed' && project.target_end_date
            ? new Date(project.target_end_date)
            : new Date(); // Use current date for active projects

          const durationMs = endDate.getTime() - startDate.getTime();
          return durationMs / (1000 * 60 * 60 * 24); // Convert to days
        })
        .filter((duration): duration is number => duration !== null && duration > 0);

      const averageDuration = durations.length > 0 
        ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
        : 0;

      return { data: Math.round(averageDuration), error: null };
    }, 'project durations');
  }

  async fetchProjectsByStatus(userId: string): Promise<Array<{ status: string; count: number; percentage: number }>> {
    const counts = await this.fetchProjectCounts(userId);
    const total = counts.total;
    
    if (total === 0) {
      return [];
    }

    return [
      { status: 'Active', count: counts.active, percentage: Math.round((counts.active / total) * 100) },
      { status: 'Completed', count: counts.completed, percentage: Math.round((counts.completed / total) * 100) },
      { status: 'Planning', count: counts.planning, percentage: Math.round((counts.planning / total) * 100) },
      { status: 'Paused', count: counts.paused, percentage: Math.round((counts.paused / total) * 100) },
      { status: 'Archived', count: counts.archived, percentage: Math.round((counts.archived / total) * 100) },
    ].filter(item => item.count > 0);
  }

  async fetchProjectsByPriority(userId: string): Promise<Array<{ priority: string; count: number; percentage: number }>> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          priority,
          created_by,
          project_team_members!inner(user_id, invitation_status)
        `)
        .or(`created_by.eq.${userId},project_team_members.user_id.eq.${userId}`)
        .eq('project_team_members.invitation_status', 'active');

      if (error) return { data: null, error };

      // Count by priority
      const priorityCounts = data.reduce((acc, project) => {
        const priority = project.priority || 'medium';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const total = Object.values(priorityCounts).reduce((sum, count) => sum + count, 0);
      
      if (total === 0) {
        return { data: [], error: null };
      }

      const result = Object.entries(priorityCounts).map(([priority, count]) => ({
        priority: priority.charAt(0).toUpperCase() + priority.slice(1),
        count,
        percentage: Math.round((count / total) * 100)
      }));

      return { data: result, error: null };
    }, 'projects by priority');
  }

  async fetchProjectsByIndustry(userId: string): Promise<Array<{ industry: string; count: number; percentage: number }>> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          industry,
          created_by,
          project_team_members!inner(user_id, invitation_status)
        `)
        .or(`created_by.eq.${userId},project_team_members.user_id.eq.${userId}`)
        .eq('project_team_members.invitation_status', 'active');

      if (error) return { data: null, error };

      // Count by industry
      const industryCounts = data.reduce((acc, project) => {
        const industry = project.industry || 'Other';
        acc[industry] = (acc[industry] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const total = Object.values(industryCounts).reduce((sum, count) => sum + count, 0);
      
      if (total === 0) {
        return { data: [], error: null };
      }

      const result = Object.entries(industryCounts)
        .map(([industry, count]) => ({
          industry,
          count,
          percentage: Math.round((count / total) * 100)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 industries

      return { data: result, error: null };
    }, 'projects by industry');
  }

  async fetchProjectTimeline(userId: string): Promise<Array<{
    id: string;
    name: string;
    startDate: Date | null;
    endDate: Date | null;
    status: string;
    progress: number;
  }>> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          start_date,
          target_end_date,
          actual_end_date,
          status,
          created_by,
          project_team_members!inner(user_id, invitation_status)
        `)
        .or(`created_by.eq.${userId},project_team_members.user_id.eq.${userId}`)
        .eq('project_team_members.invitation_status', 'active')
        .not('start_date', 'is', null)
        .order('start_date', { ascending: true });

      if (error) return { data: null, error };

      const timeline = data.map(project => {
        // Calculate progress based on status and dates
        let progress = 0;
        if (project.status === 'completed') {
          progress = 100;
        } else if (project.status === 'active' && project.start_date && project.target_end_date) {
          const startDate = new Date(project.start_date);
          const targetDate = new Date(project.target_end_date);
          const currentDate = new Date();
          
          if (currentDate >= startDate && currentDate <= targetDate) {
            const totalDuration = targetDate.getTime() - startDate.getTime();
            const elapsed = currentDate.getTime() - startDate.getTime();
            progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
          } else if (currentDate > targetDate) {
            progress = 100; // Overdue but not marked complete
          }
        } else if (project.status === 'planning') {
          progress = 10;
        }

        return {
          id: project.id,
          name: project.name,
          startDate: project.start_date ? new Date(project.start_date) : null,
          endDate: project.actual_end_date 
            ? new Date(project.actual_end_date) 
            : project.target_end_date 
            ? new Date(project.target_end_date) 
            : null,
          status: project.status,
          progress: Math.round(progress)
        };
      });

      return { data: timeline, error: null };
    }, 'project timeline');
  }

  async fetchComprehensiveAnalytics(userId: string): Promise<ProjectAnalyticsData> {
    try {
      // Execute all queries in parallel for better performance
      const [
        projectCounts,
        teamMemberCount,
        avgDuration,
        projectsByStatus,
        projectsByPriority,
        projectsByIndustry,
        projectTimeline
      ] = await Promise.all([
        this.fetchProjectCounts(userId),
        this.fetchTeamMemberCount(userId),
        this.fetchProjectDurations(userId),
        this.fetchProjectsByStatus(userId),
        this.fetchProjectsByPriority(userId),
        this.fetchProjectsByIndustry(userId),
        this.fetchProjectTimeline(userId)
      ]);

      // Calculate derived metrics
      const completionRate = projectCounts.total > 0 
        ? Math.round((projectCounts.completed / projectCounts.total) * 100)
        : 0;

      const teamProductivity = teamMemberCount > 0 
        ? Math.round((projectCounts.total / teamMemberCount) * 100) / 100
        : 0;

      // Calculate success score based on completion rate and average duration
      const successScore = Math.round((completionRate + (avgDuration > 0 && avgDuration <= 30 ? 20 : 10)) / 2);

      // Generate trends data (simplified - last 7 days)
      const trendsData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toISOString().split('T')[0],
          totalProjects: projectCounts.total,
          activeProjects: projectCounts.active,
          completedProjects: projectCounts.completed
        };
      });

      return {
        totalProjects: projectCounts.total,
        activeProjects: projectCounts.active,
        completedProjects: projectCounts.completed,
        teamMembers: teamMemberCount,
        averageDuration: avgDuration,
        completionRate,
        teamProductivity,
        successScore,
        projectsByStatus,
        projectsByPriority,
        projectsByIndustry,
        projectTimeline,
        trendsData,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('Error fetching comprehensive analytics:', error);
      throw error;
    }
  }
}

// Custom error class for analytics
export class AnalyticsServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AnalyticsServiceError';
  }
}

export const analyticsService = new AnalyticsService();