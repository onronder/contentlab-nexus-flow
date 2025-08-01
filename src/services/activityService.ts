import { supabase } from '@/integrations/supabase/client';

export interface ActivityLogInput {
  teamId?: string;
  userId?: string;
  projectId?: string;
  activityType: 'authentication' | 'team_management' | 'role_management' | 'project_access' | 'content_activity' | 'competitive_intel' | 'system_event' | 'security_event';
  action: string;
  resourceType?: string;
  resourceId?: string;
  targetUserId?: string;
  description?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  severity?: 'debug' | 'info' | 'warning' | 'error' | 'critical';
}

export interface ActivityLog {
  id: string;
  team_id?: string;
  user_id?: string;
  project_id?: string;
  activity_type: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  target_user_id?: string;
  description?: string;
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  severity: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

export interface ActivityFilters {
  activityType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  severity?: string;
  resourceType?: string;
  limit?: number;
  offset?: number;
}

export interface ActivitySummary {
  totalActivities: number;
  activitiesByType: Record<string, number>;
  activitiesByUser: Record<string, number>;
  activitiesByDay: Array<{ date: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
}

export interface MemberActivityStats {
  userId: string;
  totalActivities: number;
  activitiesByType: Record<string, number>;
  recentActivities: ActivityLog[];
  engagementScore: number;
  lastActivity?: string;
}

export interface EngagementMetrics {
  teamId: string;
  memberCount: number;
  activeMembers: number;
  totalActivities: number;
  avgActivitiesPerMember: number;
  engagementRate: number;
  topContributors: Array<{ userId: string; activityCount: number }>;
}

export class ActivityService {
  // Activity Logging - Using existing project_activities table until new tables are available
  static async logActivity(activityData: ActivityLogInput): Promise<void> {
    try {
      // For now, log to project_activities table which exists
      if (activityData.projectId) {
        const { error } = await supabase
          .from('project_activities')
          .insert({
            project_id: activityData.projectId,
            user_id: activityData.userId,
            activity_type: activityData.action,
            activity_description: activityData.description || `${activityData.action} - ${activityData.activityType}`,
            entity_type: activityData.resourceType,
            entity_id: activityData.resourceId,
            metadata: activityData.metadata || {}
          });

        if (error) throw error;
      }
      
      // Also store in localStorage for demonstration until full table is available
      console.log('Activity logged:', activityData);
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Non-blocking error - don't throw to prevent disrupting user workflows
    }
  }

  static async logTeamActivity(
    teamId: string, 
    userId: string, 
    action: string, 
    details: any
  ): Promise<void> {
    await this.logActivity({
      teamId,
      userId,
      activityType: 'team_management',
      action,
      description: details.description,
      metadata: details,
      severity: 'info'
    });
  }

  static async logSecurityEvent(eventData: ActivityLogInput): Promise<void> {
    await this.logActivity({
      ...eventData,
      activityType: 'security_event',
      severity: eventData.severity || 'warning'
    });
  }

  static async logSystemEvent(eventData: ActivityLogInput): Promise<void> {
    await this.logActivity({
      ...eventData,
      activityType: 'system_event',
      severity: eventData.severity || 'info'
    });
  }

  // Activity Queries - Using existing project_activities table 
  static async getTeamActivities(
    teamId: string, 
    filters?: ActivityFilters
  ): Promise<ActivityLog[]> {
    // Return mock data for now until full implementation is available
    return this.getMockActivities(teamId, filters);
  }

  static async getUserActivities(
    userId: string, 
    filters?: ActivityFilters
  ): Promise<ActivityLog[]> {
    // Return mock data for now until full implementation is available
    return this.getMockActivities(undefined, { ...filters, userId });
  }

  static async getProjectActivities(
    projectId: string, 
    filters?: ActivityFilters
  ): Promise<ActivityLog[]> {
    try {
      // Use existing project_activities table
      const { data, error } = await supabase
        .from('project_activities')
        .select(`
          *,
          profiles:user_id(id, full_name, email, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 20);

      if (error) throw error;

      // Transform to ActivityLog format
      return (data || []).map(item => ({
        id: item.id,
        team_id: undefined,
        user_id: item.user_id,
        project_id: item.project_id,
        activity_type: 'project_access',
        action: item.activity_type || 'unknown_action',
        resource_type: item.entity_type,
        resource_id: item.entity_id,
        description: item.activity_description,
        metadata: typeof item.metadata === 'object' ? item.metadata || {} : {},
        severity: 'info',
        created_at: item.created_at,
        profiles: item.profiles && typeof item.profiles === 'object' && item.profiles !== null && !Array.isArray(item.profiles) && !('error' in item.profiles) ? item.profiles : undefined
      }));
    } catch (error) {
      console.error('Error fetching project activities:', error);
      return [];
    }
  }

  static async getActivityFeed(
    teamId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<{ activities: ActivityLog[]; total: number }> {
    // Return mock data for now
    const activities = this.getMockActivities(teamId);
    const offset = (page - 1) * limit;
    
    return {
      activities: activities.slice(offset, offset + limit),
      total: activities.length
    };
  }

  // Activity Analytics
  static async getActivitySummary(
    teamId: string, 
    period: string = '7d'
  ): Promise<ActivitySummary> {
    // Return mock summary for now
    return {
      totalActivities: 156,
      activitiesByType: {
        'team_management': 45,
        'content_activity': 67,
        'project_access': 32,
        'security_event': 12
      },
      activitiesByUser: {
        'user-1': 78,
        'user-2': 45,
        'user-3': 33
      },
      activitiesByDay: [
        { date: '2024-01-01', count: 23 },
        { date: '2024-01-02', count: 31 },
        { date: '2024-01-03', count: 28 }
      ],
      topActions: [
        { action: 'created_project', count: 15 },
        { action: 'updated_content', count: 12 },
        { action: 'invited_member', count: 8 }
      ]
    };
  }

  static async getMemberActivityStats(
    teamId: string, 
    userId: string
  ): Promise<MemberActivityStats> {
    const activities = this.getMockActivities(teamId, { userId, limit: 10 });
    
    const activitiesByType: Record<string, number> = {};
    activities.forEach(activity => {
      activitiesByType[activity.activity_type] = 
        (activitiesByType[activity.activity_type] || 0) + 1;
    });

    return {
      userId,
      totalActivities: activities.length,
      activitiesByType,
      recentActivities: activities,
      engagementScore: 75,
      lastActivity: activities[0]?.created_at
    };
  }

  static async getTeamEngagementMetrics(teamId: string): Promise<EngagementMetrics> {
    return {
      teamId,
      memberCount: 8,
      activeMembers: 6,
      totalActivities: 156,
      avgActivitiesPerMember: 19.5,
      engagementRate: 75,
      topContributors: [
        { userId: 'user-1', activityCount: 45 },
        { userId: 'user-2', activityCount: 38 },
        { userId: 'user-3', activityCount: 22 }
      ]
    };
  }

  // Helper method to generate mock activities
  private static getMockActivities(teamId?: string, filters?: ActivityFilters): ActivityLog[] {
    const mockActivities: ActivityLog[] = [
      {
        id: '1',
        team_id: teamId,
        user_id: 'user-1',
        project_id: 'project-1',
        activity_type: 'team_management',
        action: 'invited_member',
        description: 'Invited new team member to join the project',
        metadata: { member_email: 'newuser@example.com' },
        severity: 'info',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        profiles: { id: 'user-1', full_name: 'John Doe', email: 'john@example.com' }
      },
      {
        id: '2',
        team_id: teamId,
        user_id: 'user-2',
        project_id: 'project-1',
        activity_type: 'content_activity',
        action: 'created_content',
        description: 'Created new content item for review',
        metadata: { content_type: 'article' },
        severity: 'info',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        profiles: { id: 'user-2', full_name: 'Jane Smith', email: 'jane@example.com' }
      },
      {
        id: '3',
        team_id: teamId,
        user_id: 'user-3',
        project_id: 'project-1',
        activity_type: 'project_access',
        action: 'viewed_analytics',
        description: 'Viewed project analytics dashboard',
        metadata: { section: 'performance' },
        severity: 'info',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        profiles: { id: 'user-3', full_name: 'Mike Johnson', email: 'mike@example.com' }
      }
    ];

    let filtered = mockActivities;

    if (filters?.userId) {
      filtered = filtered.filter(a => a.user_id === filters.userId);
    }
    if (filters?.activityType) {
      filtered = filtered.filter(a => a.activity_type === filters.activityType);
    }
    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }
}