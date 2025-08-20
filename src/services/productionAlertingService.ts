import { supabase } from '@/integrations/supabase/client';
import { realTimeAnalyticsService } from './realTimeAnalyticsService';

interface Alert {
  id: string;
  type: 'performance' | 'anomaly' | 'model_drift' | 'system' | 'business';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  metadata: Record<string, any>;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  actions?: AlertAction[];
}

interface AlertAction {
  id: string;
  label: string;
  type: 'automatic' | 'manual';
  handler: () => Promise<void>;
}

interface AlertRule {
  id: string;
  name: string;
  type: Alert['type'];
  condition: (metrics: any) => boolean;
  severity: Alert['severity'];
  cooldown: number; // milliseconds
  autoResolve: boolean;
  actions: AlertAction[];
}

class ProductionAlertingService {
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private lastTriggered: Map<string, number> = new Map();
  private subscribers: Map<string, (alert: Alert) => void> = new Map();

  private mapSeverityToDatabase(severity: Alert['severity']): 'debug' | 'info' | 'warning' | 'error' | 'critical' {
    switch (severity) {
      case 'low': return 'info';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'critical';
      default: return 'info';
    }
  }

  constructor() {
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  private initializeDefaultRules() {
    // Performance degradation rule
    this.addRule({
      id: 'performance_degradation',
      name: 'Performance Degradation Detected',
      type: 'performance',
      condition: (metrics) => {
        return metrics.avgResponseTime > 2000 || metrics.errorRate > 0.05;
      },
      severity: 'high',
      cooldown: 5 * 60 * 1000, // 5 minutes
      autoResolve: true,
      actions: [
        {
          id: 'cache_warmup',
          label: 'Warm Cache',
          type: 'automatic',
          handler: async () => {
            // Trigger cache warming
            console.log('Warming cache due to performance degradation');
          }
        }
      ]
    });

    // Model drift detection rule
    this.addRule({
      id: 'model_drift',
      name: 'Statistical Model Drift Detected',
      type: 'model_drift',
      condition: (metrics) => {
        return metrics.modelAccuracy < 0.8 || metrics.predictionVariance > 0.3;
      },
      severity: 'medium',
      cooldown: 15 * 60 * 1000, // 15 minutes
      autoResolve: false,
      actions: [
        {
          id: 'retrain_model',
          label: 'Trigger Model Retraining',
          type: 'manual',
          handler: async () => {
            console.log('Triggering model retraining');
          }
        }
      ]
    });

    // Anomaly detection rule
    this.addRule({
      id: 'data_anomaly',
      name: 'Data Anomaly Detected',
      type: 'anomaly',
      condition: (metrics) => {
        return metrics.anomalyScore > 0.7;
      },
      severity: 'medium',
      cooldown: 10 * 60 * 1000, // 10 minutes
      autoResolve: true,
      actions: []
    });

    // System resource rule
    this.addRule({
      id: 'system_resources',
      name: 'System Resource Alert',
      type: 'system',
      condition: (metrics) => {
        return metrics.memoryUsage > 0.9 || metrics.cpuUsage > 0.85;
      },
      severity: 'critical',
      cooldown: 2 * 60 * 1000, // 2 minutes
      autoResolve: true,
      actions: [
        {
          id: 'scale_resources',
          label: 'Scale Resources',
          type: 'automatic',
          handler: async () => {
            console.log('Scaling system resources');
          }
        }
      ]
    });

    // Business metric rule
    this.addRule({
      id: 'business_threshold',
      name: 'Business Metric Threshold Exceeded',
      type: 'business',
      condition: (metrics) => {
        return metrics.conversionRate < 0.02 || metrics.userEngagement < 0.3;
      },
      severity: 'high',
      cooldown: 30 * 60 * 1000, // 30 minutes
      autoResolve: false,
      actions: [
        {
          id: 'notify_team',
          label: 'Notify Business Team',
          type: 'manual',
          handler: async () => {
            console.log('Notifying business team of threshold breach');
          }
        }
      ]
    });
  }

  private startMonitoring() {
    // Monitor metrics every 30 seconds
    setInterval(() => {
      this.checkAlertRules();
    }, 30000);

    // Subscribe to real-time metric updates
    realTimeAnalyticsService.subscribe('alerting', (update) => {
      if (update.type === 'metric_update') {
        this.evaluateMetricUpdate(update.data);
      }
    });
  }

  private async checkAlertRules() {
    try {
      // Fetch current metrics from various sources
      const performanceMetrics = await this.getPerformanceMetrics();
      const systemMetrics = await this.getSystemMetrics();
      const businessMetrics = await this.getBusinessMetrics();
      const modelMetrics = await this.getModelMetrics();

      const allMetrics = {
        ...performanceMetrics,
        ...systemMetrics,
        ...businessMetrics,
        ...modelMetrics
      };

      // Evaluate each rule
      for (const [ruleId, rule] of this.rules) {
        const lastTriggered = this.lastTriggered.get(ruleId) || 0;
        const now = Date.now();

        // Check cooldown
        if (now - lastTriggered < rule.cooldown) {
          continue;
        }

        // Evaluate condition
        if (rule.condition(allMetrics)) {
          await this.triggerAlert(rule, allMetrics);
          this.lastTriggered.set(ruleId, now);
        }
      }
    } catch (error) {
      console.error('Error checking alert rules:', error);
    }
  }

  private evaluateMetricUpdate(metricData: any) {
    // Real-time evaluation for critical alerts
    const criticalRules = Array.from(this.rules.values()).filter(rule => rule.severity === 'critical');
    
    for (const rule of criticalRules) {
      if (rule.condition(metricData)) {
        this.triggerAlert(rule, metricData);
      }
    }
  }

  private async triggerAlert(rule: AlertRule, metrics: any) {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: rule.type,
      severity: rule.severity,
      title: rule.name,
      message: this.generateAlertMessage(rule, metrics),
      timestamp: Date.now(),
      metadata: {
        ruleId: rule.id,
        metrics,
        triggeredBy: 'automated_monitoring'
      },
      resolved: false,
      actions: rule.actions
    };

    // Store alert
    this.alerts.set(alert.id, alert);

    // Save to database
    try {
      await supabase.from('activity_logs').insert({
        activity_type: 'system_event',
        action: 'alert_triggered',
        description: alert.message,
        severity: this.mapSeverityToDatabase(alert.severity),
        metadata: {
          alertId: alert.id,
          alertType: alert.type,
          metrics: alert.metadata.metrics
        }
      });
    } catch (error) {
      console.error('Error saving alert to database:', error);
    }

    // Execute automatic actions
    for (const action of rule.actions.filter(a => a.type === 'automatic')) {
      try {
        await action.handler();
      } catch (error) {
        console.error(`Error executing automatic action ${action.id}:`, error);
      }
    }

    // Notify subscribers
    this.notifySubscribers(alert);

    // Publish real-time update
    realTimeAnalyticsService.publishMetric({
      id: alert.id,
      timestamp: alert.timestamp,
      type: 'system',
      value: 1,
      metadata: {
        alertType: alert.type,
        severity: alert.severity,
        message: alert.message
      }
    });

    // Auto-resolve if configured
    if (rule.autoResolve) {
      setTimeout(() => {
        this.checkAutoResolve(alert.id, rule);
      }, rule.cooldown);
    }
  }

  private generateAlertMessage(rule: AlertRule, metrics: any): string {
    switch (rule.type) {
      case 'performance':
        return `Performance degradation detected: Response time ${metrics.avgResponseTime}ms, Error rate ${(metrics.errorRate * 100).toFixed(2)}%`;
      case 'model_drift':
        return `Model performance degraded: Accuracy ${(metrics.modelAccuracy * 100).toFixed(1)}%, Variance ${metrics.predictionVariance.toFixed(3)}`;
      case 'anomaly':
        return `Data anomaly detected with score ${metrics.anomalyScore.toFixed(2)}`;
      case 'system':
        return `System resources critical: Memory ${(metrics.memoryUsage * 100).toFixed(1)}%, CPU ${(metrics.cpuUsage * 100).toFixed(1)}%`;
      case 'business':
        return `Business metric threshold exceeded: Conversion ${(metrics.conversionRate * 100).toFixed(2)}%, Engagement ${(metrics.userEngagement * 100).toFixed(1)}%`;
      default:
        return rule.name;
    }
  }

  private async checkAutoResolve(alertId: string, rule: AlertRule) {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) return;

    try {
      const currentMetrics = await this.getCurrentMetrics();
      if (!rule.condition(currentMetrics)) {
        await this.resolveAlert(alertId, 'auto_resolved');
      }
    } catch (error) {
      console.error('Error checking auto-resolve condition:', error);
    }
  }

  private notifySubscribers(alert: Alert) {
    this.subscribers.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert subscriber callback:', error);
      }
    });
  }

  // Public API
  addRule(rule: AlertRule) {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string) {
    this.rules.delete(ruleId);
    this.lastTriggered.delete(ruleId);
  }

  async resolveAlert(alertId: string, resolvedBy: string) {
    const alert = this.alerts.get(alertId);
    if (!alert) return;

    alert.resolved = true;
    alert.resolvedAt = Date.now();
    alert.resolvedBy = resolvedBy;

    try {
      await supabase.from('activity_logs').insert({
        activity_type: 'system_event',
        action: 'alert_resolved',
        description: `Alert resolved: ${alert.title}`,
        metadata: {
          alertId,
          resolvedBy,
          originalSeverity: alert.severity
        }
      });
    } catch (error) {
      console.error('Error logging alert resolution:', error);
    }

    this.notifySubscribers(alert);
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  getAlertHistory(limit = 50): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  subscribe(id: string, callback: (alert: Alert) => void) {
    this.subscribers.set(id, callback);
    return () => {
      this.subscribers.delete(id);
    };
  }

  // Metric fetching methods (implement based on your data sources)
  private async getPerformanceMetrics() {
    // Implement performance metrics fetching
    return {
      avgResponseTime: Math.random() * 3000,
      errorRate: Math.random() * 0.1
    };
  }

  private async getSystemMetrics() {
    // Implement system metrics fetching
    return {
      memoryUsage: Math.random(),
      cpuUsage: Math.random()
    };
  }

  private async getBusinessMetrics() {
    // Implement business metrics fetching
    return {
      conversionRate: Math.random() * 0.1,
      userEngagement: Math.random()
    };
  }

  private async getModelMetrics() {
    // Implement model metrics fetching
    return {
      modelAccuracy: 0.7 + Math.random() * 0.3,
      predictionVariance: Math.random() * 0.5,
      anomalyScore: Math.random()
    };
  }

  private async getCurrentMetrics() {
    return {
      ...(await this.getPerformanceMetrics()),
      ...(await this.getSystemMetrics()),
      ...(await this.getBusinessMetrics()),
      ...(await this.getModelMetrics())
    };
  }
}

export const productionAlertingService = new ProductionAlertingService();