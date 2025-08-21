import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { withSecurity, SecurityLogger } from '../_shared/security.ts'

interface RateLimitConfig {
  user_tier: 'free' | 'premium' | 'enterprise';
  endpoint_type: 'api' | 'auth' | 'upload' | 'email';
  base_limit: number;
  burst_limit: number;
  window_minutes: number;
  threat_multiplier: number;
}

interface RateLimitRequest {
  identifier: string; // user_id or ip_address
  endpoint: string;
  user_tier?: string;
  threat_level?: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Tier-based rate limiting configurations
const RATE_LIMIT_CONFIGS: Record<string, Record<string, RateLimitConfig>> = {
  free: {
    api: { user_tier: 'free', endpoint_type: 'api', base_limit: 100, burst_limit: 150, window_minutes: 60, threat_multiplier: 0.5 },
    auth: { user_tier: 'free', endpoint_type: 'auth', base_limit: 10, burst_limit: 15, window_minutes: 15, threat_multiplier: 0.3 },
    upload: { user_tier: 'free', endpoint_type: 'upload', base_limit: 20, burst_limit: 30, window_minutes: 60, threat_multiplier: 0.2 },
    email: { user_tier: 'free', endpoint_type: 'email', base_limit: 5, burst_limit: 8, window_minutes: 60, threat_multiplier: 0.1 }
  },
  premium: {
    api: { user_tier: 'premium', endpoint_type: 'api', base_limit: 1000, burst_limit: 1500, window_minutes: 60, threat_multiplier: 0.7 },
    auth: { user_tier: 'premium', endpoint_type: 'auth', base_limit: 50, burst_limit: 75, window_minutes: 15, threat_multiplier: 0.5 },
    upload: { user_tier: 'premium', endpoint_type: 'upload', base_limit: 200, burst_limit: 300, window_minutes: 60, threat_multiplier: 0.5 },
    email: { user_tier: 'premium', endpoint_type: 'email', base_limit: 100, burst_limit: 150, window_minutes: 60, threat_multiplier: 0.3 }
  },
  enterprise: {
    api: { user_tier: 'enterprise', endpoint_type: 'api', base_limit: 10000, burst_limit: 15000, window_minutes: 60, threat_multiplier: 0.9 },
    auth: { user_tier: 'enterprise', endpoint_type: 'auth', base_limit: 200, burst_limit: 300, window_minutes: 15, threat_multiplier: 0.8 },
    upload: { user_tier: 'enterprise', endpoint_type: 'upload', base_limit: 1000, burst_limit: 1500, window_minutes: 60, threat_multiplier: 0.8 },
    email: { user_tier: 'enterprise', endpoint_type: 'email', base_limit: 1000, burst_limit: 1500, window_minutes: 60, threat_multiplier: 0.7 }
  }
};

async function handleEnhancedRateLimit(req: Request, logger: SecurityLogger): Promise<Response> {
  try {
    if (req.method === 'POST') {
      const rateLimitReq: RateLimitRequest = await req.json();
      
      const result = await checkRateLimit(rateLimitReq, logger);
      
      return new Response(JSON.stringify({
        success: true,
        allowed: result.allowed,
        remaining: result.remaining,
        reset_time: result.resetTime,
        tier: result.config.user_tier,
        limit_applied: result.effectiveLimit
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const identifier = url.searchParams.get('identifier');
      const endpoint = url.searchParams.get('endpoint');
      
      if (!identifier || !endpoint) {
        throw new Error('Missing required parameters: identifier, endpoint');
      }

      const status = await getRateLimitStatus(identifier, endpoint);
      
      return new Response(JSON.stringify({
        success: true,
        status
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const identifier = url.searchParams.get('identifier');
      
      if (!identifier) {
        throw new Error('Missing required parameter: identifier');
      }

      await resetRateLimit(identifier);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Rate limit reset successfully'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Enhanced rate limiting error', error as Error);
    return new Response(JSON.stringify({
      error: 'Rate limiting service error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function checkRateLimit(req: RateLimitRequest, logger: SecurityLogger) {
  // Get user tier and threat level
  const userTier = req.user_tier || await getUserTier(req.identifier);
  const threatLevel = req.threat_level || await getThreatLevel(req.identifier);
  
  // Determine endpoint type
  const endpointType = getEndpointType(req.endpoint);
  
  // Get configuration for this tier and endpoint
  const config = RATE_LIMIT_CONFIGS[userTier]?.[endpointType] || RATE_LIMIT_CONFIGS.free.api;
  
  // Apply threat-based adjustments
  const effectiveLimit = Math.floor(config.base_limit * getThreatMultiplier(threatLevel, config.threat_multiplier));
  const effectiveBurst = Math.floor(config.burst_limit * getThreatMultiplier(threatLevel, config.threat_multiplier));
  
  // Check current usage
  const windowStart = new Date(Date.now() - (config.window_minutes * 60 * 1000));
  
  const { data: currentUsage, error } = await supabase
    .from('rate_limit_usage')
    .select('request_count, burst_count, window_start')
    .eq('identifier', req.identifier)
    .eq('endpoint_type', endpointType)
    .gte('created_at', windowStart.toISOString())
    .single();

  if (error && error.code !== 'PGRST116') { // Not found is OK
    throw new Error(`Failed to check rate limit: ${error.message}`);
  }

  let requestCount = 0;
  let burstCount = 0;
  
  if (currentUsage) {
    requestCount = currentUsage.request_count || 0;
    burstCount = currentUsage.burst_count || 0;
  }

  // Check if request is allowed
  const allowed = requestCount < effectiveLimit && burstCount < effectiveBurst;
  
  if (allowed) {
    // Update usage
    await updateRateLimitUsage(req.identifier, endpointType, requestCount + 1, burstCount + 1, config.window_minutes);
  } else {
    // Log rate limit exceeded
    logger.warn('Rate limit exceeded', {
      identifier: req.identifier,
      endpoint: req.endpoint,
      current_count: requestCount,
      limit: effectiveLimit,
      threat_level: threatLevel
    });

    // Log rate limit violation
    await logRateLimitViolation(req.identifier, req.endpoint, threatLevel, effectiveLimit, requestCount);
  }

  const resetTime = new Date(Date.now() + (config.window_minutes * 60 * 1000));
  
  return {
    allowed,
    remaining: Math.max(0, effectiveLimit - requestCount),
    resetTime: resetTime.toISOString(),
    config,
    effectiveLimit,
    threatLevel
  };
}

async function getUserTier(identifier: string): Promise<string> {
  // Try to get from user profiles first
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', identifier)
    .single();

  if (profile?.subscription_tier) {
    return profile.subscription_tier;
  }

  // Check team memberships for enterprise tier
  const { data: teamMember } = await supabase
    .from('team_members')
    .select('teams(subscription_tier)')
    .eq('user_id', identifier)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (teamMember?.teams?.subscription_tier === 'enterprise') {
    return 'enterprise';
  }

  return 'free'; // Default tier
}

async function getThreatLevel(identifier: string): Promise<string> {
  // Check recent security events
  const { data: recentEvents } = await supabase
    .from('security_events')
    .select('severity, event_type')
    .or(`user_id.eq.${identifier},ip_address.eq.${identifier}`)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  if (!recentEvents || recentEvents.length === 0) {
    return 'none';
  }

  // Analyze threat level based on recent events
  const criticalEvents = recentEvents.filter(e => e.severity === 'critical').length;
  const highEvents = recentEvents.filter(e => e.severity === 'warning').length;

  if (criticalEvents > 0) return 'critical';
  if (highEvents > 2) return 'high';
  if (recentEvents.length > 5) return 'medium';
  
  return 'low';
}

function getEndpointType(endpoint: string): string {
  if (endpoint.includes('/auth/')) return 'auth';
  if (endpoint.includes('/upload') || endpoint.includes('/storage/')) return 'upload';
  if (endpoint.includes('/email') || endpoint.includes('/notifications/')) return 'email';
  return 'api';
}

function getThreatMultiplier(threatLevel: string, baseThreatMultiplier: number): number {
  const multipliers = {
    none: 1.0,
    low: 0.9,
    medium: 0.7,
    high: 0.5,
    critical: 0.2
  };
  
  return multipliers[threatLevel as keyof typeof multipliers] || baseThreatMultiplier;
}

async function updateRateLimitUsage(
  identifier: string, 
  endpointType: string, 
  requestCount: number, 
  burstCount: number,
  windowMinutes: number
): Promise<void> {
  const windowStart = new Date(Date.now() - (windowMinutes * 60 * 1000));
  
  await supabase
    .from('rate_limit_usage')
    .upsert({
      identifier,
      endpoint_type: endpointType,
      request_count: requestCount,
      burst_count: burstCount,
      window_start: windowStart.toISOString(),
      last_request_at: new Date().toISOString()
    }, {
      onConflict: 'identifier,endpoint_type'
    });
}

async function logRateLimitViolation(
  identifier: string,
  endpoint: string,
  threatLevel: string,
  limit: number,
  currentCount: number
): Promise<void> {
  await supabase
    .from('security_events')
    .insert({
      user_id: identifier.length === 36 ? identifier : null, // UUID check
      ip_address: identifier.length !== 36 ? identifier : null,
      event_type: 'rate_limit_exceeded',
      severity: threatLevel === 'critical' || threatLevel === 'high' ? 'warning' : 'info',
      event_data: {
        endpoint,
        limit,
        current_count: currentCount,
        threat_level: threatLevel,
        timestamp: new Date().toISOString()
      }
    });
}

async function getRateLimitStatus(identifier: string, endpoint: string) {
  const endpointType = getEndpointType(endpoint);
  
  const { data: usage } = await supabase
    .from('rate_limit_usage')
    .select('*')
    .eq('identifier', identifier)
    .eq('endpoint_type', endpointType)
    .single();

  const userTier = await getUserTier(identifier);
  const threatLevel = await getThreatLevel(identifier);
  const config = RATE_LIMIT_CONFIGS[userTier]?.[endpointType] || RATE_LIMIT_CONFIGS.free.api;
  
  return {
    identifier,
    endpoint_type: endpointType,
    user_tier: userTier,
    threat_level: threatLevel,
    current_usage: usage?.request_count || 0,
    limit: Math.floor(config.base_limit * getThreatMultiplier(threatLevel, config.threat_multiplier)),
    window_minutes: config.window_minutes,
    last_request: usage?.last_request_at
  };
}

async function resetRateLimit(identifier: string): Promise<void> {
  await supabase
    .from('rate_limit_usage')
    .delete()
    .eq('identifier', identifier);
}

export default withSecurity(handleEnhancedRateLimit, {
  requireAuth: false, // System function
  rateLimitRequests: 10000,
  rateLimitWindow: 60000,
  adminOnly: true
});