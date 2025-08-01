import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// AUDIT SERVICE - Production-Grade Audit Logging
// ============================================================================

interface PermissionAuditLogInput {
  user_id: string;
  permission_slug: string;
  granted: boolean;
  resource_type?: string;
  resource_id?: string;
  team_id?: string;
  metadata?: Record<string, any>;
}

interface TeamActivityLogInput {
  user_id: string;
  team_id: string;
  action: string;
  description: string;
  metadata?: Record<string, any>;
}

interface SecurityEventLogInput {
  user_id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

interface AuditQueryOptions {
  user_id?: string;
  resource_type?: string;
  team_id?: string;
  start_date?: string;
  end_date?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

export class AuditService {
  // ============================================================================
  // PERMISSION AUDIT LOGGING
  // ============================================================================

  /**
   * Log permission checks with detailed context
   */
  static async logPermissionCheck(input: PermissionAuditLogInput): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('permission_audit_logs')
        .insert({
          user_id: input.user_id,
          permission_slug: input.permission_slug,
          action: input.granted ? 'granted' : 'denied',
          resource_type: input.resource_type,
          resource_id: input.resource_id,
          team_id: input.team_id,
          metadata: {
            ...input.metadata,
            timestamp: new Date().toISOString(),
            granted: input.granted
          }
        });

      if (error) {
        console.error('Failed to log permission check:', error);
        // Don't throw - audit logging should not break app functionality
      }
    } catch (error) {
      console.error('Permission audit logging error:', error);
    }
  }

  /**
   * Log role changes and assignments
   */
  static async logRoleChange(input: {
    user_id: string;
    target_user_id: string;
    old_role?: string;
    new_role: string;
    team_id?: string;
    action: 'assigned' | 'revoked' | 'updated';
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.logPermissionCheck({
        user_id: input.user_id,
        permission_slug: `role.${input.action}`,
        granted: true,
        resource_type: 'role_assignment',
        resource_id: input.target_user_id,
        team_id: input.team_id,
        metadata: {
          ...input.metadata,
          target_user_id: input.target_user_id,
          old_role: input.old_role,
          new_role: input.new_role,
          action: input.action
        }
      });
    } catch (error) {
      console.error('Role change audit logging error:', error);
    }
  }

  // ============================================================================
  // TEAM ACTIVITY LOGGING
  // ============================================================================

  /**
   * Log team management activities
   */
  static async logTeamActivity(input: TeamActivityLogInput): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('team_activity_logs')
        .insert({
          user_id: input.user_id,
          team_id: input.team_id,
          action: input.action,
          description: input.description,
          metadata: {
            ...input.metadata,
            timestamp: new Date().toISOString()
          }
        });

      if (error) {
        console.error('Failed to log team activity:', error);
      }
    } catch (error) {
      console.error('Team activity audit logging error:', error);
    }
  }

  // ============================================================================
  // SECURITY EVENT LOGGING
  // ============================================================================

  /**
   * Log critical security events
   */
  static async logSecurityEvent(input: SecurityEventLogInput): Promise<void> {
    try {
      const { error } = await supabase
        .from('security_events')
        .insert({
          user_id: input.user_id,
          event_type: input.event_type,
          severity: input.severity,
          event_data: {
            description: input.description,
            ip_address: input.ip_address,
            user_agent: input.user_agent,
            ...input.metadata,
            timestamp: new Date().toISOString()
          }
        });

      if (error) {
        console.error('Failed to log security event:', error);
      }

      // For critical events, also log to permission audit
      if (input.severity === 'critical') {
        await this.logPermissionCheck({
          user_id: input.user_id,
          permission_slug: 'security.critical_event',
          granted: false,
          resource_type: 'security',
          metadata: {
            event_type: input.event_type,
            description: input.description,
            severity: input.severity
          }
        });
      }
    } catch (error) {
      console.error('Security event audit logging error:', error);
    }
  }

  // ============================================================================
  // AUDIT TRAIL QUERIES
  // ============================================================================

  /**
   * Get audit trail with advanced filtering
   */
  static async getAuditTrail(options: AuditQueryOptions = {}): Promise<any[]> {
    try {
      let query = (supabase as any)
        .from('permission_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.user_id) {
        query = query.eq('user_id', options.user_id);
      }
      
      if (options.resource_type) {
        query = query.eq('resource_type', options.resource_type);
      }
      
      if (options.team_id) {
        query = query.eq('team_id', options.team_id);
      }
      
      if (options.action) {
        query = query.eq('action', options.action);
      }
      
      if (options.start_date) {
        query = query.gte('created_at', options.start_date);
      }
      
      if (options.end_date) {
        query = query.lte('created_at', options.end_date);
      }

      // Apply pagination
      const limit = options.limit || 100;
      const offset = options.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch audit trail:', error);
        throw new Error(`Failed to fetch audit trail: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Audit trail query error:', error);
      throw error;
    }
  }

  /**
   * Get team activity audit trail
   */
  static async getTeamAuditTrail(teamId: string, options: AuditQueryOptions = {}): Promise<any[]> {
    try {
      let query = (supabase as any)
        .from('team_activity_logs')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.user_id) {
        query = query.eq('user_id', options.user_id);
      }
      
      if (options.action) {
        query = query.eq('action', options.action);
      }
      
      if (options.start_date) {
        query = query.gte('created_at', options.start_date);
      }
      
      if (options.end_date) {
        query = query.lte('created_at', options.end_date);
      }

      // Apply pagination
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch team audit trail:', error);
        throw new Error(`Failed to fetch team audit trail: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Team audit trail query error:', error);
      throw error;
    }
  }

  /**
   * Get security events audit trail
   */
  static async getSecurityEvents(options: AuditQueryOptions = {}): Promise<any[]> {
    try {
      let query = supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.user_id) {
        query = query.eq('user_id', options.user_id);
      }
      
      if (options.start_date) {
        query = query.gte('created_at', options.start_date);
      }
      
      if (options.end_date) {
        query = query.lte('created_at', options.end_date);
      }

      // Apply pagination
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch security events:', error);
        throw new Error(`Failed to fetch security events: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Security events query error:', error);
      throw error;
    }
  }

  // ============================================================================
  // COMPLIANCE REPORTING
  // ============================================================================

  /**
   * Export audit report for compliance
   */
  static async exportAuditReport(options: {
    start_date: string;
    end_date: string;
    team_id?: string;
    format: 'json' | 'csv';
  }): Promise<any> {
    try {
      const auditLogs = await this.getAuditTrail({
        start_date: options.start_date,
        end_date: options.end_date,
        team_id: options.team_id,
        limit: 10000 // Large limit for reports
      });

      const teamLogs = options.team_id 
        ? await this.getTeamAuditTrail(options.team_id, {
            start_date: options.start_date,
            end_date: options.end_date,
            limit: 10000
          })
        : [];

      const securityEvents = await this.getSecurityEvents({
        start_date: options.start_date,
        end_date: options.end_date,
        limit: 10000
      });

      const report = {
        metadata: {
          generated_at: new Date().toISOString(),
          start_date: options.start_date,
          end_date: options.end_date,
          team_id: options.team_id,
          total_permission_checks: auditLogs.length,
          total_team_activities: teamLogs.length,
          total_security_events: securityEvents.length
        },
        permission_audit_logs: auditLogs,
        team_activity_logs: teamLogs,
        security_events: securityEvents
      };

      if (options.format === 'csv') {
        // Convert to CSV format (simplified implementation)
        return this.convertToCSV(report);
      }

      return report;
    } catch (error) {
      console.error('Audit report export error:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics for dashboard
   */
  static async getAuditStats(teamId?: string): Promise<any> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Get permission checks in last 24 hours
      const recentChecks = await this.getAuditTrail({
        start_date: twentyFourHoursAgo,
        team_id: teamId,
        limit: 10000
      });

      // Get denied permissions in last 7 days
      const deniedChecks = await this.getAuditTrail({
        action: 'denied',
        start_date: sevenDaysAgo,
        team_id: teamId,
        limit: 1000
      });

      // Get security events in last 7 days
      const securityEvents = await this.getSecurityEvents({
        start_date: sevenDaysAgo,
        limit: 1000
      });

      return {
        total_checks_24h: recentChecks.length,
        denied_checks_7d: deniedChecks.length,
        security_events_7d: securityEvents.length,
        most_checked_permissions: this.aggregatePermissions(recentChecks),
        recent_denied_permissions: deniedChecks.slice(0, 10),
        critical_security_events: securityEvents.filter(e => e.severity === 'critical')
      };
    } catch (error) {
      console.error('Audit stats error:', error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private static aggregatePermissions(logs: any[]): Array<{ permission: string; count: number }> {
    const permissionCounts = logs.reduce((acc, log) => {
      acc[log.permission_slug] = (acc[log.permission_slug] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(permissionCounts)
      .map(([permission, count]) => ({ permission, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private static convertToCSV(report: any): string {
    // Simplified CSV conversion - in production, use a proper CSV library
    const headers = ['timestamp', 'user_id', 'action', 'permission', 'resource_type', 'granted'];
    const rows = report.permission_audit_logs.map((log: any) => [
      log.created_at,
      log.user_id,
      log.action,
      log.permission_slug,
      log.resource_type || '',
      log.metadata?.granted || false
    ]);

    return [headers.join(','), ...rows.map((row: any[]) => row.join(','))].join('\n');
  }
}

export const auditService = AuditService;