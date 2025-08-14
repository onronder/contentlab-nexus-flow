import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Analytics processor started');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { event, data } = await req.json();
    console.log('Processing analytics event:', event, data);

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
      default:
        console.log('Unknown event type:', event);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Analytics event processed successfully',
        event,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing analytics:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processUserAction(supabase: any, data: any) {
  const {
    userId,
    sessionId,
    eventType,
    eventName,
    eventProperties,
    pagePath,
    userAgent,
    ipAddress,
    country,
    city,
    deviceType,
    browser,
    referrer,
    utmSource,
    utmMedium,
    utmCampaign
  } = data;

  const { error } = await supabase
    .from('user_analytics')
    .insert({
      user_id: userId,
      session_id: sessionId,
      event_type: eventType,
      event_name: eventName,
      event_properties: eventProperties || {},
      page_path: pagePath,
      user_agent: userAgent,
      ip_address: ipAddress,
      country,
      city,
      device_type: deviceType,
      browser,
      referrer,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error inserting user analytics:', error);
    throw error;
  }

  console.log('User action processed successfully');
}

async function processSystemMetric(supabase: any, data: any) {
  const {
    metricName,
    metricValue,
    metricUnit,
    dimensions,
    aggregationPeriod,
    periodStart,
    periodEnd,
    metadata
  } = data;

  const { error } = await supabase
    .from('system_analytics')
    .insert({
      metric_name: metricName,
      metric_value: metricValue,
      metric_unit: metricUnit,
      dimensions: dimensions || {},
      aggregation_period: aggregationPeriod || 'hourly',
      period_start: periodStart,
      period_end: periodEnd,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error inserting system metric:', error);
    throw error;
  }

  console.log('System metric processed successfully');
}

async function processBusinessEvent(supabase: any, data: any) {
  const {
    teamId,
    projectId,
    metricCategory,
    metricName,
    metricValue,
    targetValue,
    previousPeriodValue,
    changePercentage,
    currency,
    timePeriod,
    metricDate,
    segmentFilters,
    calculatedFields,
    dataQualityScore,
    isForecast,
    confidenceInterval
  } = data;

  const { error } = await supabase
    .from('business_metrics')
    .insert({
      team_id: teamId,
      project_id: projectId,
      metric_category: metricCategory,
      metric_name: metricName,
      metric_value: metricValue,
      target_value: targetValue,
      previous_period_value: previousPeriodValue,
      change_percentage: changePercentage,
      currency: currency || 'USD',
      time_period: timePeriod,
      metric_date: metricDate,
      segment_filters: segmentFilters || {},
      calculated_fields: calculatedFields || {},
      data_quality_score: dataQualityScore || 100,
      is_forecast: isForecast || false,
      confidence_interval: confidenceInterval,
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error inserting business metric:', error);
    throw error;
  }

  console.log('Business event processed successfully');
}

async function processCustomEvent(supabase: any, data: any) {
  const {
    teamId,
    projectId,
    userId,
    eventName,
    eventCategory,
    eventValue,
    eventProperties,
    entityType,
    entityId,
    sourceComponent,
    sessionId,
    correlationId,
    metadata
  } = data;

  const { error } = await supabase
    .from('custom_events')
    .insert({
      team_id: teamId,
      project_id: projectId,
      user_id: userId,
      event_name: eventName,
      event_category: eventCategory,
      event_value: eventValue,
      event_properties: eventProperties || {},
      entity_type: entityType,
      entity_id: entityId,
      source_component: sourceComponent,
      session_id: sessionId,
      correlation_id: correlationId,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
      processed: true
    });

  if (error) {
    console.error('Error inserting custom event:', error);
    throw error;
  }

  console.log('Custom event processed successfully');
}