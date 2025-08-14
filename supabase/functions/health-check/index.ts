/**
 * Health Check Endpoint for Production Monitoring
 * Provides comprehensive health status for all system components
 */

import { withSecurity } from '../_shared/security.ts';
import { globalHealthChecker, checkSupabaseHealth, checkExternalApiHealth } from '../_shared/monitoring.ts';

const handler = withSecurity(async (req, logger) => {
  logger.info('Health check requested');
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  
  // Add database health check
  globalHealthChecker.addCheck('database', async () => {
    return await checkSupabaseHealth(supabaseUrl, supabaseKey);
  });
  
  // Add OpenAI health check if configured
  if (openaiKey) {
    globalHealthChecker.addCheck('openai', async () => {
      return await checkExternalApiHealth('https://api.openai.com/v1/models', {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      });
    });
  }
  
  // Add environment check
  globalHealthChecker.addCheck('environment', async () => {
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
    const missing = requiredEnvVars.filter(env => !Deno.env.get(env));
    
    if (missing.length > 0) {
      return {
        status: 'fail',
        message: `Missing environment variables: ${missing.join(', ')}`,
        metadata: { missing_vars: missing }
      };
    }
    
    return {
      status: 'pass',
      message: 'All required environment variables present'
    };
  });
  
  // Run all health checks
  const healthResult = await globalHealthChecker.runChecks();
  
  logger.info('Health check completed', {
    status: healthResult.status,
    checkCount: Object.keys(healthResult.checks).length
  });
  
  // Return appropriate HTTP status based on health
  let httpStatus = 200;
  if (healthResult.status === 'degraded') {
    httpStatus = 200; // Still OK, but with warnings
  } else if (healthResult.status === 'unhealthy') {
    httpStatus = 503; // Service unavailable
  }
  
  return new Response(JSON.stringify(healthResult), {
    status: httpStatus,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}, {
  requireAuth: false, // Health checks should be public
  rateLimitRequests: 60, // Allow more frequent health checks
  rateLimitWindow: 60000
});

Deno.serve(handler);