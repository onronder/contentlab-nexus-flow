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

  // Activity Queries - Using activity_logs table for real data
  static async getTeamActivities(
    teamId: string, 
    filters?: ActivityFilters
  ): Promise<ActivityLog[]> {
    try {
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          profiles:user_id(id, full_name, email, avatar_url)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (filters?.activityType) {
        query = query.eq('activity_type', filters.activityType as any);
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
        query = query.eq('severity', filters.severity as any);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        team_id: item.team_id,
        user_id: item.user_id,
        project_id: item.project_id,
        activity_type: item.activity_type as string,
        action: item.action,
        resource_type: item.resource_type,
        resource_id: item.resource_id,
        target_user_id: item.target_user_id,
        description: item.description,
        metadata: (typeof item.metadata === 'object' && item.metadata !== null) ? item.metadata as Record<string, any> : {},
        ip_address: item.ip_address as string,
        user_agent: item.user_agent as string,
        session_id: item.session_id as string,
        severity: item.severity as string,
        created_at: item.created_at,
        profiles: item.profiles && typeof item.profiles === 'object' && !Array.isArray(item.profiles) ? item.profiles : undefined
      }));
    } catch (error) {
      console.error('Error fetching team activities:', error);
      return [];
    }
  }

  static async getUserActivities(
    userId: string, 
    filters?: ActivityFilters
  ): Promise<ActivityLog[]> {
    try {
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          profiles:user_id(id, full_name, email, avatar_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (filters?.activityType) {
        query = query.eq('activity_type', filters.activityType as any);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters?.severity) {
        query = query.eq('severity', filters.severity as any);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        team_id: item.team_id,
        user_id: item.user_id,
        project_id: item.project_id,
        activity_type: item.activity_type as string,
        action: item.action,
        resource_type: item.resource_type,
        resource_id: item.resource_id,
        target_user_id: item.target_user_id,
        description: item.description,
        metadata: (typeof item.metadata === 'object' && item.metadata !== null) ? item.metadata as Record<string, any> : {},
        ip_address: item.ip_address as string,
        user_agent: item.user_agent as string,
        session_id: item.session_id as string,
        severity: item.severity as string,
        created_at: item.created_at,
        profiles: item.profiles && typeof item.profiles === 'object' && !Array.isArray(item.profiles) ? item.profiles : undefined
      }));
    } catch (error) {
      console.error('Error fetching user activities:', error);
      return [];
    }
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
    try {
      const offset = (page - 1) * limit;
      
      // Get paginated activities
      const { data: activities, error: activitiesError } = await supabase
        .from('activity_logs')
        .select(`
          *,
          profiles:user_id(id, full_name, email, avatar_url)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (activitiesError) throw activitiesError;

      // Get total count
      const { count, error: countError } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);

      if (countError) throw countError;

      const transformedActivities: ActivityLog[] = (activities || []).map(item => ({
        id: item.id,
        team_id: item.team_id,
        user_id: item.user_id,
        project_id: item.project_id,
        activity_type: item.activity_type as string,
        action: item.action,
        resource_type: item.resource_type,
        resource_id: item.resource_id,
        target_user_id: item.target_user_id,
        description: item.description,
        metadata: (typeof item.metadata === 'object' && item.metadata !== null) ? item.metadata as Record<string, any> : {},
        ip_address: item.ip_address as string,
        user_agent: item.user_agent as string,
        session_id: item.session_id as string,
        severity: item.severity as string,
        created_at: item.created_at,
        profiles: item.profiles && typeof item.profiles === 'object' && !Array.isArray(item.profiles) ? item.profiles : undefined
      }));

      return {
        activities: transformedActivities,
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      return { activities: [], total: 0 };
    }
  }

  // Activity Analytics
  static async getActivitySummary(
    teamId: string, 
    period: string = '7d'
  ): Promise<ActivitySummary> {
    try {
      // Calculate date range
      const periodDays = parseInt(period.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      // Get activities within period
      const { data: activities, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          profiles:user_id(id, full_name, email)
        `)
        .eq('team_id', teamId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const activitiesList = activities || [];
      const totalActivities = activitiesList.length;

      // Group by type
      const activitiesByType: Record<string, number> = {};
      activitiesList.forEach(activity => {
        activitiesByType[activity.activity_type] = (activitiesByType[activity.activity_type] || 0) + 1;
      });

      // Group by user
      const activitiesByUser: Record<string, number> = {};
      activitiesList.forEach(activity => {
        if (activity.user_id) {
          activitiesByUser[activity.user_id] = (activitiesByUser[activity.user_id] || 0) + 1;
        }
      });

      // Group by day
      const activitiesByDay: Array<{ date: string; count: number }> = [];
      const dayGroups: Record<string, number> = {};
      activitiesList.forEach(activity => {
        const date = new Date(activity.created_at).toISOString().split('T')[0];
        dayGroups[date] = (dayGroups[date] || 0) + 1;
      });

      Object.entries(dayGroups).forEach(([date, count]) => {
        activitiesByDay.push({ date, count });
      });

      // Top actions
      const actionGroups: Record<string, number> = {};
      activitiesList.forEach(activity => {
        actionGroups[activity.action] = (actionGroups[activity.action] || 0) + 1;
      });

      const topActions = Object.entries(actionGroups)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalActivities,
        activitiesByType,
        activitiesByUser,
        activitiesByDay: activitiesByDay.sort((a, b) => a.date.localeCompare(b.date)),
        topActions
      };
    } catch (error) {
      console.error('Error fetching activity summary:', error);
      return {
        totalActivities: 0,
        activitiesByType: {},
        activitiesByUser: {},
        activitiesByDay: [],
        topActions: []
      };
    }
  }

  static async getMemberActivityStats(
    teamId: string, 
    userId: string
  ): Promise<MemberActivityStats> {
    try {
      // Get all activities for this user in the team
      const { data: allActivities, error: allError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (allError) throw allError;

      // Get recent activities with profile info
      const { data: recentActivities, error: recentError } = await supabase
        .from('activity_logs')
        .select(`
          *,
          profiles:user_id(id, full_name, email, avatar_url)
        `)
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentError) throw recentError;

      const activities = allActivities || [];
      const recent = recentActivities || [];

      // Group by type
      const activitiesByType: Record<string, number> = {};
      activities.forEach(activity => {
        activitiesByType[activity.activity_type] = (activitiesByType[activity.activity_type] || 0) + 1;
      });

      // Calculate engagement score based on activity frequency and recency
      const now = new Date();
      const recentActivitiesCount = activities.filter(activity => {
        const activityDate = new Date(activity.created_at);
        const daysDiff = (now.getTime() - activityDate.getTime()) / (1000 * 3600 * 24);
        return daysDiff <= 7; // Last 7 days
      }).length;
      
      const engagementScore = Math.min(100, Math.round((recentActivitiesCount / Math.max(activities.length, 1)) * 100));

      const transformedRecentActivities: ActivityLog[] = recent.map(item => ({
        id: item.id,
        team_id: item.team_id,
        user_id: item.user_id,
        project_id: item.project_id,
        activity_type: item.activity_type as string,
        action: item.action,
        resource_type: item.resource_type,
        resource_id: item.resource_id,
        target_user_id: item.target_user_id,
        description: item.description,
        metadata: (typeof item.metadata === 'object' && item.metadata !== null) ? item.metadata as Record<string, any> : {},
        ip_address: item.ip_address as string,
        user_agent: item.user_agent as string,
        session_id: item.session_id as string,
        severity: item.severity as string,
        created_at: item.created_at,
        profiles: item.profiles && typeof item.profiles === 'object' && !Array.isArray(item.profiles) ? item.profiles : undefined
      }));

      return {
        userId,
        totalActivities: activities.length,
        activitiesByType,
        recentActivities: transformedRecentActivities,
        engagementScore,
        lastActivity: activities[0]?.created_at
      };
    } catch (error) {
      console.error('Error fetching member activity stats:', error);
      return {
        userId,
        totalActivities: 0,
        activitiesByType: {},
        recentActivities: [],
        engagementScore: 0,
        lastActivity: undefined
      };
    }
  }

  static async getTeamEngagementMetrics(teamId: string): Promise<EngagementMetrics> {
    try {
      // Get team member count
      const { count: memberCount, error: memberError } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('is_active', true)
        .eq('status', 'active');

      if (memberError) throw memberError;

      // Get all activities for the team
      const { data: activities, error: activitiesError } = await supabase
        .from('activity_logs')
        .select('user_id, created_at')
        .eq('team_id', teamId);

      if (activitiesError) throw activitiesError;

      const activitiesList = activities || [];
      const totalActivities = activitiesList.length;

      // Calculate active members (members with activity in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const activeUserIds = new Set(
        activitiesList
          .filter(activity => new Date(activity.created_at) >= thirtyDaysAgo)
          .map(activity => activity.user_id)
      );
      const activeMembers = activeUserIds.size;

      // Calculate top contributors
      const contributorCounts: Record<string, number> = {};
      activitiesList.forEach(activity => {
        if (activity.user_id) {
          contributorCounts[activity.user_id] = (contributorCounts[activity.user_id] || 0) + 1;
        }
      });

      const topContributors = Object.entries(contributorCounts)
        .map(([userId, activityCount]) => ({ userId, activityCount }))
        .sort((a, b) => b.activityCount - a.activityCount)
        .slice(0, 5);

      const avgActivitiesPerMember = memberCount && memberCount > 0 ? totalActivities / memberCount : 0;
      const engagementRate = memberCount && memberCount > 0 ? Math.round((activeMembers / memberCount) * 100) : 0;

      return {
        teamId,
        memberCount: memberCount || 0,
        activeMembers,
        totalActivities,
        avgActivitiesPerMember: Math.round(avgActivitiesPerMember * 10) / 10,
        engagementRate,
        topContributors
      };
    } catch (error) {
      console.error('Error fetching team engagement metrics:', error);
      return {
        teamId,
        memberCount: 0,
        activeMembers: 0,
        totalActivities: 0,
        avgActivitiesPerMember: 0,
        engagementRate: 0,
        topContributors: []
      };
    }
  }

}