import { supabase } from '@/integrations/supabase/client';

export interface ApiUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalCost: number;
  averageResponseTime: number;
  apiProvider: string;
  timeRange: string;
}

export interface ApiHealthStatus {
  apiName: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
  responseTime?: number;
  errorRate: number;
}

class ExternalApiMonitoringService {
  // Log API usage for tracking and cost monitoring
  async logApiUsage(data: {
    apiProvider: string;
    endpoint: string;
    requestData: any;
    responseData?: any;
    success: boolean;
    cost?: number;
    responseTimeMs?: number;
    errorMessage?: string;
    projectId?: string;
    competitorId?: string;
  }) {
    try {
      const { error } = await supabase
        .from('external_data_logs')
        .insert({
          api_provider: data.apiProvider,
          api_endpoint: data.endpoint,
          request_type: data.apiProvider,
          request_data: data.requestData,
          response_data: data.responseData || {},
          response_status: data.success ? 200 : 500,
          cost_credits: data.cost || 0,
          processing_time_ms: data.responseTimeMs,
          error_message: data.errorMessage,
          project_id: data.projectId,
          competitor_id: data.competitorId,
        });

      if (error) {
        console.error('Failed to log API usage:', error);
      }
    } catch (error) {
      console.error('Error logging API usage:', error);
    }
  }

  // Get API usage statistics
  async getApiUsageStats(
    projectId: string,
    timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<ApiUsageStats[]> {
    try {
      const startDate = new Date();
      switch (timeRange) {
        case 'hour':
          startDate.setHours(startDate.getHours() - 1);
          break;
        case 'day':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      const { data, error } = await supabase
        .from('external_data_logs')
        .select('*')
        .eq('project_id', projectId)
        .gte('created_at', startDate.toISOString());

      if (error) {
        throw error;
      }

      // Group by API provider and calculate stats
      const stats: { [key: string]: ApiUsageStats } = {};
      
      data.forEach(log => {
        if (!stats[log.api_provider]) {
          stats[log.api_provider] = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalCost: 0,
            averageResponseTime: 0,
            apiProvider: log.api_provider,
            timeRange
          };
        }

        stats[log.api_provider].totalRequests++;
        if (log.response_status >= 200 && log.response_status < 300) {
          stats[log.api_provider].successfulRequests++;
        } else {
          stats[log.api_provider].failedRequests++;
        }
        stats[log.api_provider].totalCost += log.cost_credits || 0;
        
        if (log.processing_time_ms) {
          const currentAvg = stats[log.api_provider].averageResponseTime;
          const count = stats[log.api_provider].totalRequests;
          stats[log.api_provider].averageResponseTime = 
            (currentAvg * (count - 1) + log.processing_time_ms) / count;
        }
      });

      return Object.values(stats);
    } catch (error) {
      console.error('Error fetching API usage stats:', error);
      throw error;
    }
  }

  // Check API health status
  async checkApiHealth(): Promise<ApiHealthStatus[]> {
    const healthChecks: ApiHealthStatus[] = [];

    // Check BrightData SERP API
    try {
      const startTime = Date.now();
      const response = await supabase.functions.invoke('serp-analysis', {
        body: { 
          action: 'health_check',
          domain: 'test.com',
          keywords: ['test']
        }
      });
      const responseTime = Date.now() - startTime;

      healthChecks.push({
        apiName: 'BrightData SERP',
        status: response.error ? 'down' : 'healthy',
        lastCheck: new Date(),
        responseTime,
        errorRate: 0 // Would be calculated based on recent logs
      });
    } catch (error) {
      healthChecks.push({
        apiName: 'BrightData SERP',
        status: 'down',
        lastCheck: new Date(),
        errorRate: 100
      });
    }

    // Check BrightData Web Scraping
    try {
      const startTime = Date.now();
      const response = await supabase.functions.invoke('web-scraping', {
        body: { 
          action: 'health_check',
          url: 'https://httpbin.org/html'
        }
      });
      const responseTime = Date.now() - startTime;

      healthChecks.push({
        apiName: 'BrightData Scraping',
        status: response.error ? 'down' : 'healthy',
        lastCheck: new Date(),
        responseTime,
        errorRate: 0
      });
    } catch (error) {
      healthChecks.push({
        apiName: 'BrightData Scraping',
        status: 'down',
        lastCheck: new Date(),
        errorRate: 100
      });
    }

    return healthChecks;
  }

  // Create monitoring alert
  async createAlert(data: {
    alertType: 'cost_threshold' | 'error_rate' | 'response_time' | 'api_down';
    title: string;
    description: string;
    severity?: string;
    projectId: string;
    competitorId?: string;
    metadata?: any;
  }) {
    try {
      const { error } = await supabase
        .from('monitoring_alerts')
        .insert({
          alert_type: data.alertType,
          title: data.title,
          description: data.description,
          severity: data.severity || 'medium',
          project_id: data.projectId,
          competitor_id: data.competitorId,
          alert_data: data.metadata || {},
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error creating monitoring alert:', error);
      throw error;
    }
  }

  // Get monitoring alerts
  async getAlerts(
    projectId: string,
    filters?: {
      severity?: string;
      alertType?: string;
      dismissed?: boolean;
    }
  ) {
    try {
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
      if (filters?.dismissed !== undefined) {
        query = query.eq('is_dismissed', filters.dismissed);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching monitoring alerts:', error);
      throw error;
    }
  }

  // Dismiss alert
  async dismissAlert(alertId: string) {
    try {
      const { error } = await supabase
        .from('monitoring_alerts')
        .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error dismissing alert:', error);
      throw error;
    }
  }

  // Monitor cost thresholds
  async checkCostThresholds(projectId: string, monthlyLimit: number = 100) {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('external_data_logs')
        .select('cost_credits')
        .eq('project_id', projectId)
        .gte('created_at', startOfMonth.toISOString());

      const totalCost = data?.reduce((sum, log) => sum + (log.cost_credits || 0), 0) || 0;
      const percentUsed = (totalCost / monthlyLimit) * 100;

      if (percentUsed >= 90) {
        await this.createAlert({
          alertType: 'cost_threshold',
          title: 'Monthly API Cost Limit Nearly Exceeded',
          description: `Monthly API cost limit nearly exceeded: ${percentUsed.toFixed(1)}% used (${totalCost} credits / ${monthlyLimit} credits)`,
          severity: 'critical',
          projectId,
          metadata: { totalCost, monthlyLimit, percentUsed }
        });
      } else if (percentUsed >= 75) {
        await this.createAlert({
          alertType: 'cost_threshold',
          title: 'Monthly API Cost Warning',
          description: `Monthly API cost warning: ${percentUsed.toFixed(1)}% used (${totalCost} credits / ${monthlyLimit} credits)`,
          severity: 'high',
          projectId,
          metadata: { totalCost, monthlyLimit, percentUsed }
        });
      }

      return { totalCost, percentUsed };
    } catch (error) {
      console.error('Error checking cost thresholds:', error);
      throw error;
    }
  }
}

export const externalApiMonitoringService = new ExternalApiMonitoringService();