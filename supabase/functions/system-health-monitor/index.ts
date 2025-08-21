import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withSecurity, SecurityLogger } from '../_shared/security.ts'

interface HealthStatus {
  service_name: string;
  service_version?: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  response_time_ms?: number;
  uptime_percentage?: number;
  error_rate?: number;
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  network_latency_ms?: number;
  active_connections?: number;
  health_details?: Record<string, any>;
  checks_performed?: Record<string, any>;
}

async function performHealthChecks() {
  const checks = {
    database: await checkDatabase(),
    storage: await checkStorage(),
    functions: await checkFunctions(),
    memory: await checkMemory(),
    network: await checkNetwork()
  };

  const overallStatus = Object.values(checks).every(check => check.status === 'healthy') 
    ? 'healthy' 
    : Object.values(checks).some(check => check.status === 'unhealthy')
    ? 'unhealthy'
    : 'degraded';

  return {
    overall_status: overallStatus,
    checks,
    timestamp: new Date().toISOString()
  };
}

async function checkDatabase() {
  const start = Date.now();
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('system_health_status').select('id').limit(1);
    const responseTime = Date.now() - start;
    
    return {
      status: responseTime < 1000 ? 'healthy' : responseTime < 5000 ? 'degraded' : 'unhealthy',
      response_time_ms: responseTime,
      details: { connection: 'successful' }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      response_time_ms: Date.now() - start,
      error: error.message
    };
  }
}

async function checkStorage() {
  try {
    // Basic storage check - this would need to be expanded based on actual storage usage
    return {
      status: 'healthy',
      details: { available: true }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

async function checkFunctions() {
  try {
    // Check if we can execute basic operations
    const test = new Date().toISOString();
    return {
      status: 'healthy',
      details: { execution: 'successful', test_time: test }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

async function checkMemory() {
  try {
    const memoryUsage = (Deno as any).memoryUsage?.() || {};
    const usedMB = Math.round((memoryUsage.heapUsed || 0) / 1024 / 1024);
    const totalMB = Math.round((memoryUsage.heapTotal || 0) / 1024 / 1024);
    const percentage = totalMB > 0 ? (usedMB / totalMB) * 100 : 0;
    
    return {
      status: percentage < 80 ? 'healthy' : percentage < 95 ? 'degraded' : 'unhealthy',
      usage_percentage: percentage,
      details: { used_mb: usedMB, total_mb: totalMB }
    };
  } catch (error) {
    return {
      status: 'unknown',
      error: error.message
    };
  }
}

async function checkNetwork() {
  const start = Date.now();
  try {
    const response = await fetch('https://httpbin.org/get', { 
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    const latency = Date.now() - start;
    
    return {
      status: response.ok && latency < 2000 ? 'healthy' : 'degraded',
      latency_ms: latency,
      details: { external_connectivity: response.ok }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency_ms: Date.now() - start,
      error: error.message
    };
  }
}

async function handleHealthMonitor(req: Request, logger: SecurityLogger): Promise<Response> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const checkType = url.searchParams.get('check');
      
      if (checkType === 'quick') {
        // Quick health check without database storage
        const healthData = await performHealthChecks();
        
        return new Response(JSON.stringify({
          success: true,
          ...healthData
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: healthData.overall_status === 'healthy' ? 200 : 503
        });
      }
      
      // Full health check with database storage
      const healthData = await performHealthChecks();
      
      // Store health status in database
      const { data, error } = await supabase
        .from('system_health_status')
        .upsert({
          service_name: 'production-monitoring-system',
          service_version: '1.0.0',
          status: healthData.overall_status,
          last_check_at: new Date().toISOString(),
          response_time_ms: Object.values(healthData.checks).reduce((sum: number, check: any) => 
            sum + (check.response_time_ms || check.latency_ms || 0), 0) / Object.keys(healthData.checks).length,
          health_details: healthData.checks,
          checks_performed: healthData.checks,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'service_name'
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to store health status:', error);
      }

      return new Response(JSON.stringify({
        success: true,
        ...healthData,
        stored: !error
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: healthData.overall_status === 'healthy' ? 200 : 503
      });
    }

    if (req.method === 'POST') {
      const healthStatus: HealthStatus = await req.json();
      
      const { data, error } = await supabase
        .from('system_health_status')
        .upsert({
          ...healthStatus,
          last_check_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'service_name'
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data: data,
        message: 'Health status updated successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    return new Response(JSON.stringify({
      success: false,
      message: 'Method not allowed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    });

  } catch (error) {
    logger.error('Error in system-health-monitor function', error as Error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error',
      error: error.message,
      overall_status: 'unhealthy'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

export default withSecurity(handleHealthMonitor, {
  requireAuth: false, // System monitoring
  rateLimitRequests: 1000,
  rateLimitWindow: 60000,
  adminOnly: true
});