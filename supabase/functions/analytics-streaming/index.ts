import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { streamName, action = 'get', aggregationRules = {} } = await req.json();

    console.log(`Analytics streaming request: stream=${streamName}, action=${action}`);

    if (!streamName) {
      throw new Error('Stream name is required');
    }

    // Get current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    switch (action) {
      case 'create':
        return await createAnalyticsStream(supabaseClient, streamName, aggregationRules);
      
      case 'get':
        return await getStreamData(supabaseClient, streamName);
      
      case 'update':
        return await updateStreamData(supabaseClient, streamName);
      
      case 'process':
        return await processStreamData(supabaseClient, streamName);
      
      default:
        throw new Error(`Unsupported action: ${action}`);
    }

  } catch (error) {
    console.error('Analytics streaming error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function createAnalyticsStream(supabaseClient: any, streamName: string, aggregationRules: any) {
  console.log(`Creating analytics stream: ${streamName}`);

  // Define data sources based on stream name
  const dataSources = {
    'user-engagement': ['user_analytics', 'custom_events'],
    'content-performance': ['content_analytics', 'content_items'],
    'collaboration-activity': ['collaborative_sessions', 'collaboration_operations'],
    'team-metrics': ['team_members', 'activity_logs', 'business_metrics'],
    'real-time-dashboard': ['user_analytics', 'business_metrics', 'content_analytics']
  };

  const dataSource = dataSources[streamName as keyof typeof dataSources]?.join(',') || 'custom';

  // Create or update stream
  const { data: stream, error } = await supabaseClient
    .from('analytics_streams')
    .upsert({
      stream_name: streamName,
      data_source: dataSource,
      aggregation_rules: aggregationRules,
      processing_status: 'active',
      real_time_data: {},
      last_processed_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create stream: ${error.message}`);
  }

  // Initialize stream with current data
  await processStreamData(supabaseClient, streamName);

  return new Response(
    JSON.stringify({
      success: true,
      stream,
      message: `Stream '${streamName}' created successfully`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getStreamData(supabaseClient: any, streamName: string) {
  console.log(`Getting stream data: ${streamName}`);

  const { data: stream, error } = await supabaseClient
    .from('analytics_streams')
    .select('*')
    .eq('stream_name', streamName)
    .single();

  if (error || !stream) {
    throw new Error(`Stream '${streamName}' not found`);
  }

  // If data is stale, refresh it
  const lastProcessed = new Date(stream.last_processed_at);
  const now = new Date();
  const staleThreshold = 5 * 60 * 1000; // 5 minutes

  if (now.getTime() - lastProcessed.getTime() > staleThreshold) {
    console.log('Stream data is stale, refreshing...');
    await processStreamData(supabaseClient, streamName);
    
    // Get updated stream data
    const { data: updatedStream } = await supabaseClient
      .from('analytics_streams')
      .select('*')
      .eq('stream_name', streamName)
      .single();
    
    return new Response(
      JSON.stringify({
        success: true,
        stream: updatedStream,
        realTimeData: updatedStream.real_time_data,
        lastUpdated: updatedStream.last_processed_at,
        isRealTime: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      stream,
      realTimeData: stream.real_time_data,
      lastUpdated: stream.last_processed_at,
      isRealTime: false
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateStreamData(supabaseClient: any, streamName: string) {
  console.log(`Updating stream data: ${streamName}`);
  return await processStreamData(supabaseClient, streamName);
}

async function processStreamData(supabaseClient: any, streamName: string) {
  console.log(`Processing stream data: ${streamName}`);

  try {
    let realTimeData = {};

    switch (streamName) {
      case 'user-engagement':
        realTimeData = await processUserEngagementStream(supabaseClient);
        break;
      
      case 'content-performance':
        realTimeData = await processContentPerformanceStream(supabaseClient);
        break;
      
      case 'collaboration-activity':
        realTimeData = await processCollaborationStream(supabaseClient);
        break;
      
      case 'team-metrics':
        realTimeData = await processTeamMetricsStream(supabaseClient);
        break;
      
      case 'real-time-dashboard':
        realTimeData = await processRealTimeDashboardStream(supabaseClient);
        break;
      
      default:
        realTimeData = await processGenericStream(supabaseClient, streamName);
    }

    // Update stream with new data
    const { error: updateError } = await supabaseClient
      .from('analytics_streams')
      .update({
        real_time_data: realTimeData,
        last_processed_at: new Date().toISOString(),
        processing_status: 'active'
      })
      .eq('stream_name', streamName);

    if (updateError) {
      throw new Error(`Failed to update stream: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        streamName,
        realTimeData,
        processedAt: new Date().toISOString(),
        dataPoints: Object.keys(realTimeData).length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Update stream with error status
    await supabaseClient
      .from('analytics_streams')
      .update({
        processing_status: 'error',
        error_log: [{ 
          timestamp: new Date().toISOString(), 
          error: error.message 
        }]
      })
      .eq('stream_name', streamName);

    throw error;
  }
}

// Stream processing functions
async function processUserEngagementStream(supabaseClient: any) {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const { data: recentEvents } = await supabaseClient
    .from('user_analytics')
    .select('*')
    .gte('created_at', hourAgo.toISOString());

  const { data: customEvents } = await supabaseClient
    .from('custom_events')
    .select('*')
    .gte('timestamp', hourAgo.toISOString());

  return {
    activeUsers: new Set(recentEvents?.map(e => e.user_id) || []).size,
    totalEvents: (recentEvents?.length || 0) + (customEvents?.length || 0),
    uniqueSessions: new Set(recentEvents?.map(e => e.session_id) || []).size,
    averageSessionDuration: calculateAverageSessionDuration(recentEvents || []),
    topPages: calculateTopPages(recentEvents || []),
    hourlyBreakdown: calculateHourlyBreakdown(recentEvents || [], customEvents || [])
  };
}

async function processContentPerformanceStream(supabaseClient: any) {
  const today = new Date().toISOString().split('T')[0];

  const { data: contentAnalytics } = await supabaseClient
    .from('content_analytics')
    .select('*')
    .eq('analytics_date', today);

  const { data: contentItems } = await supabaseClient
    .from('content_items')
    .select('id, title, status, created_at')
    .eq('status', 'published')
    .gte('created_at', today);

  return {
    totalViews: contentAnalytics?.reduce((sum, item) => sum + (item.views || 0), 0) || 0,
    totalEngagement: contentAnalytics?.reduce((sum, item) => sum + (item.likes || 0) + (item.shares || 0), 0) || 0,
    averagePerformanceScore: calculateAveragePerformanceScore(contentAnalytics || []),
    publishedToday: contentItems?.length || 0,
    topPerformingContent: getTopPerformingContent(contentAnalytics || []),
    engagementTrends: calculateEngagementTrends(contentAnalytics || [])
  };
}

async function processCollaborationStream(supabaseClient: any) {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const { data: activeSessions } = await supabaseClient
    .from('collaborative_sessions')
    .select('*')
    .eq('is_active', true);

  const { data: recentOperations } = await supabaseClient
    .from('collaboration_operations')
    .select('*')
    .gte('applied_at', hourAgo.toISOString());

  return {
    activeSessions: activeSessions?.length || 0,
    activeCollaborators: calculateActiveCollaborators(activeSessions || []),
    operationsPerHour: recentOperations?.length || 0,
    averageParticipants: calculateAverageParticipants(activeSessions || []),
    sessionsByType: groupSessionsByType(activeSessions || []),
    collaborationHealth: calculateCollaborationHealth(activeSessions || [], recentOperations || [])
  };
}

async function processTeamMetricsStream(supabaseClient: any) {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const { data: teamMembers } = await supabaseClient
    .from('team_members')
    .select('*')
    .eq('is_active', true);

  const { data: recentActivity } = await supabaseClient
    .from('activity_logs')
    .select('*')
    .gte('created_at', dayAgo.toISOString());

  const { data: businessMetrics } = await supabaseClient
    .from('business_metrics')
    .select('*')
    .gte('metric_date', dayAgo.toISOString().split('T')[0]);

  return {
    totalActiveMembers: teamMembers?.length || 0,
    dailyActivity: recentActivity?.length || 0,
    teamsBySize: groupTeamsBySize(teamMembers || []),
    activityByType: groupActivityByType(recentActivity || []),
    performanceMetrics: calculateTeamPerformanceMetrics(businessMetrics || []),
    healthScore: calculateTeamHealthScore(teamMembers || [], recentActivity || [])
  };
}

async function processRealTimeDashboardStream(supabaseClient: any) {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Aggregate data from multiple streams
  const [userEngagement, contentPerformance, collaboration] = await Promise.all([
    processUserEngagementStream(supabaseClient),
    processContentPerformanceStream(supabaseClient),
    processCollaborationStream(supabaseClient)
  ]);

  return {
    overview: {
      activeUsers: userEngagement.activeUsers,
      totalViews: contentPerformance.totalViews,
      activeSessions: collaboration.activeSessions,
      lastUpdated: now.toISOString()
    },
    engagement: userEngagement,
    content: contentPerformance,
    collaboration,
    systemHealth: {
      status: 'healthy',
      uptime: '99.9%',
      responseTime: 'Fast'
    }
  };
}

async function processGenericStream(supabaseClient: any, streamName: string) {
  // Generic processing for custom streams
  return {
    streamName,
    processedAt: new Date().toISOString(),
    status: 'processed',
    message: `Generic processing completed for ${streamName}`
  };
}

// Helper calculation functions
function calculateAverageSessionDuration(events: any[]): number {
  if (events.length === 0) return 0;
  
  const sessionDurations = new Map();
  events.forEach(event => {
    if (event.session_id) {
      if (!sessionDurations.has(event.session_id)) {
        sessionDurations.set(event.session_id, {
          start: new Date(event.created_at),
          end: new Date(event.created_at)
        });
      } else {
        const session = sessionDurations.get(event.session_id);
        const eventTime = new Date(event.created_at);
        if (eventTime > session.end) session.end = eventTime;
        if (eventTime < session.start) session.start = eventTime;
      }
    }
  });

  const durations = Array.from(sessionDurations.values())
    .map(session => session.end.getTime() - session.start.getTime());
  
  return durations.length > 0 ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length / 1000 : 0;
}

function calculateTopPages(events: any[]): any[] {
  const pageMap = new Map();
  events.forEach(event => {
    if (event.page_path) {
      pageMap.set(event.page_path, (pageMap.get(event.page_path) || 0) + 1);
    }
  });

  return Array.from(pageMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, count]) => ({ path, views: count }));
}

function calculateHourlyBreakdown(userEvents: any[], customEvents: any[]): any[] {
  const hourlyMap = new Map();
  
  [...userEvents, ...customEvents].forEach(event => {
    const hour = new Date(event.created_at || event.timestamp).getHours();
    hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
  });

  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    events: hourlyMap.get(hour) || 0
  }));
}

function calculateAveragePerformanceScore(analytics: any[]): number {
  if (analytics.length === 0) return 0;
  return analytics.reduce((sum, item) => sum + (item.performance_score || 0), 0) / analytics.length;
}

function getTopPerformingContent(analytics: any[]): any[] {
  return analytics
    .sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0))
    .slice(0, 5)
    .map(item => ({
      contentId: item.content_id,
      score: item.performance_score,
      views: item.views,
      engagement: (item.likes || 0) + (item.shares || 0)
    }));
}

function calculateEngagementTrends(analytics: any[]): any {
  const totalViews = analytics.reduce((sum, item) => sum + (item.views || 0), 0);
  const totalLikes = analytics.reduce((sum, item) => sum + (item.likes || 0), 0);
  const totalShares = analytics.reduce((sum, item) => sum + (item.shares || 0), 0);

  return {
    engagementRate: totalViews > 0 ? ((totalLikes + totalShares) / totalViews * 100).toFixed(2) : 0,
    totalViews,
    totalLikes,
    totalShares
  };
}

function calculateActiveCollaborators(sessions: any[]): number {
  const collaborators = new Set();
  sessions.forEach(session => {
    if (Array.isArray(session.participants)) {
      session.participants.forEach((p: any) => collaborators.add(p));
    }
  });
  return collaborators.size;
}

function calculateAverageParticipants(sessions: any[]): number {
  if (sessions.length === 0) return 0;
  const totalParticipants = sessions.reduce((sum, session) => {
    return sum + (Array.isArray(session.participants) ? session.participants.length : 0);
  }, 0);
  return totalParticipants / sessions.length;
}

function groupSessionsByType(sessions: any[]): any {
  const typeMap = new Map();
  sessions.forEach(session => {
    const type = session.resource_type || 'unknown';
    typeMap.set(type, (typeMap.get(type) || 0) + 1);
  });
  return Object.fromEntries(typeMap);
}

function calculateCollaborationHealth(sessions: any[], operations: any[]): string {
  const activeSessionsCount = sessions.length;
  const operationsCount = operations.length;
  
  if (activeSessionsCount > 10 && operationsCount > 50) return 'excellent';
  if (activeSessionsCount > 5 && operationsCount > 20) return 'good';
  if (activeSessionsCount > 2 && operationsCount > 10) return 'fair';
  return 'low';
}

function groupTeamsBySize(members: any[]): any {
  const teamSizes = new Map();
  members.forEach(member => {
    const teamId = member.team_id;
    teamSizes.set(teamId, (teamSizes.get(teamId) || 0) + 1);
  });

  const sizeGroups = { small: 0, medium: 0, large: 0 };
  Array.from(teamSizes.values()).forEach(size => {
    if (size <= 5) sizeGroups.small++;
    else if (size <= 15) sizeGroups.medium++;
    else sizeGroups.large++;
  });

  return sizeGroups;
}

function groupActivityByType(activities: any[]): any {
  const typeMap = new Map();
  activities.forEach(activity => {
    const type = activity.activity_type || 'unknown';
    typeMap.set(type, (typeMap.get(type) || 0) + 1);
  });
  return Object.fromEntries(typeMap);
}

function calculateTeamPerformanceMetrics(metrics: any[]): any {
  if (metrics.length === 0) return { averageScore: 0, totalMetrics: 0 };
  
  const averageValue = metrics.reduce((sum, metric) => sum + (metric.metric_value || 0), 0) / metrics.length;
  
  return {
    averageScore: Math.round(averageValue),
    totalMetrics: metrics.length,
    categories: groupMetricsByCategory(metrics)
  };
}

function groupMetricsByCategory(metrics: any[]): any {
  const categoryMap = new Map();
  metrics.forEach(metric => {
    const category = metric.metric_category || 'general';
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { count: 0, total: 0 });
    }
    const cat = categoryMap.get(category);
    cat.count++;
    cat.total += metric.metric_value || 0;
  });

  return Object.fromEntries(
    Array.from(categoryMap.entries()).map(([category, data]) => [
      category,
      { count: data.count, average: data.total / data.count }
    ])
  );
}

function calculateTeamHealthScore(members: any[], activities: any[]): number {
  const activeMembers = members.length;
  const dailyActivity = activities.length;
  
  // Simple health score calculation
  const memberScore = Math.min(activeMembers * 10, 50);
  const activityScore = Math.min(dailyActivity * 2, 50);
  
  return Math.round(memberScore + activityScore);
}