/**
 * API Monitoring Service for tracking usage, costs, and performance
 * Provides comprehensive analytics for OpenAI API usage optimization
 */

import { supabase } from '@/integrations/supabase/client';

export interface ApiUsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  estimatedCost: number;
  period: 'hour' | 'day' | 'week' | 'month';
  timestamp: Date;
}

export interface ApiUsageEvent {
  id: string;
  timestamp: Date;
  endpoint: string;
  method: string;
  status: number;
  responseTime: number;
  tokensUsed: number;
  cost: number;
  userId?: string;
  projectId?: string;
  errorMessage?: string;
}

export interface CostBreakdown {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export interface UsageAlert {
  id: string;
  type: 'quota_warning' | 'cost_threshold' | 'error_rate' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  acknowledged: boolean;
}

export class ApiMonitoringService {
  private static instance: ApiMonitoringService;
  private usageEvents: ApiUsageEvent[] = [];
  private readonly MAX_EVENTS = 1000;
  private costThresholds = {
    daily: 10.00,
    weekly: 50.00,
    monthly: 200.00
  };

  static getInstance(): ApiMonitoringService {
    if (!ApiMonitoringService.instance) {
      ApiMonitoringService.instance = new ApiMonitoringService();
    }
    return ApiMonitoringService.instance;
  }

  private constructor() {
    this.loadStoredEvents();
    this.startPeriodicCleanup();
  }

  /**
   * Record an API usage event
   */
  recordUsage(event: Omit<ApiUsageEvent, 'id' | 'timestamp'>): void {
    const usageEvent: ApiUsageEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    };

    this.usageEvents.push(usageEvent);
    
    // Keep only recent events
    if (this.usageEvents.length > this.MAX_EVENTS) {
      this.usageEvents = this.usageEvents.slice(-this.MAX_EVENTS);
    }

    // Store to localStorage for persistence
    this.persistEvents();
    
    // Check for alerts
    this.checkUsageAlerts(usageEvent);
  }

  /**
   * Get usage metrics for a specific time period
   */
  getUsageMetrics(period: 'hour' | 'day' | 'week' | 'month' = 'day'): ApiUsageMetrics {
    const now = new Date();
    const startTime = this.getStartTime(now, period);
    
    const periodEvents = this.usageEvents.filter(
      event => event.timestamp >= startTime
    );

    const totalRequests = periodEvents.length;
    const successfulRequests = periodEvents.filter(e => e.status >= 200 && e.status < 300).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const averageResponseTime = totalRequests > 0 
      ? periodEvents.reduce((sum, e) => sum + e.responseTime, 0) / totalRequests 
      : 0;
    
    const totalTokensUsed = periodEvents.reduce((sum, e) => sum + e.tokensUsed, 0);
    const estimatedCost = periodEvents.reduce((sum, e) => sum + e.cost, 0);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      totalTokensUsed,
      estimatedCost,
      period,
      timestamp: now
    };
  }

  /**
   * Get detailed cost breakdown
   */
  getCostBreakdown(period: 'hour' | 'day' | 'week' | 'month' = 'day'): CostBreakdown {
    const now = new Date();
    const startTime = this.getStartTime(now, period);
    
    const periodEvents = this.usageEvents.filter(
      event => event.timestamp >= startTime
    );

    // Estimate input/output token split (typical ratio is 70% input, 30% output)
    const totalTokens = periodEvents.reduce((sum, e) => sum + e.tokensUsed, 0);
    const inputTokens = Math.floor(totalTokens * 0.7);
    const outputTokens = totalTokens - inputTokens;
    
    // OpenAI pricing (approximate): $0.03 per 1K input tokens, $0.06 per 1K output tokens
    const inputCost = (inputTokens / 1000) * 0.03;
    const outputCost = (outputTokens / 1000) * 0.06;
    const totalCost = inputCost + outputCost;

    return {
      inputTokens,
      outputTokens,
      inputCost,
      outputCost,
      totalCost
    };
  }

  /**
   * Get usage trends over time
   */
  getUsageTrends(days: number = 7): ApiUsageMetrics[] {
    const trends: ApiUsageMetrics[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayEvents = this.usageEvents.filter(
        event => event.timestamp >= date && event.timestamp < nextDate
      );

      const metrics: ApiUsageMetrics = {
        totalRequests: dayEvents.length,
        successfulRequests: dayEvents.filter(e => e.status >= 200 && e.status < 300).length,
        failedRequests: dayEvents.filter(e => e.status >= 400).length,
        averageResponseTime: dayEvents.length > 0 
          ? dayEvents.reduce((sum, e) => sum + e.responseTime, 0) / dayEvents.length 
          : 0,
        totalTokensUsed: dayEvents.reduce((sum, e) => sum + e.tokensUsed, 0),
        estimatedCost: dayEvents.reduce((sum, e) => sum + e.cost, 0),
        period: 'day',
        timestamp: date
      };

      trends.push(metrics);
    }

    return trends;
  }

  /**
   * Get current usage alerts
   */
  getUsageAlerts(): UsageAlert[] {
    const alerts: UsageAlert[] = [];
    const dailyMetrics = this.getUsageMetrics('day');
    const hourlyMetrics = this.getUsageMetrics('hour');

    // Cost threshold alerts
    if (dailyMetrics.estimatedCost > this.costThresholds.daily) {
      alerts.push({
        id: 'daily_cost_exceeded',
        type: 'cost_threshold',
        severity: 'high',
        message: `Daily cost limit exceeded: $${dailyMetrics.estimatedCost.toFixed(2)}`,
        threshold: this.costThresholds.daily,
        currentValue: dailyMetrics.estimatedCost,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Error rate alerts
    const errorRate = dailyMetrics.totalRequests > 0 
      ? dailyMetrics.failedRequests / dailyMetrics.totalRequests 
      : 0;
    
    if (errorRate > 0.1) {
      alerts.push({
        id: 'high_error_rate',
        type: 'error_rate',
        severity: errorRate > 0.3 ? 'critical' : 'medium',
        message: `High error rate detected: ${(errorRate * 100).toFixed(1)}%`,
        threshold: 0.1,
        currentValue: errorRate,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Performance alerts
    if (hourlyMetrics.averageResponseTime > 10000) { // 10 seconds
      alerts.push({
        id: 'slow_response_time',
        type: 'performance',
        severity: 'medium',
        message: `Slow API response times: ${hourlyMetrics.averageResponseTime}ms average`,
        threshold: 10000,
        currentValue: hourlyMetrics.averageResponseTime,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    return alerts;
  }

  /**
   * Get recent usage events (most recent first)
   */
  getRecentEvents(limit: number = 50): ApiUsageEvent[] {
    return [...this.usageEvents].slice(-limit).reverse();
  }

  /**
   * Export usage data for analysis
   */
  exportUsageData(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = 'Timestamp,Endpoint,Method,Status,Response Time,Tokens Used,Cost,Error Message';
      const rows = this.usageEvents.map(event => 
        `${event.timestamp.toISOString()},${event.endpoint},${event.method},${event.status},${event.responseTime},${event.tokensUsed},${event.cost},\"${event.errorMessage || ''}\"`
      );
      return [headers, ...rows].join('\n');
    }

    return JSON.stringify(this.usageEvents, null, 2);
  }

  /**
   * Clear usage data (for privacy/storage management)
   */
  clearUsageData(): void {
    this.usageEvents = [];
    this.persistEvents();
  }

  /**
   * Update cost thresholds
   */
  updateCostThresholds(thresholds: Partial<typeof this.costThresholds>): void {
    this.costThresholds = { ...this.costThresholds, ...thresholds };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const weeklyMetrics = this.getUsageMetrics('week');
    const dailyTrends = this.getUsageTrends(7);

    // Cost optimization
    if (weeklyMetrics.estimatedCost > this.costThresholds.weekly) {
      recommendations.push('Consider implementing more aggressive caching to reduce API calls');
      recommendations.push('Review analysis frequency - some competitors may not need daily updates');
    }

    // Performance optimization
    const avgResponseTime = weeklyMetrics.averageResponseTime;
    if (avgResponseTime > 5000) {
      recommendations.push('API response times are high - consider implementing request batching');
      recommendations.push('Monitor circuit breaker effectiveness and adjust thresholds if needed');
    }

    // Error rate optimization
    const errorRate = weeklyMetrics.totalRequests > 0 
      ? weeklyMetrics.failedRequests / weeklyMetrics.totalRequests 
      : 0;
    
    if (errorRate > 0.05) {
      recommendations.push('High error rate detected - review error handling and retry logic');
      recommendations.push('Consider implementing more robust fallback mechanisms');
    }

    // Usage pattern optimization
    const peakUsageDay = dailyTrends.reduce((max, day) => 
      day.totalRequests > max.totalRequests ? day : max
    );
    
    if (peakUsageDay.totalRequests > weeklyMetrics.totalRequests * 0.4) {
      recommendations.push('Usage is concentrated on specific days - consider load balancing');
    }

    return recommendations;
  }

  // Private helper methods

  private getStartTime(now: Date, period: 'hour' | 'day' | 'week' | 'month'): Date {
    const startTime = new Date(now);
    
    switch (period) {
      case 'hour':
        startTime.setHours(startTime.getHours() - 1);
        break;
      case 'day':
        startTime.setDate(startTime.getDate() - 1);
        break;
      case 'week':
        startTime.setDate(startTime.getDate() - 7);
        break;
      case 'month':
        startTime.setMonth(startTime.getMonth() - 1);
        break;
    }
    
    return startTime;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadStoredEvents(): void {
    try {
      const stored = localStorage.getItem('api_usage_events');
      if (stored) {
        const events = JSON.parse(stored);
        this.usageEvents = events.map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load stored usage events:', error);
    }
  }

  private persistEvents(): void {
    try {
      localStorage.setItem('api_usage_events', JSON.stringify(this.usageEvents));
    } catch (error) {
      console.warn('Failed to persist usage events:', error);
    }
  }

  private checkUsageAlerts(event: ApiUsageEvent): void {
    // This could trigger notifications or other alert mechanisms
    const alerts = this.getUsageAlerts();
    
    // Log critical alerts
    alerts.filter(alert => alert.severity === 'critical').forEach(alert => {
      console.warn('Critical API usage alert:', alert.message);
    });
  }

  private startPeriodicCleanup(): void {
    // Clean up old events every hour
    setInterval(() => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      this.usageEvents = this.usageEvents.filter(
        event => event.timestamp > oneWeekAgo
      );
      
      this.persistEvents();
    }, 60 * 60 * 1000); // 1 hour
  }
}

export const apiMonitoringService = ApiMonitoringService.getInstance();
