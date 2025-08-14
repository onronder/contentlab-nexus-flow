import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsEvent {
  userId?: string;
  sessionId?: string;
  eventType: string;
  eventName: string;
  eventProperties?: Record<string, any>;
  pagePath?: string;
  userAgent?: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  deviceType?: string;
  browser?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface BusinessMetric {
  teamId?: string;
  projectId?: string;
  metricCategory: 'revenue' | 'conversion' | 'growth' | 'engagement';
  metricName: string;
  metricValue: number;
  targetValue?: number;
  previousPeriodValue?: number;
  changePercentage?: number;
  currency?: string;
  timePeriod: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  metricDate: string;
  segmentFilters?: Record<string, any>;
  calculatedFields?: Record<string, any>;
  dataQualityScore?: number;
  isForecast?: boolean;
  confidenceInterval?: Record<string, any>;
}

export interface CustomEvent {
  teamId?: string;
  projectId?: string;
  userId?: string;
  eventName: string;
  eventCategory?: string;
  eventValue?: number;
  eventProperties?: Record<string, any>;
  entityType?: string;
  entityId?: string;
  sourceComponent?: string;
  sessionId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export interface SystemMetric {
  metricName: string;
  metricValue: number;
  metricUnit?: string;
  dimensions?: Record<string, any>;
  aggregationPeriod?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  metadata?: Record<string, any>;
}

export class AdvancedAnalyticsService {
  // Track user behavior and interactions
  async trackUserEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('analytics-processor', {
        body: {
          event: 'user_action',
          data: event
        }
      });

      if (error) {
        console.error('Error tracking user event:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to track user event:', error);
      throw error;
    }
  }

  // Record business metrics
  async recordBusinessMetric(metric: BusinessMetric): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('analytics-processor', {
        body: {
          event: 'business_event',
          data: metric
        }
      });

      if (error) {
        console.error('Error recording business metric:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to record business metric:', error);
      throw error;
    }
  }

  // Track custom events
  async trackCustomEvent(event: CustomEvent): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('analytics-processor', {
        body: {
          event: 'custom_event',
          data: event
        }
      });

      if (error) {
        console.error('Error tracking custom event:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to track custom event:', error);
      throw error;
    }
  }

  // Record system metrics
  async recordSystemMetric(metric: SystemMetric): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('analytics-processor', {
        body: {
          event: 'system_metric',
          data: metric
        }
      });

      if (error) {
        console.error('Error recording system metric:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to record system metric:', error);
      throw error;
    }
  }

  // Aggregate business metrics
  async aggregateBusinessMetrics(filters: {
    teamId?: string;
    projectId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('metrics-aggregator', {
        body: {
          operation: 'business_metrics',
          filters
        }
      });

      if (error) {
        console.error('Error aggregating business metrics:', error);
        throw error;
      }

      return data.data;
    } catch (error) {
      console.error('Failed to aggregate business metrics:', error);
      throw error;
    }
  }

  // Get user engagement analytics
  async getUserEngagementAnalytics(filters: {
    teamId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('metrics-aggregator', {
        body: {
          operation: 'user_engagement',
          filters
        }
      });

      if (error) {
        console.error('Error getting user engagement analytics:', error);
        throw error;
      }

      return data.data;
    } catch (error) {
      console.error('Failed to get user engagement analytics:', error);
      throw error;
    }
  }

  // Get system performance analytics
  async getSystemPerformanceAnalytics(filters: {
    startDate?: string;
    endDate?: string;
    metricNames?: string[];
  }): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('metrics-aggregator', {
        body: {
          operation: 'system_performance',
          filters
        }
      });

      if (error) {
        console.error('Error getting system performance analytics:', error);
        throw error;
      }

      return data.data;
    } catch (error) {
      console.error('Failed to get system performance analytics:', error);
      throw error;
    }
  }

  // Get custom events analytics
  async getCustomEventsAnalytics(filters: {
    teamId?: string;
    projectId?: string;
    eventNames?: string[];
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('metrics-aggregator', {
        body: {
          operation: 'custom_events',
          filters
        }
      });

      if (error) {
        console.error('Error getting custom events analytics:', error);
        throw error;
      }

      return data.data;
    } catch (error) {
      console.error('Failed to get custom events analytics:', error);
      throw error;
    }
  }

  // Generate AI-powered insights
  async generateInsights(filters: {
    teamId?: string;
    projectId?: string;
    insightTypes?: string[];
  }): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('insights-generator', {
        body: filters
      });

      if (error) {
        console.error('Error generating insights:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to generate insights:', error);
      throw error;
    }
  }

  // Get analytics insights from database
  async getAnalyticsInsights(filters: {
    teamId?: string;
    projectId?: string;
    insightTypes?: string[];
    impactLevels?: string[];
    limit?: number;
  }): Promise<any> {
    try {
      let query = supabase
        .from('analytics_insights')
        .select('*')
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false });

      if (filters.teamId) {
        query = query.eq('team_id', filters.teamId);
      }

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      if (filters.insightTypes && filters.insightTypes.length > 0) {
        query = query.in('insight_type', filters.insightTypes);
      }

      if (filters.impactLevels && filters.impactLevels.length > 0) {
        query = query.in('impact_level', filters.impactLevels);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching analytics insights:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch analytics insights:', error);
      throw error;
    }
  }

  // Dismiss an insight
  async dismissInsight(insightId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('analytics_insights')
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString()
        })
        .eq('id', insightId);

      if (error) {
        console.error('Error dismissing insight:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to dismiss insight:', error);
      throw error;
    }
  }

  // Calculate user engagement score
  async calculateUserEngagementScore(userId: string, days: number = 30): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('calculate_user_engagement_score', {
          p_user_id: userId,
          p_days: days
        });

      if (error) {
        console.error('Error calculating engagement score:', error);
        throw error;
      }

      return data || 0;
    } catch (error) {
      console.error('Failed to calculate engagement score:', error);
      throw error;
    }
  }

  // Track page view
  async trackPageView(pagePath: string, additionalData?: Partial<AnalyticsEvent>): Promise<void> {
    const event: AnalyticsEvent = {
      eventType: 'page_view',
      eventName: 'page_view',
      pagePath,
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
      deviceType: this.getDeviceType(),
      browser: this.getBrowser(),
      referrer: document.referrer,
      ...additionalData
    };

    await this.trackUserEvent(event);
  }

  // Track user interaction
  async trackInteraction(component: string, action: string, properties?: Record<string, any>): Promise<void> {
    const event: AnalyticsEvent = {
      eventType: 'interaction',
      eventName: `${component}_${action}`,
      eventProperties: {
        component,
        action,
        ...properties
      },
      sessionId: this.getSessionId(),
      pagePath: window.location.pathname
    };

    await this.trackUserEvent(event);
  }

  // Utility methods
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  private getDeviceType(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
      return 'mobile';
    } else if (/tablet|ipad/i.test(userAgent)) {
      return 'tablet';
    }
    return 'desktop';
  }

  private getBrowser(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome')) return 'chrome';
    if (userAgent.includes('firefox')) return 'firefox';
    if (userAgent.includes('safari')) return 'safari';
    if (userAgent.includes('edge')) return 'edge';
    return 'unknown';
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();