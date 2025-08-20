/**
 * Enhanced Security Monitor - Comprehensive security event processing and alerting
 * Handles advanced threat detection, automated responses, and security analytics
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { withSecurity, SecurityLogger } from '../_shared/security.ts';

interface SecurityEvent {
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  user_id?: string;
  team_id?: string;
  event_data: Record<string, any>;
  description: string;
  ip_address?: string;
  user_agent?: string;
  request_path?: string;
  correlation_id?: string;
}

// Threat detection patterns
const THREAT_PATTERNS = {
  brute_force: {
    pattern: /failed.*login|authentication.*failed|invalid.*credentials/i,
    threshold: 5,
    window_minutes: 15
  },
  sql_injection: {
    pattern: /(union|select|insert|update|delete|drop|create|alter).*['"`;]/i,
    threshold: 1,
    window_minutes: 5
  },
  xss_attempt: {
    pattern: /<script|javascript:|on\w+=/i,
    threshold: 1,
    window_minutes: 5
  },
  rate_limit_abuse: {
    pattern: /rate.*limit|too.*many.*requests/i,
    threshold: 10,
    window_minutes: 10
  },
  privilege_escalation: {
    pattern: /unauthorized|forbidden|access.*denied/i,
    threshold: 3,
    window_minutes: 10
  }
};

const handler = withSecurity(async (req, logger) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { events, analysis_type = 'realtime' } = body;

    if (analysis_type === 'batch') {
      return await processBatchAnalysis(events, supabase, logger);
    }

    // Process single event
    const event: SecurityEvent = events[0] || body;
    
    logger.security('Processing security event', {
      eventType: event.event_type,
      severity: event.severity,
      userId: event.user_id
    });

    // Enrich event with additional context
    const enrichedEvent = await enrichSecurityEvent(event, supabase, logger);
    
    // Perform threat analysis
    const threatAnalysis = await analyzeThreat(enrichedEvent, supabase, logger);
    
    // Store event with analysis
    const { data: storedEvent, error: storeError } = await supabase
      .from('security_events')
      .insert({
        ...enrichedEvent,
        event_data: {
          ...enrichedEvent.event_data,
          threat_analysis: threatAnalysis,
          auto_processed: true
        },
        action_taken: threatAnalysis.recommended_action,
        automatic_response: threatAnalysis.auto_response_triggered
      })
      .select()
      .single();

    if (storeError) {
      logger.error('Failed to store security event', storeError);
      throw storeError;
    }

    // Execute automated responses if needed
    if (threatAnalysis.auto_response_triggered) {
      await executeAutomatedResponse(enrichedEvent, threatAnalysis, supabase, logger);
    }

    // Generate real-time alerts for critical events
    if (event.severity === 'critical' || threatAnalysis.threat_score > 8) {
      await generateSecurityAlert(enrichedEvent, threatAnalysis, supabase, logger);
    }

    logger.info('Security event processed', {
      eventId: storedEvent.id,
      threatScore: threatAnalysis.threat_score,
      actionTaken: threatAnalysis.recommended_action
    });

    return new Response(JSON.stringify({
      success: true,
      event_id: storedEvent.id,
      threat_score: threatAnalysis.threat_score,
      action_taken: threatAnalysis.recommended_action,
      recommendations: threatAnalysis.recommendations
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Enhanced security monitor error', error as Error);
    
    return new Response(JSON.stringify({
      error: 'Security monitoring failed',
      success: false
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}, {
  requireAuth: false, // Allow system calls
  rateLimitRequests: 500,
  rateLimitWindow: 60000,
  validateInput: true,
  enableCORS: true
});

// Enrich security event with additional context
async function enrichSecurityEvent(event: SecurityEvent, supabase: any, logger: SecurityLogger) {
  const enriched = { ...event };
  
  // Add IP geolocation (simplified)
  if (event.ip_address) {
    enriched.event_data.ip_info = {
      type: event.ip_address.includes('127.0.0.1') || event.ip_address.includes('localhost') ? 'local' : 'external',
      is_tor: false, // Would integrate with threat intelligence
      is_vpn: false,
      country: 'Unknown'
    };
  }

  // Add user context if available
  if (event.user_id) {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('created_at, last_sign_in_at')
      .eq('id', event.user_id)
      .single();

    if (userProfile) {
      enriched.event_data.user_context = {
        account_age_days: Math.floor((Date.now() - new Date(userProfile.created_at).getTime()) / (24 * 60 * 60 * 1000)),
        last_active: userProfile.last_sign_in_at
      };
    }
  }

  // Add request patterns
  enriched.event_data.request_patterns = {
    user_agent_analysis: analyzeUserAgent(event.user_agent || ''),
    suspicious_path: event.request_path ? /admin|api|\.php|\.asp/.test(event.request_path) : false
  };

  return enriched;
}

// Analyze threat level and determine response
async function analyzeThreat(event: SecurityEvent, supabase: any, logger: SecurityLogger) {
  let threatScore = 0;
  let recommendedAction = 'none';
  let autoResponseTriggered = false;
  const recommendations: string[] = [];

  // Base severity scoring
  const severityScores = { info: 1, warning: 3, critical: 7 };
  threatScore += severityScores[event.severity];

  // Pattern-based threat detection
  const eventDescription = event.description.toLowerCase();
  const eventData = JSON.stringify(event.event_data).toLowerCase();
  const combinedText = `${eventDescription} ${eventData}`;

  for (const [threatType, config] of Object.entries(THREAT_PATTERNS)) {
    if (config.pattern.test(combinedText)) {
      threatScore += 2;
      
      // Check for repeated patterns
      const recentEvents = await getRecentSimilarEvents(
        event, 
        threatType, 
        config.window_minutes, 
        supabase
      );

      if (recentEvents >= config.threshold) {
        threatScore += 4;
        recommendedAction = getThreatAction(threatType);
        autoResponseTriggered = shouldAutoRespond(threatType, recentEvents);
        recommendations.push(`Detected ${threatType} pattern (${recentEvents} occurrences)`);
      }
    }
  }

  // IP-based scoring
  if (event.event_data?.ip_info?.is_tor) threatScore += 2;
  if (event.event_data?.ip_info?.is_vpn) threatScore += 1;

  // User behavior scoring
  if (event.event_data?.user_context?.account_age_days < 1) threatScore += 1;
  if (event.event_data?.request_patterns?.suspicious_path) threatScore += 1;

  // Rate limiting patterns
  if (event.event_type === 'rate_limit_exceeded') {
    threatScore += 2;
    recommendedAction = 'rate_limit';
  }

  return {
    threat_score: Math.min(threatScore, 10), // Cap at 10
    recommended_action: recommendedAction,
    auto_response_triggered: autoResponseTriggered,
    recommendations,
    analysis_timestamp: new Date().toISOString()
  };
}

// Get similar recent events for pattern detection
async function getRecentSimilarEvents(event: SecurityEvent, threatType: string, windowMinutes: number, supabase: any) {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  
  let query = supabase
    .from('security_events')
    .select('id')
    .gte('created_at', since);

  // Add relevant filters based on threat type
  if (event.ip_address) {
    query = query.eq('ip_address', event.ip_address);
  }
  
  if (event.user_id && ['brute_force', 'privilege_escalation'].includes(threatType)) {
    query = query.eq('user_id', event.user_id);
  }

  const { data, error } = await query;
  return error ? 0 : (data?.length || 0);
}

// Determine action based on threat type
function getThreatAction(threatType: string): string {
  const actions = {
    brute_force: 'block_ip',
    sql_injection: 'block_request',
    xss_attempt: 'block_request',
    rate_limit_abuse: 'rate_limit',
    privilege_escalation: 'review_permissions'
  };
  return actions[threatType as keyof typeof actions] || 'monitor';
}

// Determine if automatic response should be triggered
function shouldAutoRespond(threatType: string, eventCount: number): boolean {
  const autoResponseThresholds = {
    brute_force: 10,
    sql_injection: 1,
    xss_attempt: 1,
    rate_limit_abuse: 15,
    privilege_escalation: 5
  };
  
  const threshold = autoResponseThresholds[threatType as keyof typeof autoResponseThresholds] || 999;
  return eventCount >= threshold;
}

// Execute automated security responses
async function executeAutomatedResponse(event: SecurityEvent, analysis: any, supabase: any, logger: SecurityLogger) {
  logger.security('Executing automated response', {
    action: analysis.recommended_action,
    threatScore: analysis.threat_score
  });

  switch (analysis.recommended_action) {
    case 'block_ip':
      // In a real implementation, this would add IP to firewall blocklist
      logger.warn('IP blocking requested', { ip: event.ip_address });
      break;
      
    case 'rate_limit':
      // Enhanced rate limiting would be applied
      logger.warn('Enhanced rate limiting applied', { ip: event.ip_address });
      break;
      
    case 'block_request':
      // Request pattern would be added to WAF rules
      logger.warn('Request blocking pattern added', { pattern: event.request_path });
      break;
      
    case 'review_permissions':
      // Flag user for permission review
      if (event.user_id) {
        await supabase
          .from('security_events')
          .insert({
            event_type: 'permission_review_required',
            severity: 'warning',
            user_id: event.user_id,
            event_data: { triggered_by: event.correlation_id },
            description: 'User flagged for permission review due to suspicious activity'
          });
      }
      break;
  }
}

// Generate security alerts for critical events
async function generateSecurityAlert(event: SecurityEvent, analysis: any, supabase: any, logger: SecurityLogger) {
  logger.security('Generating security alert', {
    severity: event.severity,
    threatScore: analysis.threat_score
  });

  // In production, this would send alerts via:
  // - Email to security team
  // - Slack/Teams notifications
  // - PagerDuty for critical events
  // - SIEM integration

  // For now, log the alert
  logger.warn('SECURITY ALERT', {
    event_type: event.event_type,
    severity: event.severity,
    threat_score: analysis.threat_score,
    ip_address: event.ip_address,
    user_id: event.user_id,
    description: event.description,
    recommended_action: analysis.recommended_action
  });
}

// Process batch analysis for multiple events
async function processBatchAnalysis(events: SecurityEvent[], supabase: any, logger: SecurityLogger) {
  logger.info('Processing batch security analysis', { eventCount: events.length });

  const results = [];
  
  for (const event of events) {
    try {
      const enriched = await enrichSecurityEvent(event, supabase, logger);
      const analysis = await analyzeThreat(enriched, supabase, logger);
      
      results.push({
        event_type: event.event_type,
        threat_score: analysis.threat_score,
        recommended_action: analysis.recommended_action
      });
    } catch (error) {
      logger.error('Batch analysis error for event', error as Error);
      results.push({ error: 'Analysis failed' });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    processed_count: events.length,
    results
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Analyze user agent for suspicious patterns
function analyzeUserAgent(userAgent: string) {
  const suspicious_patterns = [
    /bot|crawler|spider/i,
    /curl|wget|python|postman/i,
    /scan|probe|test/i
  ];

  const is_suspicious = suspicious_patterns.some(pattern => pattern.test(userAgent));
  
  return {
    is_suspicious,
    is_browser: /Mozilla|Chrome|Firefox|Safari|Edge/.test(userAgent),
    is_mobile: /Mobile|Android|iPhone|iPad/.test(userAgent)
  };
}

Deno.serve(handler);