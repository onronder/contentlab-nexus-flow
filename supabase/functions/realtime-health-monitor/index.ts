import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SystemHealthMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_latency: number;
  active_connections: number;
  response_time: number;
  error_rate: number;
  uptime: number;
  cache_hit_rate: number;
  ssl_cert_days_remaining: number;
}

interface SecurityEvent {
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source_ip?: string;
  user_id?: string;
  metadata: Record<string, any>;
}

interface PerformanceAlert {
  metric_name: string;
  current_value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      // Collect comprehensive system health metrics
      const metrics = await collectSystemHealthMetrics();
      
      // Store metrics in database
      await storeHealthMetrics(supabase, metrics);
      
      // Check for performance alerts
      const alerts = await checkPerformanceAlerts(metrics);
      
      // Detect security events
      const securityEvents = await detectSecurityEvents(supabase);
      
      // Calculate overall system health score
      const healthScore = calculateHealthScore(metrics, alerts);
      
      return new Response(JSON.stringify({
        timestamp: new Date().toISOString(),
        health_score: healthScore,
        metrics,
        alerts,
        security_events: securityEvents,
        status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const { action, data } = await req.json();
      
      switch (action) {
        case 'trigger_alert':
          await triggerHealthAlert(supabase, data);
          break;
        case 'resolve_alert':
          await resolveHealthAlert(supabase, data.alert_id);
          break;
        case 'update_thresholds':
          await updateHealthThresholds(supabase, data.thresholds);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Health monitor error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function collectSystemHealthMetrics(): Promise<SystemHealthMetrics> {
  const startTime = performance.now();
  
  // CPU Usage simulation (would use actual system metrics in production)
  const cpuUsage = Math.random() * 30 + 20; // 20-50%
  
  // Memory Usage
  const memoryInfo = (Deno as any).memoryUsage?.() || { 
    rss: 50 * 1024 * 1024, 
    heapTotal: 40 * 1024 * 1024 
  };
  const memoryUsage = (memoryInfo.rss / (512 * 1024 * 1024)) * 100; // Percentage of 512MB
  
  // Disk Usage simulation
  const diskUsage = Math.random() * 20 + 30; // 30-50%
  
  // Network latency test
  const networkLatency = await measureNetworkLatency();
  
  // Database response time
  const responseTime = performance.now() - startTime;
  
  // Active connections simulation
  const activeConnections = Math.floor(Math.random() * 50) + 10;
  
  // Error rate simulation
  const errorRate = Math.random() * 2; // 0-2%
  
  // Uptime simulation (hours)
  const uptime = Math.random() * 168 + 24; // 24-192 hours
  
  // Cache hit rate simulation
  const cacheHitRate = Math.random() * 20 + 80; // 80-100%
  
  // SSL certificate expiry simulation
  const sslCertDaysRemaining = Math.floor(Math.random() * 60) + 30; // 30-90 days
  
  return {
    cpu_usage: Math.round(cpuUsage * 100) / 100,
    memory_usage: Math.round(memoryUsage * 100) / 100,
    disk_usage: Math.round(diskUsage * 100) / 100,
    network_latency: Math.round(networkLatency * 100) / 100,
    active_connections: activeConnections,
    response_time: Math.round(responseTime * 100) / 100,
    error_rate: Math.round(errorRate * 100) / 100,
    uptime: Math.round(uptime * 100) / 100,
    cache_hit_rate: Math.round(cacheHitRate * 100) / 100,
    ssl_cert_days_remaining: sslCertDaysRemaining
  };
}

async function measureNetworkLatency(): Promise<number> {
  const start = performance.now();
  try {
    await fetch('https://httpbin.org/ip', { 
      method: 'HEAD',
      signal: AbortSignal.timeout(5000) 
    });
    return performance.now() - start;
  } catch {
    return 1000; // Default high latency on error
  }
}

async function storeHealthMetrics(supabase: any, metrics: SystemHealthMetrics) {
  try {
    const { error } = await supabase
      .from('system_health_metrics')
      .insert({
        timestamp: new Date().toISOString(),
        cpu_usage: metrics.cpu_usage,
        memory_usage: metrics.memory_usage,
        disk_usage: metrics.disk_usage,
        network_latency: metrics.network_latency,
        active_connections: metrics.active_connections,
        response_time: metrics.response_time,
        error_rate: metrics.error_rate,
        uptime_hours: metrics.uptime,
        cache_hit_rate: metrics.cache_hit_rate,
        ssl_cert_days: metrics.ssl_cert_days_remaining,
        metadata: { source: 'realtime-health-monitor' }
      });
    
    if (error) {
      console.error('Failed to store health metrics:', error);
    }
  } catch (error) {
    console.error('Error storing metrics:', error);
  }
}

async function checkPerformanceAlerts(metrics: SystemHealthMetrics): Promise<PerformanceAlert[]> {
  const alerts: PerformanceAlert[] = [];
  
  // Define thresholds
  const thresholds = {
    cpu_usage: { warning: 70, critical: 90 },
    memory_usage: { warning: 80, critical: 95 },
    response_time: { warning: 1000, critical: 2000 },
    error_rate: { warning: 1, critical: 5 },
    ssl_cert_days: { warning: 30, critical: 7 }
  };
  
  // Check CPU usage
  if (metrics.cpu_usage >= thresholds.cpu_usage.critical) {
    alerts.push({
      metric_name: 'CPU Usage',
      current_value: metrics.cpu_usage,
      threshold: thresholds.cpu_usage.critical,
      severity: 'critical',
      message: `CPU usage is critically high at ${metrics.cpu_usage}%`
    });
  } else if (metrics.cpu_usage >= thresholds.cpu_usage.warning) {
    alerts.push({
      metric_name: 'CPU Usage',
      current_value: metrics.cpu_usage,
      threshold: thresholds.cpu_usage.warning,
      severity: 'warning',
      message: `CPU usage is elevated at ${metrics.cpu_usage}%`
    });
  }
  
  // Check memory usage
  if (metrics.memory_usage >= thresholds.memory_usage.critical) {
    alerts.push({
      metric_name: 'Memory Usage',
      current_value: metrics.memory_usage,
      threshold: thresholds.memory_usage.critical,
      severity: 'critical',
      message: `Memory usage is critically high at ${metrics.memory_usage}%`
    });
  } else if (metrics.memory_usage >= thresholds.memory_usage.warning) {
    alerts.push({
      metric_name: 'Memory Usage',
      current_value: metrics.memory_usage,
      threshold: thresholds.memory_usage.warning,
      severity: 'warning',
      message: `Memory usage is elevated at ${metrics.memory_usage}%`
    });
  }
  
  // Check response time
  if (metrics.response_time >= thresholds.response_time.critical) {
    alerts.push({
      metric_name: 'Response Time',
      current_value: metrics.response_time,
      threshold: thresholds.response_time.critical,
      severity: 'critical',
      message: `Response time is critically slow at ${metrics.response_time}ms`
    });
  } else if (metrics.response_time >= thresholds.response_time.warning) {
    alerts.push({
      metric_name: 'Response Time',
      current_value: metrics.response_time,
      threshold: thresholds.response_time.warning,
      severity: 'warning',
      message: `Response time is elevated at ${metrics.response_time}ms`
    });
  }
  
  // Check error rate
  if (metrics.error_rate >= thresholds.error_rate.critical) {
    alerts.push({
      metric_name: 'Error Rate',
      current_value: metrics.error_rate,
      threshold: thresholds.error_rate.critical,
      severity: 'critical',
      message: `Error rate is critically high at ${metrics.error_rate}%`
    });
  } else if (metrics.error_rate >= thresholds.error_rate.warning) {
    alerts.push({
      metric_name: 'Error Rate',
      current_value: metrics.error_rate,
      threshold: thresholds.error_rate.warning,
      severity: 'warning',
      message: `Error rate is elevated at ${metrics.error_rate}%`
    });
  }
  
  // Check SSL certificate expiry
  if (metrics.ssl_cert_days_remaining <= thresholds.ssl_cert_days.critical) {
    alerts.push({
      metric_name: 'SSL Certificate',
      current_value: metrics.ssl_cert_days_remaining,
      threshold: thresholds.ssl_cert_days.critical,
      severity: 'critical',
      message: `SSL certificate expires in ${metrics.ssl_cert_days_remaining} days`
    });
  } else if (metrics.ssl_cert_days_remaining <= thresholds.ssl_cert_days.warning) {
    alerts.push({
      metric_name: 'SSL Certificate',
      current_value: metrics.ssl_cert_days_remaining,
      threshold: thresholds.ssl_cert_days.warning,
      severity: 'warning',
      message: `SSL certificate expires in ${metrics.ssl_cert_days_remaining} days`
    });
  }
  
  return alerts;
}

async function detectSecurityEvents(supabase: any): Promise<SecurityEvent[]> {
  const events: SecurityEvent[] = [];
  
  try {
    // Check for recent failed authentication attempts
    const { data: failedLogins } = await supabase
      .from('security_audit_logs')
      .select('*')
      .eq('event_type', 'authentication_failed')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .limit(100);
    
    if (failedLogins && failedLogins.length > 10) {
      events.push({
        event_type: 'suspicious_auth_activity',
        severity: failedLogins.length > 50 ? 'critical' : 'medium',
        description: `${failedLogins.length} failed authentication attempts in the last hour`,
        metadata: { count: failedLogins.length, timeframe: '1h' }
      });
    }
    
    // Check for rate limit violations
    const { data: rateLimits } = await supabase
      .from('security_audit_logs')
      .select('*')
      .eq('event_type', 'rate_limit_exceeded')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString())
      .limit(50);
    
    if (rateLimits && rateLimits.length > 5) {
      events.push({
        event_type: 'rate_limit_violations',
        severity: 'medium',
        description: `${rateLimits.length} rate limit violations detected`,
        metadata: { count: rateLimits.length }
      });
    }
    
  } catch (error) {
    console.error('Error detecting security events:', error);
  }
  
  return events;
}

function calculateHealthScore(metrics: SystemHealthMetrics, alerts: PerformanceAlert[]): number {
  let score = 100;
  
  // Deduct points for high resource usage
  if (metrics.cpu_usage > 70) score -= (metrics.cpu_usage - 70) * 2;
  if (metrics.memory_usage > 80) score -= (metrics.memory_usage - 80) * 3;
  if (metrics.response_time > 1000) score -= Math.min((metrics.response_time - 1000) / 100, 20);
  if (metrics.error_rate > 1) score -= metrics.error_rate * 10;
  
  // Deduct points for alerts
  alerts.forEach(alert => {
    score -= alert.severity === 'critical' ? 20 : 10;
  });
  
  // Add points for good metrics
  if (metrics.cache_hit_rate > 90) score += 5;
  if (metrics.ssl_cert_days_remaining > 60) score += 2;
  
  return Math.max(0, Math.min(100, score));
}

async function triggerHealthAlert(supabase: any, alertData: any) {
  try {
    await supabase
      .from('system_alerts')
      .insert({
        alert_type: 'health',
        severity: alertData.severity,
        message: alertData.message,
        metadata: alertData.metadata,
        status: 'active',
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error triggering alert:', error);
  }
}

async function resolveHealthAlert(supabase: any, alertId: string) {
  try {
    await supabase
      .from('system_alerts')
      .update({ 
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })
      .eq('id', alertId);
  } catch (error) {
    console.error('Error resolving alert:', error);
  }
}

async function updateHealthThresholds(supabase: any, thresholds: any) {
  try {
    await supabase
      .from('monitoring_config')
      .upsert({
        config_type: 'health_thresholds',
        config_data: thresholds,
        updated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error updating thresholds:', error);
  }
}