import { supabase } from '@/integrations/supabase/client';
import { productionAlertingService } from './productionAlertingService';

interface AlertChannel {
  id: string;
  type: 'email' | 'slack' | 'discord' | 'sms' | 'push' | 'webhook';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
  severityFilter: ('low' | 'medium' | 'high' | 'critical')[];
  rateLimitMinutes: number;
  lastSent?: number;
}

interface NotificationPayload {
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  metadata?: Record<string, any>;
  actionUrl?: string;
}

interface EscalationPolicy {
  id: string;
  name: string;
  steps: EscalationStep[];
  enabled: boolean;
}

interface EscalationStep {
  delayMinutes: number;
  channels: string[];
  condition?: (alert: any) => boolean;
}

class MultiChannelAlertingService {
  private static instance: MultiChannelAlertingService;
  private channels: Map<string, AlertChannel> = new Map();
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();
  private activeEscalations: Map<string, NodeJS.Timeout[]> = new Map();

  private constructor() {
    this.initializeDefaultChannels();
    this.setupAlertSubscription();
  }

  static getInstance(): MultiChannelAlertingService {
    if (!MultiChannelAlertingService.instance) {
      MultiChannelAlertingService.instance = new MultiChannelAlertingService();
    }
    return MultiChannelAlertingService.instance;
  }

  private initializeDefaultChannels() {
    // Email channel
    this.addChannel({
      id: 'email_primary',
      type: 'email',
      name: 'Primary Email Alerts',
      config: {
        smtpHost: process.env.SMTP_HOST || 'localhost',
        smtpPort: process.env.SMTP_PORT || 587,
        from: process.env.ALERT_FROM_EMAIL || 'alerts@company.com',
        recipients: ['admin@company.com', 'ops@company.com']
      },
      enabled: true,
      severityFilter: ['medium', 'high', 'critical'],
      rateLimitMinutes: 5
    });

    // Slack channel
    this.addChannel({
      id: 'slack_ops',
      type: 'slack',
      name: 'Operations Slack Channel',
      config: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: '#ops-alerts',
        username: 'Production Monitor'
      },
      enabled: !!process.env.SLACK_WEBHOOK_URL,
      severityFilter: ['high', 'critical'],
      rateLimitMinutes: 2
    });

    // Discord channel
    this.addChannel({
      id: 'discord_alerts',
      type: 'discord',
      name: 'Discord Alerts Channel',
      config: {
        webhookUrl: process.env.DISCORD_WEBHOOK_URL,
        username: 'Production Monitor',
        avatarUrl: 'https://cdn.discordapp.com/avatars/alerts.png'
      },
      enabled: !!process.env.DISCORD_WEBHOOK_URL,
      severityFilter: ['medium', 'high', 'critical'],
      rateLimitMinutes: 3
    });

    // SMS channel (using Twilio)
    this.addChannel({
      id: 'sms_emergency',
      type: 'sms',
      name: 'Emergency SMS Alerts',
      config: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        from: process.env.TWILIO_PHONE_NUMBER,
        recipients: ['+1234567890'] // Emergency contact numbers
      },
      enabled: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      severityFilter: ['critical'],
      rateLimitMinutes: 30
    });

    // Mobile push notifications
    this.addChannel({
      id: 'push_mobile',
      type: 'push',
      name: 'Mobile Push Notifications',
      config: {
        firebaseServerKey: process.env.FIREBASE_SERVER_KEY,
        topics: ['ops_alerts', 'critical_alerts']
      },
      enabled: !!process.env.FIREBASE_SERVER_KEY,
      severityFilter: ['high', 'critical'],
      rateLimitMinutes: 5
    });

    // Default escalation policy
    this.addEscalationPolicy({
      id: 'default_escalation',
      name: 'Default Escalation Policy',
      enabled: true,
      steps: [
        {
          delayMinutes: 0,
          channels: ['slack_ops', 'discord_alerts']
        },
        {
          delayMinutes: 5,
          channels: ['email_primary'],
          condition: (alert) => alert.severity === 'high' || alert.severity === 'critical'
        },
        {
          delayMinutes: 15,
          channels: ['sms_emergency'],
          condition: (alert) => alert.severity === 'critical'
        },
        {
          delayMinutes: 30,
          channels: ['push_mobile'],
          condition: (alert) => alert.severity === 'critical'
        }
      ]
    });
  }

  private setupAlertSubscription() {
    // Subscribe to alerts from the main alerting service
    productionAlertingService.subscribe((alert) => {
      this.processAlert(alert);
    });
  }

  private async processAlert(alert: any) {
    const payload: NotificationPayload = {
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      timestamp: alert.timestamp,
      metadata: alert.metadata,
      actionUrl: this.generateActionUrl(alert)
    };

    // Send immediate notifications
    await this.sendToMatchingChannels(payload);

    // Start escalation if configured
    const escalationPolicy = this.escalationPolicies.get('default_escalation');
    if (escalationPolicy && escalationPolicy.enabled) {
      this.startEscalation(alert.id, payload, escalationPolicy);
    }

    // Log alert to database
    await this.logAlert(payload);
  }

  private async sendToMatchingChannels(payload: NotificationPayload) {
    const promises: Promise<void>[] = [];

    this.channels.forEach((channel) => {
      if (this.shouldSendToChannel(channel, payload)) {
        promises.push(this.sendToChannel(channel, payload));
      }
    });

    await Promise.allSettled(promises);
  }

  private shouldSendToChannel(channel: AlertChannel, payload: NotificationPayload): boolean {
    // Check if channel is enabled
    if (!channel.enabled) return false;

    // Check severity filter
    if (!channel.severityFilter.includes(payload.severity)) return false;

    // Check rate limiting
    if (channel.lastSent) {
      const timeSinceLastSent = Date.now() - channel.lastSent;
      const rateLimitMs = channel.rateLimitMinutes * 60 * 1000;
      if (timeSinceLastSent < rateLimitMs) return false;
    }

    return true;
  }

  private async sendToChannel(channel: AlertChannel, payload: NotificationPayload) {
    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmail(channel, payload);
          break;
        case 'slack':
          await this.sendSlack(channel, payload);
          break;
        case 'discord':
          await this.sendDiscord(channel, payload);
          break;
        case 'sms':
          await this.sendSMS(channel, payload);
          break;
        case 'push':
          await this.sendPush(channel, payload);
          break;
        case 'webhook':
          await this.sendWebhook(channel, payload);
          break;
      }

      // Update last sent timestamp
      channel.lastSent = Date.now();
      
    } catch (error) {
      console.error(`Failed to send alert via ${channel.type}:`, error);
      
      // Log failed notification
      await supabase.from('audit_logs').insert({
        action_type: 'notification_failed',
        action_description: `Failed to send ${channel.type} notification`,
        metadata: {
          channelId: channel.id,
          error: error.message,
          payload: payload
        }
      });
    }
  }

  private async sendEmail(channel: AlertChannel, payload: NotificationPayload) {
    const emailBody = this.formatEmailBody(payload);
    
    // Use Supabase edge function for email sending
    await supabase.functions.invoke('send-notification-email', {
      body: {
        to: channel.config.recipients,
        from: channel.config.from,
        subject: `[${payload.severity.toUpperCase()}] ${payload.title}`,
        html: emailBody,
        text: this.formatTextBody(payload)
      }
    });
  }

  private async sendSlack(channel: AlertChannel, payload: NotificationPayload) {
    const slackMessage = {
      channel: channel.config.channel,
      username: channel.config.username,
      text: `🚨 ${payload.title}`,
      attachments: [{
        color: this.getSeverityColor(payload.severity),
        fields: [
          {
            title: 'Severity',
            value: payload.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Time',
            value: new Date(payload.timestamp).toISOString(),
            short: true
          },
          {
            title: 'Message',
            value: payload.message,
            short: false
          }
        ],
        actions: payload.actionUrl ? [{
          type: 'button',
          text: 'View Details',
          url: payload.actionUrl
        }] : undefined
      }]
    };

    await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage)
    });
  }

  private async sendDiscord(channel: AlertChannel, payload: NotificationPayload) {
    const discordMessage = {
      username: channel.config.username,
      avatar_url: channel.config.avatarUrl,
      embeds: [{
        title: `🚨 ${payload.title}`,
        description: payload.message,
        color: parseInt(this.getSeverityColor(payload.severity).replace('#', ''), 16),
        fields: [
          {
            name: 'Severity',
            value: payload.severity.toUpperCase(),
            inline: true
          },
          {
            name: 'Time',
            value: new Date(payload.timestamp).toLocaleString(),
            inline: true
          }
        ],
        timestamp: new Date(payload.timestamp).toISOString()
      }]
    };

    await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordMessage)
    });
  }

  private async sendSMS(channel: AlertChannel, payload: NotificationPayload) {
    const message = `[${payload.severity.toUpperCase()}] ${payload.title}: ${payload.message}`;
    
    // Use Supabase edge function for SMS sending
    await supabase.functions.invoke('send-sms-alert', {
      body: {
        accountSid: channel.config.accountSid,
        authToken: channel.config.authToken,
        from: channel.config.from,
        to: channel.config.recipients,
        body: message
      }
    });
  }

  private async sendPush(channel: AlertChannel, payload: NotificationPayload) {
    const pushPayload = {
      notification: {
        title: payload.title,
        body: payload.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        click_action: payload.actionUrl
      },
      data: {
        severity: payload.severity,
        timestamp: payload.timestamp.toString(),
        metadata: JSON.stringify(payload.metadata || {})
      }
    };

    // Send to topics
    for (const topic of channel.config.topics) {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          serverKey: channel.config.firebaseServerKey,
          topic: topic,
          payload: pushPayload
        }
      });
    }
  }

  private async sendWebhook(channel: AlertChannel, payload: NotificationPayload) {
    await fetch(channel.config.url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...channel.config.headers 
      },
      body: JSON.stringify({
        alert: payload,
        source: 'production_monitoring',
        timestamp: new Date().toISOString()
      })
    });
  }

  private startEscalation(alertId: string, payload: NotificationPayload, policy: EscalationPolicy) {
    const timeouts: NodeJS.Timeout[] = [];

    policy.steps.forEach((step, index) => {
      const timeout = setTimeout(async () => {
        // Check if escalation condition is met
        if (step.condition && !step.condition(payload)) {
          return;
        }

        // Send to escalation channels
        const escalationChannels = step.channels
          .map(channelId => this.channels.get(channelId))
          .filter(channel => channel && channel.enabled);

        const escalationPayload = {
          ...payload,
          title: `[ESCALATION ${index + 1}] ${payload.title}`,
          message: `This alert has been escalated after ${step.delayMinutes} minutes. ${payload.message}`
        };

        for (const channel of escalationChannels) {
          await this.sendToChannel(channel!, escalationPayload);
        }

      }, step.delayMinutes * 60 * 1000);

      timeouts.push(timeout);
    });

    this.activeEscalations.set(alertId, timeouts);
  }

  private stopEscalation(alertId: string) {
    const timeouts = this.activeEscalations.get(alertId);
    if (timeouts) {
      timeouts.forEach(timeout => clearTimeout(timeout));
      this.activeEscalations.delete(alertId);
    }
  }

  private formatEmailBody(payload: NotificationPayload): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .alert-header { background: ${this.getSeverityColor(payload.severity)}; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
            .alert-body { border: 1px solid #ddd; padding: 15px; border-radius: 0 0 5px 5px; }
            .metadata { background: #f5f5f5; padding: 10px; margin-top: 10px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="alert-header">
            <h2>🚨 ${payload.title}</h2>
            <p>Severity: ${payload.severity.toUpperCase()}</p>
          </div>
          <div class="alert-body">
            <p><strong>Time:</strong> ${new Date(payload.timestamp).toLocaleString()}</p>
            <p><strong>Message:</strong> ${payload.message}</p>
            ${payload.actionUrl ? `<p><a href="${payload.actionUrl}">View Details</a></p>` : ''}
            ${payload.metadata ? `
              <div class="metadata">
                <strong>Additional Information:</strong>
                <pre>${JSON.stringify(payload.metadata, null, 2)}</pre>
              </div>
            ` : ''}
          </div>
        </body>
      </html>
    `;
  }

  private formatTextBody(payload: NotificationPayload): string {
    return `
      ALERT: ${payload.title}
      Severity: ${payload.severity.toUpperCase()}
      Time: ${new Date(payload.timestamp).toLocaleString()}
      
      ${payload.message}
      
      ${payload.actionUrl ? `View Details: ${payload.actionUrl}` : ''}
      ${payload.metadata ? `\nAdditional Info: ${JSON.stringify(payload.metadata, null, 2)}` : ''}
    `;
  }

  private getSeverityColor(severity: string): string {
    const colors = {
      low: '#28a745',
      medium: '#ffc107', 
      high: '#fd7e14',
      critical: '#dc3545'
    };
    return colors[severity as keyof typeof colors] || '#6c757d';
  }

  private generateActionUrl(alert: any): string {
    return `${window.location.origin}/monitoring?alert=${alert.id}`;
  }

  private async logAlert(payload: NotificationPayload) {
    try {
      await supabase.from('audit_logs').insert({
        action_type: 'alert_sent',
        action_description: `Multi-channel alert sent: ${payload.title}`,
        metadata: {
          severity: payload.severity,
          channels: Array.from(this.channels.keys()),
          payload: payload
        }
      });
    } catch (error) {
      console.error('Failed to log alert:', error);
    }
  }

  // Public API methods
  addChannel(channel: AlertChannel) {
    this.channels.set(channel.id, channel);
  }

  removeChannel(channelId: string) {
    this.channels.delete(channelId);
  }

  updateChannel(channelId: string, updates: Partial<AlertChannel>) {
    const channel = this.channels.get(channelId);
    if (channel) {
      this.channels.set(channelId, { ...channel, ...updates });
    }
  }

  getChannels(): AlertChannel[] {
    return Array.from(this.channels.values());
  }

  addEscalationPolicy(policy: EscalationPolicy) {
    this.escalationPolicies.set(policy.id, policy);
  }

  removeEscalationPolicy(policyId: string) {
    this.escalationPolicies.delete(policyId);
  }

  async testChannel(channelId: string): Promise<boolean> {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    const testPayload: NotificationPayload = {
      title: 'Test Alert',
      message: 'This is a test alert to verify channel configuration.',
      severity: 'low',
      timestamp: Date.now(),
      metadata: { test: true }
    };

    try {
      await this.sendToChannel(channel, testPayload);
      return true;
    } catch (error) {
      console.error(`Test failed for channel ${channelId}:`, error);
      return false;
    }
  }

  resolveAlert(alertId: string) {
    this.stopEscalation(alertId);
  }
}

export const multiChannelAlertingService = MultiChannelAlertingService.getInstance();
export type { AlertChannel, NotificationPayload, EscalationPolicy };