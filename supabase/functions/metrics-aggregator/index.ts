import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withSecurity, SecurityLogger } from '../_shared/security.ts'

async function handleMetricsAggregator(req: Request, logger: SecurityLogger): Promise<Response> {
  try {
    logger.info('Metrics aggregator started');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { operation, filters } = await req.json();
    console.log('Aggregating metrics:', operation, filters);

    let result;
    switch (operation) {
      case 'business_metrics':
        result = await aggregateBusinessMetrics(supabase, filters);
        break;
      case 'user_engagement':
        result = await aggregateUserEngagement(supabase, filters);
        break;
      case 'system_performance':
        result = await aggregateSystemPerformance(supabase, filters);
        break;
      case 'custom_events':
        result = await aggregateCustomEvents(supabase, filters);
        break;
      default:
        throw new Error(`Unknown aggregation operation: ${operation}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        operation,
        data: result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    logger.error('Error aggregating metrics', error as Error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export default withSecurity(handleMetricsAggregator, {
  requireAuth: true,
  rateLimitRequests: 200,
  rateLimitWindow: 60000,
  enableCORS: true
});

async function aggregateBusinessMetrics(supabase: any, filters: any) {
  const { teamId, projectId, startDate, endDate } = filters;
  
  console.log('Aggregating business metrics with filters:', filters);

  // Use the database function for aggregation
  const { data, error } = await supabase
    .rpc('aggregate_business_metrics', {
      p_team_id: teamId || null,
      p_project_id: projectId || null,
      p_start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      p_end_date: endDate || new Date().toISOString().split('T')[0]
    });

  if (error) {
    console.error('Error aggregating business metrics:', error);
    throw error;
  }

  return data;
}

async function aggregateUserEngagement(supabase: any, filters: any) {
  const { teamId, startDate, endDate, userId } = filters;
  
  console.log('Aggregating user engagement with filters:', filters);

  // Get user engagement metrics
  let query = supabase
    .from('user_analytics')
    .select('*')
    .gte('created_at', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .lte('created_at', endDate || new Date().toISOString());

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: analytics, error } = await query;

  if (error) {
    console.error('Error fetching user analytics:', error);
    throw error;
  }

  // Calculate engagement metrics
  const totalEvents = analytics.length;
  const uniqueUsers = new Set(analytics.map(a => a.user_id)).size;
  const uniqueSessions = new Set(analytics.map(a => a.session_id)).size;
  const avgEventsPerSession = uniqueSessions > 0 ? totalEvents / uniqueSessions : 0;
  
  // Group by event type
  const eventsByType = analytics.reduce((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1;
    return acc;
  }, {});

  // Group by page
  const pageViews = analytics.reduce((acc, event) => {
    if (event.page_path) {
      acc[event.page_path] = (acc[event.page_path] || 0) + 1;
    }
    return acc;
  }, {});

  return {
    totalEvents,
    uniqueUsers,
    uniqueSessions,
    avgEventsPerSession: Math.round(avgEventsPerSession * 100) / 100,
    eventsByType,
    pageViews,
    period: {
      start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: endDate || new Date().toISOString()
    }
  };
}

async function aggregateSystemPerformance(supabase: any, filters: any) {
  const { startDate, endDate, metricNames } = filters;
  
  console.log('Aggregating system performance with filters:', filters);

  let query = supabase
    .from('system_analytics')
    .select('*')
    .gte('created_at', startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .lte('created_at', endDate || new Date().toISOString());

  if (metricNames && metricNames.length > 0) {
    query = query.in('metric_name', metricNames);
  }

  const { data: metrics, error } = await query;

  if (error) {
    console.error('Error fetching system metrics:', error);
    throw error;
  }

  // Group metrics by name and calculate statistics
  const aggregatedMetrics = metrics.reduce((acc, metric) => {
    if (!acc[metric.metric_name]) {
      acc[metric.metric_name] = {
        values: [],
        unit: metric.metric_unit,
        count: 0,
        sum: 0,
        min: Number.MAX_VALUE,
        max: Number.MIN_VALUE
      };
    }

    const value = parseFloat(metric.metric_value);
    acc[metric.metric_name].values.push({
      value,
      timestamp: metric.created_at,
      dimensions: metric.dimensions
    });
    acc[metric.metric_name].count++;
    acc[metric.metric_name].sum += value;
    acc[metric.metric_name].min = Math.min(acc[metric.metric_name].min, value);
    acc[metric.metric_name].max = Math.max(acc[metric.metric_name].max, value);

    return acc;
  }, {});

  // Calculate averages and format results
  Object.keys(aggregatedMetrics).forEach(metricName => {
    const metric = aggregatedMetrics[metricName];
    metric.average = metric.count > 0 ? metric.sum / metric.count : 0;
    metric.average = Math.round(metric.average * 100) / 100;
  });

  return {
    metrics: aggregatedMetrics,
    totalDataPoints: metrics.length,
    period: {
      start: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      end: endDate || new Date().toISOString()
    }
  };
}

async function aggregateCustomEvents(supabase: any, filters: any) {
  const { teamId, projectId, eventNames, startDate, endDate } = filters;
  
  console.log('Aggregating custom events with filters:', filters);

  let query = supabase
    .from('custom_events')
    .select('*')
    .gte('timestamp', startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .lte('timestamp', endDate || new Date().toISOString());

  if (teamId) {
    query = query.eq('team_id', teamId);
  }

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  if (eventNames && eventNames.length > 0) {
    query = query.in('event_name', eventNames);
  }

  const { data: events, error } = await query;

  if (error) {
    console.error('Error fetching custom events:', error);
    throw error;
  }

  // Aggregate events by name
  const eventsByName = events.reduce((acc, event) => {
    if (!acc[event.event_name]) {
      acc[event.event_name] = {
        count: 0,
        totalValue: 0,
        avgValue: 0,
        categories: {},
        entityTypes: {},
        sources: {}
      };
    }

    acc[event.event_name].count++;
    
    if (event.event_value) {
      acc[event.event_name].totalValue += parseFloat(event.event_value);
    }

    if (event.event_category) {
      acc[event.event_name].categories[event.event_category] = 
        (acc[event.event_name].categories[event.event_category] || 0) + 1;
    }

    if (event.entity_type) {
      acc[event.event_name].entityTypes[event.entity_type] = 
        (acc[event.event_name].entityTypes[event.entity_type] || 0) + 1;
    }

    if (event.source_component) {
      acc[event.event_name].sources[event.source_component] = 
        (acc[event.event_name].sources[event.source_component] || 0) + 1;
    }

    return acc;
  }, {});

  // Calculate averages
  Object.keys(eventsByName).forEach(eventName => {
    const event = eventsByName[eventName];
    event.avgValue = event.count > 0 ? event.totalValue / event.count : 0;
    event.avgValue = Math.round(event.avgValue * 100) / 100;
  });

  return {
    eventsByName,
    totalEvents: events.length,
    uniqueEventNames: Object.keys(eventsByName).length,
    period: {
      start: startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end: endDate || new Date().toISOString()
    }
  };
}