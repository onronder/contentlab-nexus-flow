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
  // Activity Logging
  static async logActivity(activityData: ActivityLogInput): Promise<void> {
    try {
      const { error } = await supabase
        .from('activity_logs')
        .insert({
          team_id: activityData.teamId,
          user_id: activityData.userId,
          project_id: activityData.projectId,
          activity_type: activityData.activityType,
          action: activityData.action,
          resource_type: activityData.resourceType,
          resource_id: activityData.resourceId,
          target_user_id: activityData.targetUserId,
          description: activityData.description,
          metadata: activityData.metadata || {},
          ip_address: activityData.ipAddress,
          user_agent: activityData.userAgent,
          session_id: activityData.sessionId,
          severity: activityData.severity || 'info'
        });

      if (error) throw error;
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

  // Activity Queries
  static async getTeamActivities(
    teamId: string, 
    filters?: ActivityFilters
  ): Promise<ActivityLog[]> {
    let query = supabase
      .from('activity_logs')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (filters?.activityType) {
      query = query.eq('activity_type', filters.activityType);
    }
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }
    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 20)) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async getUserActivities(
    userId: string, 
    filters?: ActivityFilters
  ): Promise<ActivityLog[]> {
    let query = supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters?.activityType) {
      query = query.eq('activity_type', filters.activityType);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async getProjectActivities(
    projectId: string, 
    filters?: ActivityFilters
  ): Promise<ActivityLog[]> {
    let query = supabase
      .from('activity_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async getActivityFeed(
    teamId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<{ activities: ActivityLog[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const [activitiesResult, countResult] = await Promise.all([
      supabase
        .from('activity_logs')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
    ]);

    if (activitiesResult.error) throw activitiesResult.error;
    if (countResult.error) throw countResult.error;

    return {
      activities: activitiesResult.data || [],
      total: countResult.count || 0
    };
  }

  // Activity Analytics
  static async getActivitySummary(
    teamId: string, 
    period: string = '7d'
  ): Promise<ActivitySummary> {
    const dateFrom = new Date();
    if (period === '7d') dateFrom.setDate(dateFrom.getDate() - 7);
    else if (period === '30d') dateFrom.setDate(dateFrom.getDate() - 30);
    else if (period === '90d') dateFrom.setDate(dateFrom.getDate() - 90);

    const { data: activities, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('team_id', teamId)
      .gte('created_at', dateFrom.toISOString());

    if (error) throw error;

    const summary: ActivitySummary = {
      totalActivities: activities.length,
      activitiesByType: {},
      activitiesByUser: {},
      activitiesByDay: [],
      topActions: []
    };

    // Group by type
    activities.forEach(activity => {
      summary.activitiesByType[activity.activity_type] = 
        (summary.activitiesByType[activity.activity_type] || 0) + 1;
      
      if (activity.user_id) {
        summary.activitiesByUser[activity.user_id] = 
          (summary.activitiesByUser[activity.user_id] || 0) + 1;
      }
    });

    // Group by day
    const dayGroups: Record<string, number> = {};
    activities.forEach(activity => {
      const day = activity.created_at.split('T')[0];
      dayGroups[day] = (dayGroups[day] || 0) + 1;
    });

    summary.activitiesByDay = Object.entries(dayGroups)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top actions
    const actionGroups: Record<string, number> = {};
    activities.forEach(activity => {
      actionGroups[activity.action] = (actionGroups[activity.action] || 0) + 1;
    });

    summary.topActions = Object.entries(actionGroups)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return summary;
  }

  static async getMemberActivityStats(
    teamId: string, 
    userId: string
  ): Promise<MemberActivityStats> {
    const { data: activities, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const activitiesByType: Record<string, number> = {};
    activities.forEach(activity => {
      activitiesByType[activity.activity_type] = 
        (activitiesByType[activity.activity_type] || 0) + 1;
    });

    // Simple engagement score calculation
    const engagementScore = Math.min(activities.length * 2, 100);

    return {
      userId,
      totalActivities: activities.length,
      activitiesByType,
      recentActivities: activities.slice(0, 10),
      engagementScore,
      lastActivity: activities[0]?.created_at
    };
  }

  static async getTeamEngagementMetrics(teamId: string): Promise<EngagementMetrics> {
    const [activitiesResult, membersResult] = await Promise.all([
      supabase
        .from('activity_logs')
        .select('user_id')
        .eq('team_id', teamId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .eq('status', 'active')
    ]);

    if (activitiesResult.error) throw activitiesResult.error;
    if (membersResult.error) throw membersResult.error;

    const activities = activitiesResult.data || [];
    const members = membersResult.data || [];

    const userActivityCounts: Record<string, number> = {};
    activities.forEach(activity => {
      if (activity.user_id) {
        userActivityCounts[activity.user_id] = 
          (userActivityCounts[activity.user_id] || 0) + 1;
      }
    });

    const activeMembers = Object.keys(userActivityCounts).length;
    const avgActivitiesPerMember = activities.length / Math.max(members.length, 1);
    const engagementRate = activeMembers / Math.max(members.length, 1) * 100;

    const topContributors = Object.entries(userActivityCounts)
      .map(([userId, activityCount]) => ({ userId, activityCount }))
      .sort((a, b) => b.activityCount - a.activityCount)
      .slice(0, 5);

    return {
      teamId,
      memberCount: members.length,
      activeMembers,
      totalActivities: activities.length,
      avgActivitiesPerMember,
      engagementRate,
      topContributors
    };
  }
}