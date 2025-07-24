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
      
      // Handle null data gracefully for analytics queries - only throw if it's unexpected
      if (!data && !errorContext.includes('team member count')) {
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
      // Get projects the user owns first
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('id, status, created_by')
        .eq('created_by', userId);

      if (ownedError) return { data: null, error: ownedError };

      // Get projects where user is a team member
      const { data: memberProjects, error: memberError } = await supabase
        .from('project_team_members')
        .select(`
          project_id,
          projects!inner(id, status, created_by)
        `)
        .eq('user_id', userId)
        .eq('invitation_status', 'active');

      if (memberError) return { data: null, error: memberError };

      // Combine and deduplicate projects
      const allProjects = new Map();
      
      // Add owned projects
      ownedProjects.forEach(project => {
        allProjects.set(project.id, project);
      });
      
      // Add member projects (avoid duplicates)
      memberProjects.forEach(member => {
        const project = member.projects;
        if (!allProjects.has(project.id)) {
          allProjects.set(project.id, project);
        }
      });

      const uniqueProjects = Array.from(allProjects.values());

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
      // Get team members from projects the user owns
      const { data, error } = await supabase
        .from('project_team_members')
        .select(`
          user_id,
          projects!inner(created_by)
        `)
        .eq('projects.created_by', userId)
        .eq('invitation_status', 'active');

      if (error) return { data: null, error };

      // Handle case where user has no projects yet - return 0 instead of throwing error
      if (!data || data.length === 0) {
        return { data: 0, error: null };
      }

      // Count unique team members
      const uniqueMembers = new Set(data.map(member => member.user_id));
      return { data: uniqueMembers.size, error: null };
    }, 'team member count');
  }

  async fetchProjectDurations(userId: string): Promise<number> {
    return this.executeQuery(async () => {
      // Get owned projects with dates
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('start_date, actual_end_date, target_end_date, status')
        .eq('created_by', userId)
        .not('start_date', 'is', null);

      if (ownedError) return { data: null, error: ownedError };

      // Get member projects with dates
      const { data: memberProjects, error: memberError } = await supabase
        .from('project_team_members')
        .select(`
          projects!inner(start_date, actual_end_date, target_end_date, status, id)
        `)
        .eq('user_id', userId)
        .eq('invitation_status', 'active')
        .not('projects.start_date', 'is', null);

      if (memberError) return { data: null, error: memberError };

      // Combine and deduplicate projects
      const allProjects = new Map();
      
      ownedProjects.forEach(project => {
        allProjects.set(`owned_${project.start_date}`, project);
      });
      
      memberProjects.forEach(member => {
        const project = member.projects;
        if (!allProjects.has(`owned_${project.start_date}`)) {
          allProjects.set(`member_${project.id}`, project);
        }
      });

      const uniqueProjects = Array.from(allProjects.values());

      // Calculate durations
      const durations = uniqueProjects
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
      // Get owned projects
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('id, priority')
        .eq('created_by', userId);

      if (ownedError) return { data: null, error: ownedError };

      // Get member projects
      const { data: memberProjects, error: memberError } = await supabase
        .from('project_team_members')
        .select(`
          projects!inner(id, priority)
        `)
        .eq('user_id', userId)
        .eq('invitation_status', 'active');

      if (memberError) return { data: null, error: memberError };

      // Combine and deduplicate projects
      const allProjects = new Map();
      
      ownedProjects.forEach(project => {
        allProjects.set(project.id, project);
      });
      
      memberProjects.forEach(member => {
        const project = member.projects;
        if (!allProjects.has(project.id)) {
          allProjects.set(project.id, project);
        }
      });

      const uniqueProjects = Array.from(allProjects.values());

      // Count by priority
      const priorityCounts = uniqueProjects.reduce((acc, project: any) => {
        const priority = project.priority || 'medium';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const total = Object.values(priorityCounts).reduce((sum: number, count: unknown) => sum + (count as number), 0);
      
      if (total === 0) {
        return { data: [], error: null };
      }

      const result = Object.entries(priorityCounts).map(([priority, count]) => {
        const countNum = count as number;
        const totalNum = total as number;
        return {
          priority: priority.charAt(0).toUpperCase() + priority.slice(1),
          count: countNum,
          percentage: Math.round((countNum / totalNum) * 100)
        };
      });

      return { data: result, error: null };
    }, 'projects by priority');
  }

  async fetchProjectsByIndustry(userId: string): Promise<Array<{ industry: string; count: number; percentage: number }>> {
    return this.executeQuery(async () => {
      // Get owned projects
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('id, industry')
        .eq('created_by', userId);

      if (ownedError) return { data: null, error: ownedError };

      // Get member projects
      const { data: memberProjects, error: memberError } = await supabase
        .from('project_team_members')
        .select(`
          projects!inner(id, industry)
        `)
        .eq('user_id', userId)
        .eq('invitation_status', 'active');

      if (memberError) return { data: null, error: memberError };

      // Combine and deduplicate projects
      const allProjects = new Map();
      
      ownedProjects.forEach(project => {
        allProjects.set(project.id, project);
      });
      
      memberProjects.forEach(member => {
        const project = member.projects;
        if (!allProjects.has(project.id)) {
          allProjects.set(project.id, project);
        }
      });

      const uniqueProjects = Array.from(allProjects.values());

      // Count by industry
      const industryCounts = uniqueProjects.reduce((acc, project: any) => {
        const industry = project.industry || 'Other';
        acc[industry] = (acc[industry] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const total = Object.values(industryCounts).reduce((sum: number, count: unknown) => sum + (count as number), 0);
      
      if (total === 0) {
        return { data: [], error: null };
      }

      const result = Object.entries(industryCounts)
        .map(([industry, count]) => {
          const countNum = count as number;
          const totalNum = total as number;
          return {
            industry,
            count: countNum,
            percentage: Math.round((countNum / totalNum) * 100)
          };
        })
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
      // Get owned projects with timeline data
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('id, name, start_date, target_end_date, actual_end_date, status')
        .eq('created_by', userId)
        .not('start_date', 'is', null)
        .order('start_date', { ascending: true });

      if (ownedError) return { data: null, error: ownedError };

      // Get member projects with timeline data
      const { data: memberProjects, error: memberError } = await supabase
        .from('project_team_members')
        .select(`
          projects!inner(id, name, start_date, target_end_date, actual_end_date, status)
        `)
        .eq('user_id', userId)
        .eq('invitation_status', 'active')
        .not('projects.start_date', 'is', null);

      if (memberError) return { data: null, error: memberError };

      // Combine and deduplicate projects
      const allProjects = new Map();
      
      ownedProjects.forEach(project => {
        allProjects.set(project.id, project);
      });
      
      memberProjects.forEach(member => {
        const project = member.projects;
        if (!allProjects.has(project.id)) {
          allProjects.set(project.id, project);
        }
      });

      const uniqueProjects = Array.from(allProjects.values())
        .sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

      const timeline = uniqueProjects.map((project: any) => {
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