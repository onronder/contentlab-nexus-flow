import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const FUNCTION_TIMEOUT = 30000; // 30 seconds max
const BATCH_SIZE = 50; // Process events in batches
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

// Simple circuit breaker
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'CLOSED' | 'OPEN' = 'CLOSED';

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > CIRCUIT_BREAKER_TIMEOUT) {
        this.state = 'CLOSED';
        this.failures = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();
      
      if (this.failures >= CIRCUIT_BREAKER_THRESHOLD) {
        this.state = 'OPEN';
      }
      throw error;
    }
  }
}

const circuitBreaker = new CircuitBreaker();

// Timeout wrapper
async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Function timeout')), timeoutMs);
  });

  return Promise.race([operation, timeoutPromise]);
}

// Background task queue
const backgroundQueue: Array<() => Promise<void>> = [];

async function processBackgroundTasks() {
  while (backgroundQueue.length > 0) {
    const task = backgroundQueue.shift();
    if (task) {
      try {
        await task();
      } catch (error) {
        console.error('Background task failed:', error);
      }
    }
  }
}

serve(async (req) => {
  const startTime = Date.now();
  const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID();

  // Handle CORS preflight - IMMEDIATE RETURN
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    return await withTimeout(handleRequest(req, correlationId, startTime), FUNCTION_TIMEOUT);
  } catch (error) {
    console.error('Analytics processor error:', {
      correlationId,
      error: error.message,
      duration: Date.now() - startTime
    });

    return new Response(JSON.stringify({
      success: false,
      error: error.message === 'Function timeout' ? 'Request timeout' : 'Processing failed',
      correlationId,
      timestamp: new Date().toISOString()
    }), {
      status: error.message === 'Function timeout' ? 504 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function handleRequest(req: Request, correlationId: string, startTime: number): Promise<Response> {
  console.log('Analytics processor started', { correlationId });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let requestData;
  try {
    requestData = await req.json();
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid JSON payload',
      correlationId
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { event, data } = requestData;
  
  if (!event || !data) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Missing required fields: event, data',
      correlationId
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Process event with circuit breaker
  try {
    await circuitBreaker.execute(async () => {
      switch (event) {
        case 'user_action':
          await processUserAction(supabase, data);
          break;
        case 'system_metric':
          await processSystemMetric(supabase, data);
          break;
        case 'business_event':
          await processBusinessEvent(supabase, data);
          break;
        case 'custom_event':
          await processCustomEvent(supabase, data);
          break;
        case 'batch_events':
          await processBatchEvents(supabase, data);
          break;
        default:
          console.warn('Unknown event type:', event);
      }
    });

    // Start background tasks without waiting
    EdgeRuntime.waitUntil(processBackgroundTasks());

    const duration = Date.now() - startTime;
    console.log('Analytics event processed', { 
      correlationId, 
      event, 
      duration: `${duration}ms` 
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Analytics event processed successfully',
      event,
      correlationId,
      duration,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Analytics processing failed', {
      correlationId,
      event,
      error: error.message,
      duration: `${duration}ms`
    });

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      correlationId,
      duration,
      timestamp: new Date().toISOString()
    }), {
      status: error.message.includes('Circuit breaker') ? 503 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Optimized batch processing
async function processBatchEvents(supabase: any, events: any[]) {
  if (!Array.isArray(events) || events.length === 0) return;

  const batches = [];
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    batches.push(events.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    const userActions = batch.filter(e => e.event === 'user_action');
    const systemMetrics = batch.filter(e => e.event === 'system_metric');
    const businessEvents = batch.filter(e => e.event === 'business_event');
    const customEvents = batch.filter(e => e.event === 'custom_event');

    // Process each type in parallel
    await Promise.all([
      userActions.length > 0 ? bulkInsertUserActions(supabase, userActions.map(e => e.data)) : Promise.resolve(),
      systemMetrics.length > 0 ? bulkInsertSystemMetrics(supabase, systemMetrics.map(e => e.data)) : Promise.resolve(),
      businessEvents.length > 0 ? bulkInsertBusinessEvents(supabase, businessEvents.map(e => e.data)) : Promise.resolve(),
      customEvents.length > 0 ? bulkInsertCustomEvents(supabase, customEvents.map(e => e.data)) : Promise.resolve()
    ]);
  }
}

// Optimized individual processors with minimal processing
async function processUserAction(supabase: any, data: any) {
  const record = {
    user_id: data.userId,
    session_id: data.sessionId,
    event_type: data.eventType,
    event_name: data.eventName,
    event_properties: data.eventProperties || {},
    page_path: data.pagePath,
    user_agent: data.userAgent,
    ip_address: data.ipAddress,
    country: data.country,
    city: data.city,
    device_type: data.deviceType,
    browser: data.browser,
    referrer: data.referrer,
    utm_source: data.utmSource,
    utm_medium: data.utmMedium,
    utm_campaign: data.utmCampaign,
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from('user_analytics').insert(record);
  if (error) throw error;
}

async function processSystemMetric(supabase: any, data: any) {
  const record = {
    metric_name: data.metricName,
    metric_value: data.metricValue,
    metric_unit: data.metricUnit,
    dimensions: data.dimensions || {},
    aggregation_period: data.aggregationPeriod || 'hourly',
    period_start: data.periodStart,
    period_end: data.periodEnd,
    metadata: data.metadata || {},
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from('system_analytics').insert(record);
  if (error) throw error;
}

async function processBusinessEvent(supabase: any, data: any) {
  const record = {
    team_id: data.teamId,
    project_id: data.projectId,
    metric_category: data.metricCategory,
    metric_name: data.metricName,
    metric_value: data.metricValue,
    target_value: data.targetValue,
    previous_period_value: data.previousPeriodValue,
    change_percentage: data.changePercentage,
    currency: data.currency || 'USD',
    time_period: data.timePeriod,
    metric_date: data.metricDate,
    segment_filters: data.segmentFilters || {},
    calculated_fields: data.calculatedFields || {},
    data_quality_score: data.dataQualityScore || 100,
    is_forecast: data.isForecast || false,
    confidence_interval: data.confidenceInterval,
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from('business_metrics').insert(record);
  if (error) throw error;
}

async function processCustomEvent(supabase: any, data: any) {
  const record = {
    team_id: data.teamId,
    project_id: data.projectId,
    user_id: data.userId,
    event_name: data.eventName,
    event_category: data.eventCategory,
    event_value: data.eventValue,
    event_properties: data.eventProperties || {},
    entity_type: data.entityType,
    entity_id: data.entityId,
    source_component: data.sourceComponent,
    session_id: data.sessionId,
    correlation_id: data.correlationId,
    metadata: data.metadata || {},
    timestamp: new Date().toISOString(),
    processed: true
  };

  const { error } = await supabase.from('custom_events').insert(record);
  if (error) throw error;
}

// Bulk insert functions for better performance
async function bulkInsertUserActions(supabase: any, dataArray: any[]) {
  const records = dataArray.map(data => ({
    user_id: data.userId,
    session_id: data.sessionId,
    event_type: data.eventType,
    event_name: data.eventName,
    event_properties: data.eventProperties || {},
    page_path: data.pagePath,
    user_agent: data.userAgent,
    ip_address: data.ipAddress,
    country: data.country,
    city: data.city,
    device_type: data.deviceType,
    browser: data.browser,
    referrer: data.referrer,
    utm_source: data.utmSource,
    utm_medium: data.utmMedium,
    utm_campaign: data.utmCampaign,
    created_at: new Date().toISOString()
  }));

  const { error } = await supabase.from('user_analytics').insert(records);
  if (error) throw error;
}

async function bulkInsertSystemMetrics(supabase: any, dataArray: any[]) {
  const records = dataArray.map(data => ({
    metric_name: data.metricName,
    metric_value: data.metricValue,
    metric_unit: data.metricUnit,
    dimensions: data.dimensions || {},
    aggregation_period: data.aggregationPeriod || 'hourly',
    period_start: data.periodStart,
    period_end: data.periodEnd,
    metadata: data.metadata || {},
    created_at: new Date().toISOString()
  }));

  const { error } = await supabase.from('system_analytics').insert(records);
  if (error) throw error;
}

async function bulkInsertBusinessEvents(supabase: any, dataArray: any[]) {
  const records = dataArray.map(data => ({
    team_id: data.teamId,
    project_id: data.projectId,
    metric_category: data.metricCategory,
    metric_name: data.metricName,
    metric_value: data.metricValue,
    target_value: data.targetValue,
    previous_period_value: data.previousPeriodValue,
    change_percentage: data.changePercentage,
    currency: data.currency || 'USD',
    time_period: data.timePeriod,
    metric_date: data.metricDate,
    segment_filters: data.segmentFilters || {},
    calculated_fields: data.calculatedFields || {},
    data_quality_score: data.dataQualityScore || 100,
    is_forecast: data.isForecast || false,
    confidence_interval: data.confidenceInterval,
    created_at: new Date().toISOString()
  }));

  const { error } = await supabase.from('business_metrics').insert(records);
  if (error) throw error;
}

async function bulkInsertCustomEvents(supabase: any, dataArray: any[]) {
  const records = dataArray.map(data => ({
    team_id: data.teamId,
    project_id: data.projectId,
    user_id: data.userId,
    event_name: data.eventName,
    event_category: data.eventCategory,
    event_value: data.eventValue,
    event_properties: data.eventProperties || {},
    entity_type: data.entityType,
    entity_id: data.entityId,
    source_component: data.sourceComponent,
    session_id: data.sessionId,
    correlation_id: data.correlationId,
    metadata: data.metadata || {},
    timestamp: new Date().toISOString(),
    processed: true
  }));

  const { error } = await supabase.from('custom_events').insert(records);
  if (error) throw error;
}