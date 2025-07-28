import { supabase } from '@/integrations/supabase/client';

// Types for external data services
export interface SerpAnalysisRequest {
  competitorId: string;
  domain: string;
  keywords: string[];
  location?: string;
  device?: 'desktop' | 'mobile';
}

export interface SerpRankingData {
  id: string;
  competitorId: string;
  keyword: string;
  position: number;
  url: string;
  title: string;
  description: string;
  searchVolume: number;
  competitionLevel: string;
  costPerClick: number;
  serpFeatures: string[];
  searchEngine: string;
  location: string;
  device: string;
  createdAt: string;
}

export interface WebsiteSnapshot {
  id: string;
  competitorId: string;
  url: string;
  contentHash: string;
  title: string;
  description: string;
  pricingData: Record<string, any>;
  contentSections: Record<string, any>;
  technicalData: Record<string, any>;
  changeType: string;
  changeSummary: string;
  screenshotUrl?: string;
  createdAt: string;
}

export interface MonitoringAlert {
  id: string;
  projectId: string;
  competitorId: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  alertData: Record<string, any>;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
}

export interface ExternalDataLog {
  id: string;
  apiProvider: string;
  apiEndpoint: string;
  requestType: string;
  competitorId?: string;
  projectId?: string;
  requestData: Record<string, any>;
  responseStatus: number;
  responseData: Record<string, any>;
  costCredits: number;
  processingTimeMs: number;
  errorMessage?: string;
  createdAt: string;
}

export interface MonitoringConfig {
  competitorId: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  keywords: string[];
  alertThresholds: {
    rankingChange: number;
    contentChange: boolean;
    pricingChange: boolean;
  };
}

// SERP API Integration
export class SerpApiService {
  private static async logApiCall(
    provider: string,
    endpoint: string,
    requestType: string,
    requestData: any,
    responseStatus: number,
    responseData: any,
    costCredits: number,
    processingTime: number,
    competitorId?: string,
    projectId?: string,
    errorMessage?: string
  ) {
    try {
      await supabase.from('external_data_logs').insert({
        api_provider: provider,
        api_endpoint: endpoint,
        request_type: requestType,
        competitor_id: competitorId,
        project_id: projectId,
        request_data: requestData,
        response_status: responseStatus,
        response_data: responseData,
        cost_credits: costCredits,
        processing_time_ms: processingTime,
        error_message: errorMessage,
      });
    } catch (error) {
      console.error('Failed to log API call:', error);
    }
  }

  static async analyzeCompetitorVisibility(request: SerpAnalysisRequest): Promise<SerpRankingData[]> {
    const startTime = Date.now();
    
    try {
      // Call the SERP analysis edge function
      const { data, error } = await supabase.functions.invoke('serp-analysis', {
        body: {
          action: 'analyze_visibility',
          domain: request.domain,
          keywords: request.keywords,
          location: request.location || 'global',
          device: request.device || 'desktop',
        },
      });

      const processingTime = Date.now() - startTime;

      if (error) {
        await this.logApiCall(
          'serp-api',
          'analyze_visibility',
          'POST',
          request,
          500,
          {},
          0,
          processingTime,
          request.competitorId,
          undefined,
          error.message
        );
        throw new Error(`SERP analysis failed: ${error.message}`);
      }

      // Store SERP data in database
      const serpData: SerpRankingData[] = data.rankings.map((ranking: any) => ({
        id: ranking.id,
        competitorId: request.competitorId,
        keyword: ranking.keyword,
        position: ranking.position,
        url: ranking.url,
        title: ranking.title,
        description: ranking.description,
        searchVolume: ranking.searchVolume,
        competitionLevel: ranking.competitionLevel,
        costPerClick: ranking.costPerClick,
        serpFeatures: ranking.serpFeatures,
        searchEngine: ranking.searchEngine || 'google',
        location: request.location || 'global',
        device: request.device || 'desktop',
        createdAt: new Date().toISOString(),
      }));

      // Insert SERP data
      const { error: insertError } = await supabase
        .from('competitor_serp_data')
        .insert(
          serpData.map((item) => ({
            competitor_id: item.competitorId,
            keyword: item.keyword,
            search_engine: item.searchEngine,
            position: item.position,
            url: item.url,
            title: item.title,
            description: item.description,
            serp_features: item.serpFeatures,
            search_volume: item.searchVolume,
            competition_level: item.competitionLevel,
            cost_per_click: item.costPerClick,
            location: item.location,
            device: item.device,
          }))
        );

      if (insertError) {
        throw new Error(`Failed to store SERP data: ${insertError.message}`);
      }

      await this.logApiCall(
        'serp-api',
        'analyze_visibility',
        'POST',
        request,
        200,
        data,
        data.creditsUsed || 1,
        processingTime,
        request.competitorId
      );

      return serpData;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      await this.logApiCall(
        'serp-api',
        'analyze_visibility',
        'POST',
        request,
        500,
        {},
        0,
        processingTime,
        request.competitorId,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  static async getCompetitorRankings(
    competitorId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<SerpRankingData[]> {
    let query = supabase
      .from('competitor_serp_data')
      .select('*')
      .eq('competitor_id', competitorId)
      .order('created_at', { ascending: false });

    if (timeRange) {
      query = query
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch SERP rankings: ${error.message}`);
    }

    return data.map((item) => ({
      id: item.id,
      competitorId: item.competitor_id,
      keyword: item.keyword,
      position: item.position,
      url: item.url,
      title: item.title,
      description: item.description,
      searchVolume: item.search_volume,
      competitionLevel: item.competition_level,
      costPerClick: item.cost_per_click,
      serpFeatures: Array.isArray(item.serp_features) ? item.serp_features as string[] : [],
      searchEngine: item.search_engine,
      location: item.location,
      device: item.device,
      createdAt: item.created_at,
    }));
  }
}

// Website Scraping Service
export class WebScrapingService {
  static async scrapeCompetitorWebsite(
    competitorId: string,
    url: string
  ): Promise<WebsiteSnapshot> {
    const startTime = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke('web-scraping', {
        body: {
          action: 'scrape_website',
          url,
          competitorId,
        },
      });

      const processingTime = Date.now() - startTime;

      if (error) {
        await SerpApiService['logApiCall'](
          'brightdata',
          'scrape_website',
          'POST',
          { url, competitorId },
          500,
          {},
          0,
          processingTime,
          competitorId,
          undefined,
          error.message
        );
        throw new Error(`Website scraping failed: ${error.message}`);
      }

      // Store website snapshot
      const { data: snapshotData, error: insertError } = await supabase
        .from('competitor_website_snapshots')
        .insert({
          competitor_id: competitorId,
          url,
          content_hash: data.contentHash,
          title: data.title,
          description: data.description,
          pricing_data: data.pricingData || {},
          content_sections: data.contentSections || {},
          technical_data: data.technicalData || {},
          change_type: 'content',
          change_summary: data.changeSummary || 'Initial snapshot',
          screenshot_url: data.screenshotUrl,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to store website snapshot: ${insertError.message}`);
      }

      await SerpApiService['logApiCall'](
        'brightdata',
        'scrape_website',
        'POST',
        { url, competitorId },
        200,
        data,
        data.creditsUsed || 1,
        processingTime,
        competitorId
      );

      return {
        id: snapshotData.id,
        competitorId: snapshotData.competitor_id,
        url: snapshotData.url,
        contentHash: snapshotData.content_hash,
        title: snapshotData.title,
        description: snapshotData.description,
        pricingData: (snapshotData.pricing_data as Record<string, any>) || {},
        contentSections: (snapshotData.content_sections as Record<string, any>) || {},
        technicalData: (snapshotData.technical_data as Record<string, any>) || {},
        changeType: snapshotData.change_type,
        changeSummary: snapshotData.change_summary,
        screenshotUrl: snapshotData.screenshot_url,
        createdAt: snapshotData.created_at,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      await SerpApiService['logApiCall'](
        'brightdata',
        'scrape_website',
        'POST',
        { url, competitorId },
        500,
        {},
        0,
        processingTime,
        competitorId,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  static async getWebsiteSnapshots(
    competitorId: string,
    limit = 10
  ): Promise<WebsiteSnapshot[]> {
    const { data, error } = await supabase
      .from('competitor_website_snapshots')
      .select('*')
      .eq('competitor_id', competitorId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch website snapshots: ${error.message}`);
    }

    return data.map((item) => ({
      id: item.id,
      competitorId: item.competitor_id,
      url: item.url,
      contentHash: item.content_hash,
      title: item.title,
      description: item.description,
      pricingData: (item.pricing_data as Record<string, any>) || {},
      contentSections: (item.content_sections as Record<string, any>) || {},
      technicalData: (item.technical_data as Record<string, any>) || {},
      changeType: item.change_type,
      changeSummary: item.change_summary,
      screenshotUrl: item.screenshot_url,
      createdAt: item.created_at,
    }));
  }

  static async detectWebsiteChanges(
    competitorId: string,
    url: string
  ): Promise<{ hasChanges: boolean; changeSummary?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('web-scraping', {
        body: {
          action: 'detect_changes',
          url,
          competitorId,
        },
      });

      if (error) {
        throw new Error(`Change detection failed: ${error.message}`);
      }

      return {
        hasChanges: data.hasChanges,
        changeSummary: data.changeSummary,
      };
    } catch (error) {
      throw error;
    }
  }
}

// Monitoring and Alerts Service
export class MonitoringService {
  static async createAlert(
    projectId: string,
    competitorId: string,
    alertType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    title: string,
    description: string,
    alertData: Record<string, any> = {}
  ): Promise<MonitoringAlert> {
    const { data, error } = await supabase
      .from('monitoring_alerts')
      .insert({
        project_id: projectId,
        competitor_id: competitorId,
        alert_type: alertType,
        severity,
        title,
        description,
        alert_data: alertData,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create alert: ${error.message}`);
    }

    return {
      id: data.id,
      projectId: data.project_id,
      competitorId: data.competitor_id,
      alertType: data.alert_type,
      severity: data.severity as 'low' | 'medium' | 'high' | 'critical',
      title: data.title,
      description: data.description,
      alertData: (data.alert_data as Record<string, any>) || {},
      isRead: data.is_read,
      isDismissed: data.is_dismissed,
      createdAt: data.created_at,
    };
  }

  static async getAlertsForProject(
    projectId: string,
    filters?: {
      severity?: string;
      alertType?: string;
      isRead?: boolean;
      isDismissed?: boolean;
    }
  ): Promise<MonitoringAlert[]> {
    let query = supabase
      .from('monitoring_alerts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters?.alertType) {
      query = query.eq('alert_type', filters.alertType);
    }
    if (filters?.isRead !== undefined) {
      query = query.eq('is_read', filters.isRead);
    }
    if (filters?.isDismissed !== undefined) {
      query = query.eq('is_dismissed', filters.isDismissed);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch alerts: ${error.message}`);
    }

    return data.map((item) => ({
      id: item.id,
      projectId: item.project_id,
      competitorId: item.competitor_id,
      alertType: item.alert_type,
      severity: item.severity as 'low' | 'medium' | 'high' | 'critical',
      title: item.title,
      description: item.description,
      alertData: (item.alert_data as Record<string, any>) || {},
      isRead: item.is_read,
      isDismissed: item.is_dismissed,
      createdAt: item.created_at,
    }));
  }

  static async markAlertAsRead(alertId: string): Promise<void> {
    const { error } = await supabase
      .from('monitoring_alerts')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) {
      throw new Error(`Failed to mark alert as read: ${error.message}`);
    }
  }

  static async dismissAlert(alertId: string): Promise<void> {
    const { error } = await supabase
      .from('monitoring_alerts')
      .update({
        is_dismissed: true,
        dismissed_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) {
      throw new Error(`Failed to dismiss alert: ${error.message}`);
    }
  }
}

// Data Enrichment Service
export class DataEnrichmentService {
  static async enrichCompetitorProfile(competitorId: string): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('data-enrichment', {
        body: {
          action: 'enrich_profile',
          competitorId,
        },
      });

      if (error) {
        throw new Error(`Data enrichment failed: ${error.message}`);
      }

      // The edge function handles the database updates
      console.log('Competitor profile enrichment completed:', data);
    } catch (error) {
      console.error('Failed to enrich competitor profile:', error);
      throw error;
    }
  }

  static async getApiUsageStats(
    projectId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    totalCalls: number;
    totalCredits: number;
    avgProcessingTime: number;
    successRate: number;
    byProvider: Record<string, { calls: number; credits: number }>;
  }> {
    let query = supabase
      .from('external_data_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (timeRange) {
      query = query
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch API usage stats: ${error.message}`);
    }

    const totalCalls = data.length;
    const totalCredits = data.reduce((sum, log) => sum + (log.cost_credits || 0), 0);
    const avgProcessingTime = data.reduce((sum, log) => sum + (log.processing_time_ms || 0), 0) / totalCalls;
    const successfulCalls = data.filter((log) => log.response_status >= 200 && log.response_status < 300).length;
    const successRate = (successfulCalls / totalCalls) * 100;

    const byProvider: Record<string, { calls: number; credits: number }> = {};
    data.forEach((log) => {
      if (!byProvider[log.api_provider]) {
        byProvider[log.api_provider] = { calls: 0, credits: 0 };
      }
      byProvider[log.api_provider].calls++;
      byProvider[log.api_provider].credits += log.cost_credits || 0;
    });

    return {
      totalCalls,
      totalCredits,
      avgProcessingTime,
      successRate,
      byProvider,
    };
  }
}

export const externalDataService = {
  serp: SerpApiService,
  scraping: WebScrapingService,
  monitoring: MonitoringService,
  enrichment: DataEnrichmentService,
};