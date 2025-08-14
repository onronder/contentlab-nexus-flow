/**
 * Centralized Error Tracking & Alerting Service
 * Production-grade error management with smart alerting and trend analysis
 */
import { errorMonitoring, ErrorContext } from '@/utils/errorMonitoring';
import { productionLogger } from '@/utils/logger';

export interface ErrorAlert {
  id: string;
  errorType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  count: number;
  firstOccurred: Date;
  lastOccurred: Date;
  contexts: ErrorContext[];
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  resolvedBy?: string;
  estimatedImpact: 'minimal' | 'low' | 'medium' | 'high';
}

export interface AlertRule {
  id: string;
  name: string;
  condition: {
    errorType?: string;
    severity?: string;
    frequency: number;
    timeWindow: number; // minutes
  };
  action: {
    type: 'email' | 'slack' | 'webhook' | 'dashboard';
    target: string;
    cooldown: number; // minutes
  };
  isActive: boolean;
}

export interface ErrorTrend {
  period: string;
  errorCount: number;
  uniqueErrors: number;
  topErrors: Array<{
    type: string;
    count: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
  impactedUsers: number;
  resolvedErrors: number;
}

class ErrorTrackingService {
  private alerts: Map<string, ErrorAlert> = new Map();
  private alertRules: AlertRule[] = [];
  private alertCooldowns: Map<string, Date> = new Map();
  private errorTrends: ErrorTrend[] = [];
  
  constructor() {
    this.initializeDefaultRules();
    this.startTrendAnalysis();
  }

  /**
   * Track and analyze errors with smart deduplication
   */
  trackError(error: Error | string, context: ErrorContext = {}) {
    try {
      const errorObj = typeof error === 'string' ? new Error(error) : error;
      const errorKey = this.generateErrorKey(errorObj, context);
      
      // Check if this is a duplicate or new error
      let alert = this.alerts.get(errorKey);
      
      if (alert) {
        // Update existing alert
        alert.count++;
        alert.lastOccurred = new Date();
        alert.contexts.push(context);
        
        // Update severity based on frequency
        alert.severity = this.calculateSeverity(alert);
      } else {
        // Create new alert
        alert = {
          id: errorKey,
          errorType: this.categorizeError(errorObj),
          severity: this.determineSeverity(errorObj, context),
          message: errorObj.message,
          count: 1,
          firstOccurred: new Date(),
          lastOccurred: new Date(),
          contexts: [context],
          status: 'active',
          estimatedImpact: this.estimateImpact(errorObj, context)
        };
        
        this.alerts.set(errorKey, alert);
      }
      
      // Check alert rules
      this.checkAlertRules(alert);
      
      // Log to error monitoring
      errorMonitoring.logError(errorObj, context);
      
      return alert;
    } catch (err) {
      productionLogger.error('Failed to track error:', err);
    }
  }

  /**
   * Get current active alerts with filtering
   */
  getActiveAlerts(filters?: {
    severity?: string;
    status?: string;
    timeRange?: number; // hours
  }): ErrorAlert[] {
    let alerts = Array.from(this.alerts.values());
    
    if (filters) {
      if (filters.severity) {
        alerts = alerts.filter(a => a.severity === filters.severity);
      }
      if (filters.status) {
        alerts = alerts.filter(a => a.status === filters.status);
      }
      if (filters.timeRange) {
        const cutoff = new Date(Date.now() - filters.timeRange * 60 * 60 * 1000);
        alerts = alerts.filter(a => a.lastOccurred >= cutoff);
      }
    }
    
    return alerts.sort((a, b) => b.lastOccurred.getTime() - a.lastOccurred.getTime());
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, userId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && alert.status === 'active') {
      alert.status = 'acknowledged';
      alert.acknowledgedBy = userId;
      
      productionLogger.log(`Alert acknowledged: ${alertId} by ${userId}`);
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, userId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && alert.status !== 'resolved') {
      alert.status = 'resolved';
      alert.resolvedBy = userId;
      
      productionLogger.log(`Alert resolved: ${alertId} by ${userId}`);
      return true;
    }
    return false;
  }

  /**
   * Get error trends and analytics
   */
  getErrorTrends(period: 'hour' | 'day' | 'week' = 'day'): ErrorTrend[] {
    const now = new Date();
    const trends: ErrorTrend[] = [];
    
    for (let i = 0; i < 7; i++) {
      const periodStart = new Date(now);
      const periodEnd = new Date(now);
      
      if (period === 'hour') {
        periodStart.setHours(now.getHours() - i, 0, 0, 0);
        periodEnd.setHours(now.getHours() - i + 1, 0, 0, 0);
      } else if (period === 'day') {
        periodStart.setDate(now.getDate() - i);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setDate(now.getDate() - i + 1);
        periodEnd.setHours(0, 0, 0, 0);
      } else {
        periodStart.setDate(now.getDate() - i * 7);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setDate(now.getDate() - (i - 1) * 7);
        periodEnd.setHours(0, 0, 0, 0);
      }
      
      const periodAlerts = Array.from(this.alerts.values()).filter(
        alert => alert.firstOccurred >= periodStart && alert.firstOccurred < periodEnd
      );
      
      const errorCounts = new Map<string, number>();
      periodAlerts.forEach(alert => {
        errorCounts.set(alert.errorType, (errorCounts.get(alert.errorType) || 0) + alert.count);
      });
      
      trends.push({
        period: periodStart.toISOString(),
        errorCount: periodAlerts.reduce((sum, alert) => sum + alert.count, 0),
        uniqueErrors: periodAlerts.length,
        topErrors: Array.from(errorCounts.entries())
          .map(([type, count]) => ({ type, count, trend: 'stable' as const }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        impactedUsers: new Set(periodAlerts.flatMap(alert => 
          alert.contexts.map(ctx => ctx.userId).filter(Boolean)
        )).size,
        resolvedErrors: periodAlerts.filter(alert => alert.status === 'resolved').length
      });
    }
    
    return trends;
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const ruleId = this.generateId();
    this.alertRules.push({ ...rule, id: ruleId });
    return ruleId;
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics() {
    const alerts = Array.from(this.alerts.values());
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return {
      total: alerts.length,
      active: alerts.filter(a => a.status === 'active').length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      last24h: alerts.filter(a => a.lastOccurred >= last24h).length,
      averageResolutionTime: this.calculateAverageResolutionTime(),
      topErrorTypes: this.getTopErrorTypes(),
      impactedUsers: new Set(alerts.flatMap(alert => 
        alert.contexts.map(ctx => ctx.userId).filter(Boolean)
      )).size
    };
  }

  private initializeDefaultRules() {
    this.alertRules = [
      {
        id: 'critical-errors',
        name: 'Critical Error Alert',
        condition: { severity: 'critical', frequency: 1, timeWindow: 5 },
        action: { type: 'email', target: 'admin@company.com', cooldown: 15 },
        isActive: true
      },
      {
        id: 'high-frequency',
        name: 'High Frequency Errors',
        condition: { frequency: 10, timeWindow: 15 },
        action: { type: 'slack', target: '#alerts', cooldown: 30 },
        isActive: true
      },
      {
        id: 'auth-errors',
        name: 'Authentication Errors',
        condition: { errorType: 'authentication', frequency: 5, timeWindow: 10 },
        action: { type: 'dashboard', target: 'security', cooldown: 10 },
        isActive: true
      }
    ];
  }

  private generateErrorKey(error: Error, context: ErrorContext): string {
    const contextStr = `${context.component || 'unknown'}-${context.action || 'unknown'}`;
    return `${error.name}:${contextStr}:${error.message.substring(0, 50)}`;
  }

  private categorizeError(error: Error): string {
    if (error.message?.includes('permission') || error.message?.includes('auth')) {
      return 'authentication';
    }
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return 'network';
    }
    if (error.name === 'TypeError') {
      return 'type-error';
    }
    if (error.name === 'ReferenceError') {
      return 'reference-error';
    }
    return 'general';
  }

  private determineSeverity(error: Error, context: ErrorContext): 'low' | 'medium' | 'high' | 'critical' {
    if (context.severity) return context.severity;
    
    if (error.message?.includes('permission denied') || context.component === 'auth') {
      return 'critical';
    }
    if (error.message?.includes('network') || error.name === 'TypeError') {
      return 'high';
    }
    if (error.name === 'ReferenceError') {
      return 'medium';
    }
    return 'low';
  }

  private calculateSeverity(alert: ErrorAlert): 'low' | 'medium' | 'high' | 'critical' {
    const frequency = alert.count;
    const timeSpan = Date.now() - alert.firstOccurred.getTime();
    const hourlyRate = (frequency / timeSpan) * (60 * 60 * 1000);
    
    if (hourlyRate > 50 || alert.severity === 'critical') return 'critical';
    if (hourlyRate > 20) return 'high';
    if (hourlyRate > 5) return 'medium';
    return 'low';
  }

  private estimateImpact(error: Error, context: ErrorContext): 'minimal' | 'low' | 'medium' | 'high' {
    if (context.component === 'auth' || error.message?.includes('permission')) {
      return 'high';
    }
    if (context.component === 'database' || error.message?.includes('network')) {
      return 'medium';
    }
    return 'low';
  }

  private checkAlertRules(alert: ErrorAlert) {
    this.alertRules.filter(rule => rule.isActive).forEach(rule => {
      if (this.shouldTriggerAlert(alert, rule)) {
        this.triggerAlert(alert, rule);
      }
    });
  }

  private shouldTriggerAlert(alert: ErrorAlert, rule: AlertRule): boolean {
    const cooldownKey = `${rule.id}-${alert.id}`;
    const lastTriggered = this.alertCooldowns.get(cooldownKey);
    
    if (lastTriggered && 
        Date.now() - lastTriggered.getTime() < rule.action.cooldown * 60 * 1000) {
      return false;
    }

    if (rule.condition.severity && alert.severity !== rule.condition.severity) {
      return false;
    }

    if (rule.condition.errorType && alert.errorType !== rule.condition.errorType) {
      return false;
    }

    const timeWindow = rule.condition.timeWindow * 60 * 1000;
    const recentErrors = alert.count; // Simplified for now
    
    return recentErrors >= rule.condition.frequency;
  }

  private triggerAlert(alert: ErrorAlert, rule: AlertRule) {
    const cooldownKey = `${rule.id}-${alert.id}`;
    this.alertCooldowns.set(cooldownKey, new Date());
    
    productionLogger.errorWithContext(
      `Alert triggered: ${rule.name}`,
      'ErrorTracking',
      { alert, rule }
    );
    
    // Implement actual alerting mechanisms here
    this.sendAlert(alert, rule);
  }

  private sendAlert(alert: ErrorAlert, rule: AlertRule) {
    // This would integrate with actual alerting systems
    // For now, just log the alert
    productionLogger.error(
      `🚨 ALERT: ${rule.name} - ${alert.message} (Count: ${alert.count})`
    );
  }

  private calculateAverageResolutionTime(): number {
    const resolvedAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.status === 'resolved');
    
    if (resolvedAlerts.length === 0) return 0;
    
    const totalTime = resolvedAlerts.reduce((sum, alert) => {
      return sum + (alert.lastOccurred.getTime() - alert.firstOccurred.getTime());
    }, 0);
    
    return totalTime / resolvedAlerts.length / (60 * 1000); // minutes
  }

  private getTopErrorTypes(): Array<{ type: string; count: number }> {
    const typeCounts = new Map<string, number>();
    
    Array.from(this.alerts.values()).forEach(alert => {
      typeCounts.set(alert.errorType, (typeCounts.get(alert.errorType) || 0) + alert.count);
    });
    
    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private startTrendAnalysis() {
    // Run trend analysis every hour
    setInterval(() => {
      this.errorTrends = this.getErrorTrends('hour');
    }, 60 * 60 * 1000);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// Export singleton instance
export const errorTrackingService = new ErrorTrackingService();

// Integration functions for production monitoring
export const trackErrorToDatabase = async (error: Error | string, context: ErrorContext = {}) => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const errorData = {
      error_type: error instanceof Error ? error.name || 'Error' : 'CustomError',
      error_message: error instanceof Error ? error.message : error,
      error_stack: error instanceof Error ? error.stack : undefined,
      severity: context.severity || 'medium',
      context: context,
      user_agent: navigator?.userAgent,
      url: window?.location?.href,
      fingerprint: context.fingerprint,
      user_id: context.userId,
      team_id: context.teamId,
      project_id: context.projectId
    };

    const response = await supabase.functions.invoke('error-tracker', {
      body: errorData
    });

    if (response.error) {
      console.error('Failed to track error to database:', response.error);
    }

    return response;
  } catch (err) {
    console.error('Error tracking to database failed:', err);
  }
};

export const getErrorsFromDatabase = async (filters: {
  userId?: string;
  teamId?: string;
  severity?: string;
  limit?: number;
} = {}) => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const params = new URLSearchParams();
    if (filters.userId) params.append('user_id', filters.userId);
    if (filters.teamId) params.append('team_id', filters.teamId);
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await supabase.functions.invoke('error-tracker', {
      method: 'GET',
      body: undefined
    });

    return response;
  } catch (err) {
    console.error('Failed to get errors from database:', err);
    return { data: null, error: err };
  }
};

// Helper functions for common error tracking scenarios
export const trackDatabaseError = (error: Error | string, operation: string, metadata?: any) => {
  return errorTrackingService.trackError(error, {
    component: 'database',
    action: operation,
    metadata,
    severity: 'high'
  });
};

export const trackAuthError = (error: Error | string, action: string, metadata?: any) => {
  return errorTrackingService.trackError(error, {
    component: 'auth',
    action,
    metadata,
    severity: 'critical'
  });
};

export const trackUIError = (error: Error | string, component: string, metadata?: any) => {
  return errorTrackingService.trackError(error, {
    component: 'ui',
    action: component,
    metadata,
    severity: 'medium'
  });
};

export const trackNetworkError = (error: Error | string, endpoint: string, metadata?: any) => {
  return errorTrackingService.trackError(error, {
    component: 'network',
    action: endpoint,
    metadata,
    severity: 'high'
  });
};