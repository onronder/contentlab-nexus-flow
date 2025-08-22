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

// Event batching and debouncing
class AnalyticsBatcher {
  private eventQueue: Array<{ event: string; data: any }> = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY = 500; // 500ms

  addEvent(event: string, data: any) {
    this.eventQueue.push({ event, data });
    
    if (this.eventQueue.length >= this.BATCH_SIZE) {
      this.flush();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.flush(), this.BATCH_DELAY);
    }
  }

  private async flush() {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    try {
      await this.sendBatch(events);
    } catch (error) {
      console.error('Failed to send analytics batch:', error);
      // Add to offline queue for retry
      this.addToOfflineQueue(events);
    }
  }

  private async sendBatch(events: Array<{ event: string; data: any }>) {
    const { error } = await supabase.functions.invoke('analytics-processor', {
      body: {
        event: 'batch_events',
        data: events
      }
    });

    if (error) {
      throw error;
    }
  }

  private addToOfflineQueue(events: Array<{ event: string; data: any }>) {
    try {
      const offlineQueue = JSON.parse(localStorage.getItem('analytics_offline_queue') || '[]');
      offlineQueue.push(...events);
      
      // Limit offline queue size
      if (offlineQueue.length > 100) {
        offlineQueue.splice(0, offlineQueue.length - 100);
      }
      
      localStorage.setItem('analytics_offline_queue', JSON.stringify(offlineQueue));
    } catch (error) {
      console.error('Failed to save to offline queue:', error);
    }
  }

  // Process offline queue when back online
  async processOfflineQueue() {
    try {
      const offlineQueue = JSON.parse(localStorage.getItem('analytics_offline_queue') || '[]');
      if (offlineQueue.length === 0) return;

      await this.sendBatch(offlineQueue);
      localStorage.removeItem('analytics_offline_queue');
    } catch (error) {
      console.error('Failed to process offline queue:', error);
    }
  }
}

// Request debouncing for high-frequency events
class RequestDebouncer {
  private timeouts = new Map<string, NodeJS.Timeout>();
  private readonly DEBOUNCE_DELAY = 500; // 500ms

  debounce<T extends any[]>(key: string, fn: (...args: T) => Promise<void>, ...args: T) {
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key)!);
    }

    const timeout = setTimeout(async () => {
      this.timeouts.delete(key);
      try {
        await fn(...args);
      } catch (error) {
        console.error(`Debounced function failed for key ${key}:`, error);
      }
    }, this.DEBOUNCE_DELAY);

    this.timeouts.set(key, timeout);
  }
}

export class AdvancedAnalyticsService {
  private batcher = new AnalyticsBatcher();
  private debouncer = new RequestDebouncer();
  private isOnline = navigator.onLine;

  constructor() {
    // Monitor online status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.batcher.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Process offline queue on init
    if (this.isOnline) {
      this.batcher.processOfflineQueue();
    }
  }

  // Track user behavior and interactions with debouncing
  async trackUserEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Debounce page views and high-frequency events
      if (event.eventType === 'page_view') {
        this.debouncer.debounce(
          `page_view_${event.pagePath}`,
          this.sendUserEvent.bind(this),
          event
        );
      } else {
        await this.sendUserEvent(event);
      }
    } catch (error) {
      console.error('Failed to track user event:', error);
    }
  }

  private async sendUserEvent(event: AnalyticsEvent): Promise<void> {
    if (this.isOnline) {
      this.batcher.addEvent('user_action', event);
    } else {
      // Save to offline queue immediately
      this.batcher.addEvent('user_action', event);
    }
  }

  // Record business metrics with batching
  async recordBusinessMetric(metric: BusinessMetric): Promise<void> {
    try {
      this.batcher.addEvent('business_event', metric);
    } catch (error) {
      console.error('Failed to record business metric:', error);
    }
  }

  // Track custom events with batching
  async trackCustomEvent(event: CustomEvent): Promise<void> {
    try {
      this.batcher.addEvent('custom_event', event);
    } catch (error) {
      console.error('Failed to track custom event:', error);
    }
  }

  // Record system metrics with batching
  async recordSystemMetric(metric: SystemMetric): Promise<void> {
    try {
      this.batcher.addEvent('system_metric', metric);
    } catch (error) {
      console.error('Failed to record system metric:', error);
    }
  }

  // Aggregate business metrics with fallback to cached data
  async aggregateBusinessMetrics(filters: {
    teamId?: string;
    projectId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    try {
      const cacheKey = `business_metrics_${JSON.stringify(filters)}`;
      
      // Try to get from cache first
      const cached = this.getFromCache(cacheKey);
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes
        return cached.data;
      }

      const { data, error } = await supabase.functions.invoke('metrics-aggregator', {
        body: {
          operation: 'business_metrics',
          filters
        }
      });

      if (error) {
        console.error('Error aggregating business metrics:', error);
        // Return cached data if available
        if (cached) return cached.data;
        throw error;
      }

      // Cache the result
      this.setCache(cacheKey, data.data);
      return data.data;
    } catch (error) {
      console.error('Failed to aggregate business metrics:', error);
      
      // Return mock data for graceful degradation
      return this.getMockBusinessMetrics();
    }
  }

  // Get user engagement analytics with caching
  async getUserEngagementAnalytics(filters: {
    teamId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    try {
      const cacheKey = `user_engagement_${JSON.stringify(filters)}`;
      
      const cached = this.getFromCache(cacheKey);
      if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) { // 10 minutes
        return cached.data;
      }

      const { data, error } = await supabase.functions.invoke('metrics-aggregator', {
        body: {
          operation: 'user_engagement',
          filters
        }
      });

      if (error) {
        console.error('Error getting user engagement analytics:', error);
        if (cached) return cached.data;
        throw error;
      }

      this.setCache(cacheKey, data.data);
      return data.data;
    } catch (error) {
      console.error('Failed to get user engagement analytics:', error);
      return this.getMockEngagementData();
    }
  }

  // Get system performance analytics with caching
  async getSystemPerformanceAnalytics(filters: {
    startDate?: string;
    endDate?: string;
    metricNames?: string[];
  }): Promise<any> {
    try {
      const cacheKey = `system_performance_${JSON.stringify(filters)}`;
      
      const cached = this.getFromCache(cacheKey);
      if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) { // 15 minutes
        return cached.data;
      }

      const { data, error } = await supabase.functions.invoke('metrics-aggregator', {
        body: {
          operation: 'system_performance',
          filters
        }
      });

      if (error) {
        console.error('Error getting system performance analytics:', error);
        if (cached) return cached.data;
        throw error;
      }

      this.setCache(cacheKey, data.data);
      return data.data;
    } catch (error) {
      console.error('Failed to get system performance analytics:', error);
      return this.getMockPerformanceData();
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
      return [];
    }
  }

  // Track page view with reduced frequency
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

  // Track user interaction with immediate processing for important events
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

    // Important interactions are processed immediately
    const importantActions = ['click', 'submit', 'purchase', 'signup'];
    if (importantActions.includes(action.toLowerCase())) {
      await this.sendUserEvent(event);
    } else {
      await this.trackUserEvent(event);
    }
  }

  // Cache management
  private getFromCache(key: string): { data: any; timestamp: number } | null {
    try {
      const cached = localStorage.getItem(`analytics_cache_${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  private setCache(key: string, data: any): void {
    try {
      localStorage.setItem(`analytics_cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to cache analytics data:', error);
    }
  }

  // Mock data for graceful degradation
  private getMockBusinessMetrics() {
    return {
      revenue: { current: 0, target: 10000, change: 0 },
      conversion: { current: 0, target: 5, change: 0 },
      growth: { current: 0, target: 20, change: 0 },
      engagement: { current: 0, target: 80, change: 0 }
    };
  }

  private getMockEngagementData() {
    return {
      totalSessions: 0,
      averageSessionDuration: 0,
      bounceRate: 0,
      pageViewsPerSession: 0
    };
  }

  private getMockPerformanceData() {
    return {
      averageLoadTime: 0,
      errorRate: 0,
      throughput: 0
    };
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

  // Additional methods for remaining compatibility
  async generateInsights(filters: any): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('insights-generator', {
        body: filters
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to generate insights:', error);
      return [];
    }
  }

  async getAnalyticsInsights(filters: any): Promise<any> {
    try {
      let query = supabase
        .from('analytics_insights')
        .select('*')
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false });

      if (filters.teamId) query = query.eq('team_id', filters.teamId);
      if (filters.projectId) query = query.eq('project_id', filters.projectId);
      if (filters.insightTypes?.length > 0) query = query.in('insight_type', filters.insightTypes);
      if (filters.impactLevels?.length > 0) query = query.in('impact_level', filters.impactLevels);
      if (filters.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to fetch analytics insights:', error);
      return [];
    }
  }

  async dismissInsight(insightId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('analytics_insights')
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString()
        })
        .eq('id', insightId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to dismiss insight:', error);
    }
  }

  async calculateUserEngagementScore(userId: string, days: number = 30): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('calculate_user_engagement_score', {
          p_user_id: userId,
          p_days: days
        });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Failed to calculate engagement score:', error);
      return 0;
    }
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();
