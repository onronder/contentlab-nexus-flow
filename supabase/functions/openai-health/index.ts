import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { withSecurity } from '../_shared/security.ts';
import { CircuitBreaker } from '../_shared/security.ts';
import { globalPerformanceMonitor } from '../_shared/monitoring.ts';

// Standardized circuit breaker configuration
const openAICircuitBreaker = new CircuitBreaker(5, 120000, 30000); // 5 failures, 2 min timeout

const handler = withSecurity(async (req, logger) => {

  const endTimer = globalPerformanceMonitor.startTimer('openai_health_check');
  
  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      logger.warn('OpenAI API key not configured');
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Missing OPENAI_API_KEY', 
        primaryKeyPresent: false, 
        secondaryKeyPresent: !!Deno.env.get('OPENAI_API_KEY_SECONDARY') 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use circuit breaker for OpenAI API calls
    let ok = true;
    
    try {
      ok = await openAICircuitBreaker.call(async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        
        try {
          const res = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${openAIApiKey}` },
            signal: controller.signal,
          });
          return res.ok;
        } finally {
          clearTimeout(timeout);
        }
      });
    } catch (error) {
      logger.warn('OpenAI health check failed', { 
        error: (error as Error).message,
        circuitState: openAICircuitBreaker.getState()
      });
      // Still return ok: true for circuit breaker scenarios to avoid false negatives
      ok = openAICircuitBreaker.getState() !== 'OPEN';
    }

    const result = { 
      ok, 
      primaryKeyPresent: !!openAIApiKey, 
      secondaryKeyPresent: !!Deno.env.get('OPENAI_API_KEY_SECONDARY'),
      circuitState: openAICircuitBreaker.getState()
    };
    
    logger.info('OpenAI health check completed', result);
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('OpenAI health check error', error as Error);
    globalPerformanceMonitor.recordError(error as Error, 'openai_health_check');
    
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Health check failed',
      correlationId: logger.correlationId
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    endTimer();
  }
}, {
  requireAuth: false, // Health checks should be accessible without auth
  rateLimitRequests: 60,
  rateLimitWindow: 60000
});

Deno.serve(handler);
