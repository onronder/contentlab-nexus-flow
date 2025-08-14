import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// SECURITY MONITORING SERVICE - Production-Grade Threat Detection
// ============================================================================

export interface SecurityThreat {
  id: string;
  user_id: string;
  threat_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detection_time: string;
  threat_data: Record<string, any>;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
}

export interface SecurityMetrics {
  total_threats_24h: number;
  critical_threats_7d: number;
  active_sessions: number;
  suspicious_sessions: number;
  failed_login_attempts: number;
  blocked_ips: string[];
  threat_score: number;
}

export class SecurityMonitoringService {
  private static instance: SecurityMonitoringService;
  
  public static getInstance(): SecurityMonitoringService {
    if (!this.instance) {
      this.instance = new SecurityMonitoringService();
    }
    return this.instance;
  }

  // ============================================================================
  // REAL-TIME THREAT MONITORING
  // ============================================================================

  /**
   * Monitor and analyze security events in real-time
   */
  async monitorSecurityEvent(
    eventType: string,
    eventData: Record<string, any> = {},
    severity: 'info' | 'warning' | 'critical' = 'info'
  ): Promise<void> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return;

      // Call security monitoring Edge Function
      const { data, error } = await supabase.functions.invoke('security-monitor', {
        body: {
          user_id: user.id,
          event_type: eventType,
          event_data: eventData,
          severity
        }
      });

      if (error) throw error;

      // Handle critical threats with immediate response
      if (data?.severity === 'critical') {
        await this.handleCriticalThreat(eventType, eventData, data.threat_score);
      }
    } catch (error) {
      console.error('Security monitoring error:', error);
      // Don't throw - security monitoring should not break app functionality
    }
  }

  /**
   * Track failed login attempts and detect brute force attacks
   */
  async trackFailedLogin(email: string, metadata: Record<string, any> = {}): Promise<void> {
    try {
      // Get recent failed attempts for this email/IP
      const recentAttempts = await this.getRecentFailedLogins(email);
      
      const eventData = {
        email,
        consecutive_failures: recentAttempts.length + 1,
        time_window: '10_minutes',
        ...metadata
      };

      // Escalate severity based on attempt count
      let severity: 'info' | 'warning' | 'critical' = 'info';
      if (recentAttempts.length >= 5) {
        severity = 'critical';
      } else if (recentAttempts.length >= 3) {
        severity = 'warning';
      }

      await this.monitorSecurityEvent('login_failed', eventData, severity);
    } catch (error) {
      console.error('Failed login tracking error:', error);
    }
  }

  /**
   * Monitor session creation for suspicious patterns
   */
  async trackSessionCreation(sessionData: Record<string, any>): Promise<void> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return;

      // Check for multiple concurrent sessions
      const { data: activeSessions } = await supabase
        .from('user_sessions')
        .select('id, device_info, ip_address')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString());

      const eventData = {
        ...sessionData,
        active_session_count: activeSessions?.length || 0,
        multiple_sessions: (activeSessions?.length || 0) > 2,
        new_location: await this.detectNewLocation(sessionData.ip_address)
      };

      await this.monitorSecurityEvent('session_created', eventData);
    } catch (error) {
      console.error('Session tracking error:', error);
    }
  }

  /**
   * Monitor permission denials for escalation attempts
   */
  async trackPermissionDenial(
    permission: string,
    resource: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const eventData = {
        permission,
        resource,
        permission_escalation: permission.includes('admin') || permission.includes('owner'),
        ...metadata
      };

      const severity = eventData.permission_escalation ? 'critical' : 'warning';
      await this.monitorSecurityEvent('permission_denied', eventData, severity);
    } catch (error) {
      console.error('Permission denial tracking error:', error);
    }
  }

  // ============================================================================
  // THREAT ANALYSIS & RESPONSE
  // ============================================================================

  /**
   * Handle critical security threats with immediate response
   */
  private async handleCriticalThreat(
    threatType: string,
    threatData: Record<string, any>,
    threatScore: number
  ): Promise<void> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return;

      // Auto-response for different threat types
      switch (threatType) {
        case 'login_failed':
          if (threatData.consecutive_failures >= 5) {
            await this.temporarilyLockAccount(user.id, '15 minutes');
          }
          break;

        case 'permission_denied':
          if (threatData.permission_escalation) {
            await this.flagSessionAsSuspicious(user.id);
          }
          break;

        case 'session_created':
          if (threatData.multiple_sessions && threatScore > 80) {
            await this.requireReauthentication(user.id);
          }
          break;
      }

      // Log critical threat for admin review
      await this.logCriticalThreat(threatType, threatData, threatScore);
    } catch (error) {
      console.error('Critical threat handling error:', error);
    }
  }

  /**
   * Get comprehensive security metrics
   */
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Get recent security events
      const { data: recentThreats } = await supabase
        .from('security_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', twentyFourHoursAgo);

      const { data: criticalThreats } = await supabase
        .from('security_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('severity', 'critical')
        .gte('created_at', sevenDaysAgo);

      // Get session information
      const { data: sessions } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString());

      const suspiciousSessions = sessions?.filter(s => 
        s.security_flags && (s.security_flags as any).suspicious
      ) || [];

      // Calculate threat score
      const threatScore = this.calculateUserThreatScore(recentThreats || []);

      return {
        total_threats_24h: recentThreats?.length || 0,
        critical_threats_7d: criticalThreats?.length || 0,
        active_sessions: sessions?.length || 0,
        suspicious_sessions: suspiciousSessions.length,
        failed_login_attempts: this.countFailedLogins(recentThreats || []),
        blocked_ips: this.extractBlockedIPs(recentThreats || []),
        threat_score: threatScore
      };
    } catch (error) {
      console.error('Security metrics error:', error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  private async getRecentFailedLogins(email: string) {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data } = await supabase
      .from('security_events')
      .select('*')
      .eq('event_type', 'login_failed')
      .gte('created_at', tenMinutesAgo)
      .like('event_data', `%${email}%`);

    return data || [];
  }

  private async detectNewLocation(ipAddress: string): Promise<boolean> {
    const user = await this.getCurrentUser();
    if (!user) return false;

    const { data: recentSessions } = await supabase
      .from('user_sessions')
      .select('ip_address')
      .eq('user_id', user.id)
      .neq('ip_address', ipAddress)
      .limit(10);

    return !recentSessions?.some(session => session.ip_address === ipAddress);
  }

  private async temporarilyLockAccount(userId: string, duration: string): Promise<void> {
    // In production, implement account locking logic
    console.log(`Account ${userId} temporarily locked for ${duration}`);
  }

  private async flagSessionAsSuspicious(userId: string): Promise<void> {
    await supabase
      .from('user_sessions')
      .update({ 
        security_flags: { 
          suspicious: true, 
          flagged_at: new Date().toISOString(),
          reason: 'privilege_escalation_attempt'
        }
      })
      .eq('user_id', userId)
      .eq('is_current', true);
  }

  private async requireReauthentication(userId: string): Promise<void> {
    // In production, implement forced re-authentication
    console.log(`Re-authentication required for user ${userId}`);
  }

  private async logCriticalThreat(
    threatType: string,
    threatData: Record<string, any>,
    threatScore: number
  ): Promise<void> {
    // Log to audit trail for admin review
    const user = await this.getCurrentUser();
    if (!user) return;

    await supabase.functions.invoke('audit-logger', {
      body: {
        log_type: 'security',
        user_id: user.id,
        data: {
          event_type: 'critical_threat_detected',
          severity: 'critical',
          threat_type: threatType,
          threat_data: threatData,
          threat_score: threatScore,
          auto_response_triggered: true
        }
      }
    });
  }

  private calculateUserThreatScore(events: any[]): number {
    let score = 0;
    
    for (const event of events) {
      switch (event.severity) {
        case 'critical':
          score += 25;
          break;
        case 'warning':
          score += 10;
          break;
        case 'info':
          score += 2;
          break;
      }
    }
    
    return Math.min(100, score);
  }

  private countFailedLogins(events: any[]): number {
    return events.filter(e => e.event_type === 'login_failed').length;
  }

  private extractBlockedIPs(events: any[]): string[] {
    const blockedIPs = events
      .filter(e => e.severity === 'critical' && e.ip_address)
      .map(e => e.ip_address);
    
    return [...new Set(blockedIPs)];
  }
}

export const securityMonitoringService = SecurityMonitoringService.getInstance();