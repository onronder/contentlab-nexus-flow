import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Competitor } from '@/types/competitors';

export interface MonitoringSession {
  competitorId: string;
  projectId: string;
  isActive: boolean;
  startTime: Date;
  lastUpdate?: Date;
  channel?: RealtimeChannel;
}

export interface RealTimeUpdate {
  type: 'competitor_update' | 'serp_change' | 'website_change' | 'analysis_complete' | 'alert_created';
  competitorId: string;
  projectId: string;
  data: any;
  timestamp: Date;
}

export interface MonitoringConfig {
  competitorId: string;
  frequency: 'hourly' | 'daily' | 'weekly';
  alertThresholds: {
    rankingChanges: boolean;
    websiteUpdates: boolean;
    pricingChanges: boolean;
    contentChanges: boolean;
  };
  enabled: boolean;
}

class RealTimeMonitoringService {
  private static instance: RealTimeMonitoringService;
  private activeSessions: Map<string, MonitoringSession> = new Map();
  private updateCallbacks: Map<string, ((update: RealTimeUpdate) => void)[]> = new Map();
  private mainChannel?: RealtimeChannel;

  static getInstance(): RealTimeMonitoringService {
    if (!RealTimeMonitoringService.instance) {
      RealTimeMonitoringService.instance = new RealTimeMonitoringService();
    }
    return RealTimeMonitoringService.instance;
  }

  // ==================== MONITORING SESSION MANAGEMENT ====================

  async startRealTimeMonitoring(competitorId: string, projectId: string): Promise<boolean> {
    try {
      const sessionKey = `${projectId}-${competitorId}`;
      
      if (this.activeSessions.has(sessionKey)) {
        console.log(`Monitoring already active for competitor ${competitorId}`);
        return true;
      }

      // Create monitoring session
      const session: MonitoringSession = {
        competitorId,
        projectId,
        isActive: true,
        startTime: new Date(),
      };

      // Set up real-time channel for this competitor
      const channel = supabase.channel(`competitor_${competitorId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'project_competitors',
            filter: `id=eq.${competitorId}`
          },
          (payload) => this.handleCompetitorUpdate(payload, competitorId, projectId)
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'competitor_serp_data',
            filter: `competitor_id=eq.${competitorId}`
          },
          (payload) => this.handleSerpUpdate(payload, competitorId, projectId)
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'competitor_website_snapshots',
            filter: `competitor_id=eq.${competitorId}`
          },
          (payload) => this.handleWebsiteUpdate(payload, competitorId, projectId)
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'competitor_analysis_metadata',
            filter: `competitor_id=eq.${competitorId}`
          },
          (payload) => this.handleAnalysisUpdate(payload, competitorId, projectId)
        )
        .subscribe();

      session.channel = channel;
      this.activeSessions.set(sessionKey, session);

      // Update monitoring status in database
      await supabase
        .from('project_competitors')
        .update({ 
          monitoring_enabled: true,
          last_analyzed: new Date().toISOString()
        })
        .eq('id', competitorId);

      console.log(`Started real-time monitoring for competitor ${competitorId}`);
      return true;

    } catch (error) {
      console.error('Error starting real-time monitoring:', error);
      return false;
    }
  }

  async stopRealTimeMonitoring(competitorId: string, projectId: string): Promise<boolean> {
    try {
      const sessionKey = `${projectId}-${competitorId}`;
      const session = this.activeSessions.get(sessionKey);
      
      if (!session) {
        console.log(`No active monitoring session for competitor ${competitorId}`);
        return true;
      }

      // Clean up channel
      if (session.channel) {
        await supabase.removeChannel(session.channel);
      }

      // Remove session
      this.activeSessions.delete(sessionKey);

      // Update monitoring status in database
      await supabase
        .from('project_competitors')
        .update({ monitoring_enabled: false })
        .eq('id', competitorId);

      console.log(`Stopped real-time monitoring for competitor ${competitorId}`);
      return true;

    } catch (error) {
      console.error('Error stopping real-time monitoring:', error);
      return false;
    }
  }

  getMonitoringStatus(competitorId: string, projectId: string): MonitoringSession | null {
    const sessionKey = `${projectId}-${competitorId}`;
    return this.activeSessions.get(sessionKey) || null;
  }

  async updateMonitoringConfig(competitorId: string, config: Partial<MonitoringConfig>): Promise<boolean> {
    try {
      // Store monitoring configuration in custom_attributes
      const { data: competitor } = await supabase
        .from('project_competitors')
        .select('custom_attributes')
        .eq('id', competitorId)
        .single();

      const currentAttributes = competitor?.custom_attributes as Record<string, any> || {};
      const currentMonitoringConfig = currentAttributes.monitoring_config as Record<string, any> || {};
      
      const updatedAttributes = {
        ...currentAttributes,
        monitoring_config: {
          ...currentMonitoringConfig,
          ...config
        }
      };

      await supabase
        .from('project_competitors')
        .update({ custom_attributes: updatedAttributes })
        .eq('id', competitorId);

      return true;
    } catch (error) {
      console.error('Error updating monitoring config:', error);
      return false;
    }
  }

  // ==================== REAL-TIME DATA PROCESSING ====================

  private handleCompetitorUpdate(payload: any, competitorId: string, projectId: string): void {
    console.log('Competitor update received:', payload);
    
    const update: RealTimeUpdate = {
      type: 'competitor_update',
      competitorId,
      projectId,
      data: payload,
      timestamp: new Date()
    };

    this.notifySubscribers(projectId, update);
    this.updateDashboardMetrics(update);
  }

  private handleSerpUpdate(payload: any, competitorId: string, projectId: string): void {
    console.log('SERP update received:', payload);
    
    const update: RealTimeUpdate = {
      type: 'serp_change',
      competitorId,
      projectId,
      data: payload,
      timestamp: new Date()
    };

    // Detect significant ranking changes
    if (this.detectSignificantChanges(payload)) {
      this.generateRealTimeAlerts(update);
    }

    this.notifySubscribers(projectId, update);
  }

  private handleWebsiteUpdate(payload: any, competitorId: string, projectId: string): void {
    console.log('Website update received:', payload);
    
    const update: RealTimeUpdate = {
      type: 'website_change',
      competitorId,
      projectId,
      data: payload,
      timestamp: new Date()
    };

    this.notifySubscribers(projectId, update);
    this.generateRealTimeAlerts(update);
  }

  private handleAnalysisUpdate(payload: any, competitorId: string, projectId: string): void {
    console.log('Analysis update received:', payload);
    
    const update: RealTimeUpdate = {
      type: 'analysis_complete',
      competitorId,
      projectId,
      data: payload,
      timestamp: new Date()
    };

    this.notifySubscribers(projectId, update);
    this.updateDashboardMetrics(update);
  }

  processLiveUpdates(data: any): RealTimeUpdate {
    // Process and normalize incoming real-time data
    return {
      type: data.eventType || 'competitor_update',
      competitorId: data.competitorId,
      projectId: data.projectId,
      data: data.payload,
      timestamp: new Date(data.timestamp || Date.now())
    };
  }

  detectSignificantChanges(payload: any): boolean {
    // Detect significant changes that warrant alerts
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      const newData = payload.new;
      const oldData = payload.old;

      // Check for ranking position changes > 5 positions
      if (newData?.position && oldData?.position) {
        const positionDiff = Math.abs(newData.position - oldData.position);
        if (positionDiff >= 5) {
          return true;
        }
      }

      // Check for website content changes
      if (newData?.content_hash && oldData?.content_hash) {
        return newData.content_hash !== oldData.content_hash;
      }

      // Check for monitoring status changes
      if (newData?.monitoring_enabled !== oldData?.monitoring_enabled) {
        return true;
      }
    }

    return false;
  }

  async generateRealTimeAlerts(update: RealTimeUpdate): Promise<void> {
    try {
      // Determine alert type and severity
      let alertType = 'general';
      let severity = 'medium';
      let title = 'Competitor Update';
      let description = 'A competitor has been updated';

      switch (update.type) {
        case 'serp_change':
          alertType = 'ranking_change';
          severity = 'high';
          title = 'Ranking Position Change';
          description = 'Significant SERP ranking change detected';
          break;
        case 'website_change':
          alertType = 'website_update';
          severity = 'medium';
          title = 'Website Update';
          description = 'Competitor website content has changed';
          break;
        case 'analysis_complete':
          alertType = 'analysis_complete';
          severity = 'low';
          title = 'Analysis Complete';
          description = 'Competitor analysis has finished';
          break;
      }

      // Create alert in database
      await supabase
        .from('monitoring_alerts')
        .insert({
          project_id: update.projectId,
          competitor_id: update.competitorId,
          alert_type: alertType,
          severity,
          title,
          description,
          alert_data: update.data,
          is_read: false,
          is_dismissed: false
        });

      // Trigger real-time alert notification
      const alertUpdate: RealTimeUpdate = {
        type: 'alert_created',
        competitorId: update.competitorId,
        projectId: update.projectId,
        data: { alertType, severity, title, description },
        timestamp: new Date()
      };

      this.notifySubscribers(update.projectId, alertUpdate);

    } catch (error) {
      console.error('Error generating real-time alert:', error);
    }
  }

  updateDashboardMetrics(update: RealTimeUpdate): void {
    // Update real-time dashboard metrics
    const sessionKey = `${update.projectId}-${update.competitorId}`;
    const session = this.activeSessions.get(sessionKey);
    
    if (session) {
      session.lastUpdate = update.timestamp;
      this.activeSessions.set(sessionKey, session);
    }
  }

  // ==================== SUBSCRIPTION MANAGEMENT ====================

  subscribeToUpdates(projectId: string, callback: (update: RealTimeUpdate) => void): () => void {
    const projectCallbacks = this.updateCallbacks.get(projectId) || [];
    projectCallbacks.push(callback);
    this.updateCallbacks.set(projectId, projectCallbacks);

    // Return unsubscribe function
    return () => {
      const callbacks = this.updateCallbacks.get(projectId) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        this.updateCallbacks.set(projectId, callbacks);
      }
    };
  }

  private notifySubscribers(projectId: string, update: RealTimeUpdate): void {
    const callbacks = this.updateCallbacks.get(projectId) || [];
    callbacks.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('Error in update callback:', error);
      }
    });
  }

  // ==================== PROJECT-WIDE MONITORING ====================

  async startProjectMonitoring(projectId: string): Promise<boolean> {
    try {
      // Set up project-wide monitoring channel
      this.mainChannel = supabase.channel(`project_${projectId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'monitoring_alerts',
            filter: `project_id=eq.${projectId}`
          },
          (payload) => this.handleAlertUpdate(payload, projectId)
        )
        .subscribe();

      console.log(`Started project-wide monitoring for project ${projectId}`);
      return true;

    } catch (error) {
      console.error('Error starting project monitoring:', error);
      return false;
    }
  }

  async stopProjectMonitoring(): Promise<boolean> {
    try {
      if (this.mainChannel) {
        await supabase.removeChannel(this.mainChannel);
        this.mainChannel = undefined;
      }

      // Stop all competitor monitoring sessions
      for (const [sessionKey, session] of this.activeSessions.entries()) {
        if (session.channel) {
          await supabase.removeChannel(session.channel);
        }
      }

      this.activeSessions.clear();
      this.updateCallbacks.clear();

      console.log('Stopped all monitoring sessions');
      return true;

    } catch (error) {
      console.error('Error stopping project monitoring:', error);
      return false;
    }
  }

  private handleAlertUpdate(payload: any, projectId: string): void {
    console.log('Alert update received:', payload);
    
    const update: RealTimeUpdate = {
      type: 'alert_created',
      competitorId: payload.new?.competitor_id || '',
      projectId,
      data: payload,
      timestamp: new Date()
    };

    this.notifySubscribers(projectId, update);
  }

  // ==================== HEALTH CHECK ====================

  getHealthStatus(): {
    activeSessions: number;
    activeSubscriptions: number;
    uptime: number;
  } {
    return {
      activeSessions: this.activeSessions.size,
      activeSubscriptions: this.updateCallbacks.size,
      uptime: Date.now() // Simplified - could track actual uptime
    };
  }
}

export const realTimeMonitoringService = RealTimeMonitoringService.getInstance();