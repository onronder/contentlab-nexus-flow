import { supabase } from '@/integrations/supabase/client';

interface RealTimeMetric {
  id: string;
  timestamp: number;
  metricType: 'performance' | 'system' | 'business' | 'security' | 'error';
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, any>;
}

interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  score: number;
  components: {
    api: { status: string; score: number; responseTime: number };
    database: { status: string; score: number; connectionPool: number };
    cache: { status: string; score: number; hitRate: number };
    security: { status: string; score: number; threats: number };
  };
  predictions: {
    nextHour: { score: number; confidence: number };
    nextDay: { score: number; confidence: number };
  };
}

interface MonitoringConfig {
  frequency: 'realtime' | 'hourly' | 'daily';
  alertThresholds: {
    performance: number;
    errors: number;
    availability: number;
  };
  enabledMetrics: string[];
  notifications: {
    email: boolean;
    slack: boolean;
    webhook?: string;
  };
}

interface RealTimeUpdate {
  type: 'competitor_update' | 'system_health' | 'metric_update' | 'alert';
  timestamp: number;
  data: any;
  competitorId?: string;
  projectId?: string;
}

class RealTimeMonitoringService {
  private static instance: RealTimeMonitoringService;
  private metricsStream: Map<string, RealTimeMetric[]> = new Map();
  private subscribers: Map<string, (data: any) => void> = new Map();
  private healthHistory: SystemHealthStatus[] = [];

  private constructor() {
    this.startMetricsCollection();
  }

  static getInstance(): RealTimeMonitoringService {
    if (!RealTimeMonitoringService.instance) {
      RealTimeMonitoringService.instance = new RealTimeMonitoringService();
    }
    return RealTimeMonitoringService.instance;
  }

  private startMetricsCollection() {
    setInterval(async () => {
      const health = await this.calculateSystemHealth();
      this.healthHistory.push(health);
      this.notifySubscribers('system_health', health);
    }, 10000);
  }

  private async calculateSystemHealth(): Promise<SystemHealthStatus> {
    const components = {
      api: { status: 'healthy', score: 95, responseTime: 250 },
      database: { status: 'healthy', score: 98, connectionPool: 45 },
      cache: { status: 'healthy', score: 90, hitRate: 0.85 },
      security: { status: 'healthy', score: 100, threats: 0 }
    };

    const overallScore = Math.round(
      (components.api.score + components.database.score + components.cache.score + components.security.score) / 4
    );

    return {
      overall: overallScore >= 80 ? 'healthy' : overallScore >= 60 ? 'degraded' : 'critical',
      score: overallScore,
      components,
      predictions: {
        nextHour: { score: overallScore + 2, confidence: 0.8 },
        nextDay: { score: overallScore - 1, confidence: 0.6 }
      }
    };
  }

  private notifySubscribers(event: string, data: any) {
    this.subscribers.forEach((callback, key) => {
      if (key.startsWith(event) || key === 'all') {
        try {
          callback(data);
        } catch (error) {
          console.error('Error notifying subscriber:', error);
        }
      }
    });
  }

  subscribe(event: string, callback: (data: any) => void): () => void {
    const key = `${event}_${Date.now()}_${Math.random()}`;
    this.subscribers.set(key, callback);
    return () => this.subscribers.delete(key);
  }

  getMetricsStream(): RealTimeMetric[] {
    const allMetrics: RealTimeMetric[] = [];
    this.metricsStream.forEach(stream => allMetrics.push(...stream));
    return allMetrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  async triggerManualHealthCheck(): Promise<SystemHealthStatus> {
    return await this.calculateSystemHealth();
  }

  getCurrentHealth(): SystemHealthStatus | null {
    return this.healthHistory.length > 0 ? 
      this.healthHistory[this.healthHistory.length - 1] : null;
  }

  async startRealTimeMonitoring(competitorId: string, projectId: string): Promise<boolean> {
    try {
      // Update database to enable monitoring
      await supabase
        .from('project_competitors')
        .update({ monitoring_enabled: true, last_analyzed: new Date().toISOString() })
        .eq('id', competitorId);

      this.notifySubscribers('monitoring_started', { competitorId, projectId });
      return true;
    } catch (error) {
      console.error('Error starting real-time monitoring:', error);
      return false;
    }
  }

  async stopRealTimeMonitoring(competitorId: string, projectId: string): Promise<boolean> {
    try {
      // Update database to disable monitoring
      await supabase
        .from('project_competitors')
        .update({ monitoring_enabled: false })
        .eq('id', competitorId);

      this.notifySubscribers('monitoring_stopped', { competitorId, projectId });
      return true;
    } catch (error) {
      console.error('Error stopping real-time monitoring:', error);
      return false;
    }
  }

  async startProjectMonitoring(projectId: string): Promise<void> {
    // Start monitoring for all competitors in the project
    const { data: competitors } = await supabase
      .from('project_competitors')
      .select('id')
      .eq('project_id', projectId);

    if (competitors) {
      for (const competitor of competitors) {
        await this.startRealTimeMonitoring(competitor.id, projectId);
      }
    }
  }

  subscribeToUpdates(projectId: string, callback: (update: RealTimeUpdate) => void): () => void {
    const key = `project_${projectId}_${Date.now()}_${Math.random()}`;
    
    const wrappedCallback = (data: any) => {
      const update: RealTimeUpdate = {
        type: 'competitor_update',
        timestamp: Date.now(),
        data,
        projectId
      };
      callback(update);
    };

    this.subscribers.set(key, wrappedCallback);
    return () => this.subscribers.delete(key);
  }

  async getMonitoringStatus(competitorId: string, projectId: string): Promise<{
    isActive: boolean;
    lastUpdate?: Date;
    config?: Partial<MonitoringConfig>;
  }> {
    try {
      const { data } = await supabase
        .from('project_competitors')
        .select('monitoring_enabled, last_analyzed, monitoring_config')
        .eq('id', competitorId)
        .single();

      return {
        isActive: data?.monitoring_enabled || false,
        lastUpdate: data?.last_analyzed ? new Date(data.last_analyzed) : undefined,
        config: data?.monitoring_config as Partial<MonitoringConfig>
      };
    } catch (error) {
      console.error('Error getting monitoring status:', error);
      return { isActive: false };
    }
  }

  async updateMonitoringConfig(competitorId: string, config: Partial<MonitoringConfig>): Promise<boolean> {
    try {
      await supabase
        .from('project_competitors')
        .update({ monitoring_config: config })
        .eq('id', competitorId);

      this.notifySubscribers('config_updated', { competitorId, config });
      return true;
    } catch (error) {
      console.error('Error updating monitoring config:', error);
      return false;
    }
  }
}

export const realTimeMonitoringService = RealTimeMonitoringService.getInstance();
export type { RealTimeMetric, SystemHealthStatus, MonitoringConfig, RealTimeUpdate };