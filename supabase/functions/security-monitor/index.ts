import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { withSecurity, SecurityLogger } from '../_shared/security.ts'

interface SecurityMonitorRequest {
  user_id: string;
  event_type: string;
  event_data?: Record<string, any>;
  severity?: 'info' | 'warning' | 'critical';
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function handleSecurityMonitor(req: Request, logger: SecurityLogger): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body: SecurityMonitorRequest = await req.json();
    const { user_id, event_type, event_data = {}, severity = 'info' } = body;

    if (!user_id || !event_type) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: user_id, event_type' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get client IP and user agent
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Enhanced security context
    const enhancedEventData = {
      ...event_data,
      timestamp: new Date().toISOString(),
      client_ip: clientIP,
      user_agent: userAgent,
      origin: req.headers.get('origin'),
      referer: req.headers.get('referer')
    };

    // Analyze and potentially escalate severity
    let finalSeverity = severity;
    
    // Threat detection patterns
    if (event_type === 'login_failed' && event_data.consecutive_failures >= 5) {
      finalSeverity = 'critical';
      enhancedEventData.threat_type = 'brute_force_attack';
    }
    
    if (event_type === 'session_created' && event_data.multiple_sessions) {
      finalSeverity = 'warning';
      enhancedEventData.threat_type = 'account_sharing_or_hijacking';
    }
    
    if (event_type === 'permission_denied' && event_data.permission_escalation) {
      finalSeverity = 'critical';
      enhancedEventData.threat_type = 'privilege_escalation_attempt';
    }

    // Store security event
    const { data: securityEvent, error: insertError } = await supabase
      .from('security_events')
      .insert({
        user_id,
        event_type,
        event_data: enhancedEventData,
        severity: finalSeverity,
        ip_address: clientIP,
        user_agent: userAgent
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Failed to insert security event', insertError);
      throw insertError;
    }

    // Log to audit trail for compliance
    await supabase
      .from('permission_audit_logs')
      .insert({
        user_id,
        permission_slug: `security.${event_type}`,
        action: finalSeverity === 'critical' ? 'denied' : 'granted',
        resource_type: 'security_event',
        resource_id: securityEvent.id,
        metadata: {
          event_type,
          severity: finalSeverity,
          threat_analysis: enhancedEventData
        }
      });

    // Real-time threat response for critical events
    if (finalSeverity === 'critical') {
      logger.security('Critical security event detected', {
        user_id,
        event_type,
        threat_type: enhancedEventData.threat_type,
        client_ip: clientIP
      });

      // Auto-disable suspicious sessions for brute force attacks
      if (enhancedEventData.threat_type === 'brute_force_attack') {
        await supabase
          .from('user_sessions')
          .update({ 
            security_flags: { 
              suspicious: true, 
              auto_disabled: true,
              reason: 'brute_force_protection'
            }
          })
          .eq('user_id', user_id)
          .eq('ip_address', clientIP);
      }
    }

    // Behavioral analytics - track patterns
    const { data: recentEvents } = await supabase
      .from('security_events')
      .select('event_type, severity, created_at')
      .eq('user_id', user_id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    // Generate threat score based on recent activity
    const threatScore = calculateThreatScore(recentEvents || []);
    
    logger.info('Security event processed', {
      user_id,
      event_type,
      severity: finalSeverity,
      threat_score: threatScore,
      event_id: securityEvent.id
    });

    return new Response(JSON.stringify({
      success: true,
      event_id: securityEvent.id,
      severity: finalSeverity,
      threat_score: threatScore,
      actions_taken: finalSeverity === 'critical' ? ['audit_logged', 'session_flagged'] : ['audit_logged']
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Security monitoring error', error as Error);
    
    return new Response(JSON.stringify({
      error: 'Failed to process security event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function calculateThreatScore(events: any[]): number {
  let score = 0;
  
  for (const event of events) {
    switch (event.severity) {
      case 'critical':
        score += 10;
        break;
      case 'warning':
        score += 5;
        break;
      case 'info':
        score += 1;
        break;
    }
  }
  
  // Normalize to 0-100 scale
  return Math.min(100, score);
}

// Export the handler with security middleware
export default withSecurity(handleSecurityMonitor, {
  requireAuth: false, // Allow internal system calls
  rateLimitRequests: 1000,
  rateLimitWindow: 60000,
  enableCORS: true
});