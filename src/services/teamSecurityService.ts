import { supabase } from "@/integrations/supabase/client";

export interface TeamSecurityEvent {
  id: string;
  team_id: string;
  user_id?: string;
  event_type: 'login_attempt' | 'permission_change' | 'data_access' | 'policy_violation' | 'suspicious_activity' | 'security_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  event_description: string;
  ip_address?: string;
  user_agent?: string;
  location_data: Record<string, any>;
  risk_score: number;
  resolution_status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  resolved_by?: string;
  resolved_at?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface SecurityMetrics {
  total_events: number;
  critical_events: number;
  open_incidents: number;
  resolved_incidents: number;
  average_resolution_time: number;
  risk_score_trend: number[];
  top_threats: Array<{
    type: string;
    count: number;
    severity: string;
  }>;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: Record<string, any>;
  is_active: boolean;
  enforcement_level: 'advisory' | 'warning' | 'blocking';
}

export class TeamSecurityService {
  /**
   * Log a security event
   */
  static async logSecurityEvent(eventData: {
    team_id: string;
    user_id?: string;
    event_type: TeamSecurityEvent['event_type'];
    severity: TeamSecurityEvent['severity'];
    event_description: string;
    ip_address?: string;
    user_agent?: string;
    location_data?: Record<string, any>;
    risk_score?: number;
    metadata?: Record<string, any>;
  }): Promise<TeamSecurityEvent> {
    try {
      const { data, error } = await supabase
        .from('team_security_events')
        .insert({
          ...eventData,
          risk_score: eventData.risk_score || 0,
          location_data: eventData.location_data || {},
          metadata: eventData.metadata || {}
        })
        .select()
        .single();

      if (error) {
        console.error('Error logging security event:', error);
        throw new Error(`Failed to log security event: ${error.message}`);
      }

      // Check if this is a high-severity event that requires immediate attention
      if (eventData.severity === 'critical' || eventData.severity === 'high') {
        await this.createSecurityAlert(eventData.team_id, data as TeamSecurityEvent);
      }

      return data as TeamSecurityEvent;
    } catch (error) {
      console.error('TeamSecurityService.logSecurityEvent error:', error);
      throw error;
    }
  }

  /**
   * Get security events for a team
   */
  static async getSecurityEvents(
    teamId: string,
    options?: {
      severity?: TeamSecurityEvent['severity'];
      event_type?: TeamSecurityEvent['event_type'];
      status?: TeamSecurityEvent['resolution_status'];
      limit?: number;
      offset?: number;
    }
  ): Promise<TeamSecurityEvent[]> {
    try {
      let query = supabase
        .from('team_security_events')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (options?.severity) {
        query = query.eq('severity', options.severity);
      }
      if (options?.event_type) {
        query = query.eq('event_type', options.event_type);
      }
      if (options?.status) {
        query = query.eq('resolution_status', options.status);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching security events:', error);
        throw new Error(`Failed to fetch security events: ${error.message}`);
      }

      return (data || []) as TeamSecurityEvent[];
    } catch (error) {
      console.error('TeamSecurityService.getSecurityEvents error:', error);
      throw error;
    }
  }

  /**
   * Resolve a security event
   */
  static async resolveSecurityEvent(
    eventId: string,
    resolvedBy: string,
    resolution: 'resolved' | 'false_positive'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('team_security_events')
        .update({
          resolution_status: resolution,
          resolved_by: resolvedBy,
          resolved_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) {
        console.error('Error resolving security event:', error);
        throw new Error(`Failed to resolve security event: ${error.message}`);
      }
    } catch (error) {
      console.error('TeamSecurityService.resolveSecurityEvent error:', error);
      throw error;
    }
  }

  /**
   * Get security metrics for dashboard
   */
  static async getSecurityMetrics(teamId: string): Promise<SecurityMetrics> {
    try {
      // Get total events count
      const { count: totalEvents, error: totalError } = await supabase
        .from('team_security_events')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);

      if (totalError) {
        console.error('Error fetching total events:', totalError);
        return this.getDefaultSecurityMetrics();
      }

      // Get critical events count
      const { count: criticalEvents } = await supabase
        .from('team_security_events')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('severity', 'critical');

      // Get open incidents count
      const { count: openIncidents } = await supabase
        .from('team_security_events')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('resolution_status', 'open');

      // Get resolved incidents count
      const { count: resolvedIncidents } = await supabase
        .from('team_security_events')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('resolution_status', 'resolved');

      // Get top threats
      const { data: threatData } = await supabase
        .from('team_security_events')
        .select('event_type, severity')
        .eq('team_id', teamId);

      const threatCounts = (threatData || []).reduce((acc, event) => {
        const key = event.event_type;
        if (!acc[key]) {
          acc[key] = { type: key, count: 0, severity: event.severity };
        }
        acc[key].count++;
        return acc;
      }, {} as Record<string, any>);

      const topThreats = Object.values(threatCounts)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5);

      return {
        total_events: totalEvents || 0,
        critical_events: criticalEvents || 0,
        open_incidents: openIncidents || 0,
        resolved_incidents: resolvedIncidents || 0,
        average_resolution_time: 0, // Calculate based on resolved incidents
        risk_score_trend: [], // Calculate trend over time
        top_threats: topThreats as any
      };
    } catch (error) {
      console.error('TeamSecurityService.getSecurityMetrics error:', error);
      return this.getDefaultSecurityMetrics();
    }
  }

  private static getDefaultSecurityMetrics(): SecurityMetrics {
    return {
      total_events: 0,
      critical_events: 0,
      open_incidents: 0,
      resolved_incidents: 0,
      average_resolution_time: 0,
      risk_score_trend: [],
      top_threats: []
    };
  }

  /**
   * Create security alert for high-severity events
   */
  private static async createSecurityAlert(teamId: string, event: TeamSecurityEvent): Promise<void> {
    try {
      // Create security alert (simplified logging)
      console.log(`Security alert for team ${teamId}: ${event.severity.toUpperCase()} - ${event.event_description}`);
    } catch (error) {
      console.error('TeamSecurityService.createSecurityAlert error:', error);
    }
  }

  /**
   * Monitor suspicious activity patterns
   */
  static async detectSuspiciousActivity(teamId: string, userId: string): Promise<boolean> {
    try {
      // Get recent events for this user
      const { data: recentEvents } = await supabase
        .from('team_security_events')
        .select('*')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false });

      if (!recentEvents || recentEvents.length === 0) {
        return false;
      }

      // Check for patterns that indicate suspicious activity
      const loginAttempts = recentEvents.filter(e => e.event_type === 'login_attempt').length;
      const permissionChanges = recentEvents.filter(e => e.event_type === 'permission_change').length;
      const dataAccess = recentEvents.filter(e => e.event_type === 'data_access').length;

      // Suspicious if too many login attempts or unusual activity
      if (loginAttempts > 10 || permissionChanges > 5 || dataAccess > 50) {
        // Log the suspicious activity
        await this.logSecurityEvent({
          team_id: teamId,
          user_id: userId,
          event_type: 'suspicious_activity',
          severity: 'high',
          event_description: `Suspicious activity pattern detected: ${loginAttempts} login attempts, ${permissionChanges} permission changes, ${dataAccess} data access events in 24h`,
          risk_score: 80,
          metadata: {
            login_attempts: loginAttempts,
            permission_changes: permissionChanges,
            data_access_events: dataAccess
          }
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('TeamSecurityService.detectSuspiciousActivity error:', error);
      return false;
    }
  }

  /**
   * Get security compliance score
   */
  static async getComplianceScore(teamId: string): Promise<number> {
    try {
      // Calculate compliance score based on various factors
      let score = 100;

      // Check for unresolved critical events
      const { count: criticalEvents } = await supabase
        .from('team_security_events')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('severity', 'critical')
        .eq('resolution_status', 'open');

      // Reduce score for unresolved critical events
      score -= (criticalEvents || 0) * 10;

      // Check for recent security incidents
      const { count: recentIncidents } = await supabase
        .from('team_security_events')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      // Reduce score based on incident frequency
      score -= Math.min((recentIncidents || 0) * 2, 30);

      return Math.max(score, 0);
    } catch (error) {
      console.error('TeamSecurityService.getComplianceScore error:', error);
      return 0;
    }
  }
}