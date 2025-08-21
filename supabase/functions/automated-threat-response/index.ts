import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { withSecurity, SecurityLogger } from '../_shared/security.ts'

interface ThreatAlert {
  user_id?: string;
  ip_address?: string;
  threat_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata?: Record<string, any>;
}

interface ResponseAction {
  action: 'block_ip' | 'lock_account' | 'increase_monitoring' | 'send_alert' | 'rate_limit';
  target: string;
  duration?: number; // minutes
  severity: string;
  reason: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function handleThreatResponse(req: Request, logger: SecurityLogger): Promise<Response> {
  try {
    const { threat_alert } = await req.json() as { threat_alert: ThreatAlert };

    logger.security('Threat detected', threat_alert);

    // Analyze threat and determine appropriate response
    const responses = await analyzeThreat(threat_alert, logger);
    
    // Execute automated responses
    const results = await Promise.all(
      responses.map(response => executeResponse(response, logger))
    );

    // Log the incident with full context
    await logSecurityIncident(threat_alert, responses, results);

    // Send real-time alerts for critical threats
    if (threat_alert.severity === 'critical') {
      await sendRealTimeAlert(threat_alert, responses);
    }

    return new Response(JSON.stringify({
      success: true,
      threat_processed: true,
      responses_executed: results.length,
      actions_taken: responses.map(r => r.action),
      incident_id: crypto.randomUUID()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Automated threat response error', error as Error);
    return new Response(JSON.stringify({
      error: 'Failed to process threat alert',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function analyzeThreat(alert: ThreatAlert, logger: SecurityLogger): Promise<ResponseAction[]> {
  const responses: ResponseAction[] = [];

  switch (alert.threat_type) {
    case 'brute_force_attack':
      if (alert.severity === 'critical') {
        // Lock account immediately
        if (alert.user_id) {
          responses.push({
            action: 'lock_account',
            target: alert.user_id,
            duration: 60, // 1 hour
            severity: alert.severity,
            reason: 'Brute force attack detected'
          });
        }
        
        // Block IP for repeated attempts
        if (alert.ip_address) {
          responses.push({
            action: 'block_ip',
            target: alert.ip_address,
            duration: 120, // 2 hours
            severity: alert.severity,
            reason: 'Repeated failed login attempts'
          });
        }
      }
      break;

    case 'suspicious_access_pattern':
      if (alert.severity === 'high' || alert.severity === 'critical') {
        responses.push({
          action: 'increase_monitoring',
          target: alert.user_id || alert.ip_address || 'unknown',
          duration: 1440, // 24 hours
          severity: alert.severity,
          reason: 'Unusual access pattern detected'
        });
      }
      break;

    case 'data_exfiltration':
      if (alert.severity === 'critical') {
        // Immediate account lock
        if (alert.user_id) {
          responses.push({
            action: 'lock_account',
            target: alert.user_id,
            duration: 2880, // 48 hours
            severity: alert.severity,
            reason: 'Potential data exfiltration detected'
          });
        }
        
        // Send immediate alert to security team
        responses.push({
          action: 'send_alert',
          target: 'security_team',
          severity: alert.severity,
          reason: 'Critical security incident - data exfiltration'
        });
      }
      break;

    case 'api_abuse':
      if (alert.severity === 'high' || alert.severity === 'critical') {
        responses.push({
          action: 'rate_limit',
          target: alert.ip_address || alert.user_id || 'unknown',
          duration: 60,
          severity: alert.severity,
          reason: 'API abuse detected'
        });
      }
      break;

    case 'privilege_escalation':
      if (alert.severity === 'critical') {
        // Immediate lockdown
        if (alert.user_id) {
          responses.push({
            action: 'lock_account',
            target: alert.user_id,
            duration: 1440, // 24 hours
            severity: alert.severity,
            reason: 'Privilege escalation attempt detected'
          });
        }
        
        responses.push({
          action: 'send_alert',
          target: 'admin_team',
          severity: alert.severity,
          reason: 'Critical privilege escalation attempt'
        });
      }
      break;

    default:
      logger.warn('Unknown threat type', { threat_type: alert.threat_type });
  }

  // Always log for analysis
  responses.push({
    action: 'send_alert',
    target: 'security_log',
    severity: alert.severity,
    reason: `${alert.threat_type} incident logged`
  });

  return responses;
}

async function executeResponse(response: ResponseAction, logger: SecurityLogger): Promise<boolean> {
  try {
    switch (response.action) {
      case 'lock_account':
        return await lockUserAccount(response.target, response.duration || 60, response.reason);
      
      case 'block_ip':
        return await blockIpAddress(response.target, response.duration || 60, response.reason);
      
      case 'increase_monitoring':
        return await increaseMonitoring(response.target, response.duration || 60, response.reason);
      
      case 'send_alert':
        return await sendSecurityAlert(response.target, response.severity, response.reason);
      
      case 'rate_limit':
        return await applyRateLimit(response.target, response.duration || 60, response.reason);
      
      default:
        logger.warn('Unknown response action', { action: response.action });
        return false;
    }
  } catch (error) {
    logger.error('Failed to execute response', error as Error, { response });
    return false;
  }
}

async function lockUserAccount(userId: string, durationMinutes: number, reason: string): Promise<boolean> {
  const expiresAt = new Date(Date.now() + (durationMinutes * 60 * 1000));
  
  const { error } = await supabase
    .from('user_security_locks')
    .upsert({
      user_id: userId,
      lock_type: 'automated_threat_response',
      reason,
      expires_at: expiresAt.toISOString(),
      created_by: 'system',
      is_active: true
    });

  return !error;
}

async function blockIpAddress(ipAddress: string, durationMinutes: number, reason: string): Promise<boolean> {
  const expiresAt = new Date(Date.now() + (durationMinutes * 60 * 1000));
  
  const { error } = await supabase
    .from('ip_blocklist')
    .upsert({
      ip_address: ipAddress,
      block_type: 'automated_threat_response',
      reason,
      expires_at: expiresAt.toISOString(),
      created_by: 'system',
      is_active: true
    });

  return !error;
}

async function increaseMonitoring(target: string, durationMinutes: number, reason: string): Promise<boolean> {
  const expiresAt = new Date(Date.now() + (durationMinutes * 60 * 1000));
  
  const { error } = await supabase
    .from('enhanced_monitoring')
    .upsert({
      target_identifier: target,
      monitoring_level: 'enhanced',
      reason,
      expires_at: expiresAt.toISOString(),
      created_by: 'system',
      is_active: true
    });

  return !error;
}

async function sendSecurityAlert(target: string, severity: string, reason: string): Promise<boolean> {
  const { error } = await supabase
    .from('security_alerts')
    .insert({
      alert_type: 'automated_response',
      target,
      severity,
      message: reason,
      status: 'active',
      created_by: 'system'
    });

  return !error;
}

async function applyRateLimit(target: string, durationMinutes: number, reason: string): Promise<boolean> {
  const expiresAt = new Date(Date.now() + (durationMinutes * 60 * 1000));
  
  const { error } = await supabase
    .from('rate_limit_overrides')
    .upsert({
      target_identifier: target,
      limit_requests: 10, // Severely restricted
      limit_window: 60000, // 1 minute
      reason,
      expires_at: expiresAt.toISOString(),
      created_by: 'system',
      is_active: true
    });

  return !error;
}

async function logSecurityIncident(
  alert: ThreatAlert, 
  responses: ResponseAction[], 
  results: boolean[]
): Promise<void> {
  await supabase
    .from('security_incidents')
    .insert({
      incident_type: alert.threat_type,
      severity: alert.severity,
      description: alert.description,
      affected_user: alert.user_id,
      source_ip: alert.ip_address,
      automated_responses: responses,
      response_results: results,
      metadata: alert.metadata,
      status: 'auto_resolved',
      created_by: 'system'
    });
}

async function sendRealTimeAlert(alert: ThreatAlert, responses: ResponseAction[]): Promise<void> {
  // This would integrate with real-time notification systems
  // For now, log as high-priority alert
  await supabase
    .from('real_time_alerts')
    .insert({
      alert_type: 'critical_threat',
      title: `Critical Security Threat: ${alert.threat_type}`,
      message: alert.description,
      severity: alert.severity,
      metadata: {
        threat_alert: alert,
        automated_responses: responses,
        requires_human_review: true
      },
      status: 'active',
      created_by: 'system'
    });
}

export default withSecurity(handleThreatResponse, {
  requireAuth: false, // System function
  rateLimitRequests: 1000,
  rateLimitWindow: 60000,
  adminOnly: true
});