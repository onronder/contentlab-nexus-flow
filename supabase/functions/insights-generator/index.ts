import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withSecurity, SecurityLogger } from '../_shared/security.ts'

async function handleInsightsGenerator(req: Request, logger: SecurityLogger): Promise<Response> {
  try {
    logger.info('Insights generator started');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { teamId, projectId, insightTypes } = await req.json();
    console.log('Generating insights for:', { teamId, projectId, insightTypes });

    const insights = [];

    // Generate different types of insights
    if (!insightTypes || insightTypes.includes('performance')) {
      const performanceInsights = await generatePerformanceInsights(supabase, teamId, projectId);
      insights.push(...performanceInsights);
    }

    if (!insightTypes || insightTypes.includes('user_behavior')) {
      const behaviorInsights = await generateUserBehaviorInsights(supabase, teamId, projectId);
      insights.push(...behaviorInsights);
    }

    if (!insightTypes || insightTypes.includes('business')) {
      const businessInsights = await generateBusinessInsights(supabase, teamId, projectId);
      insights.push(...businessInsights);
    }

    if (!insightTypes || insightTypes.includes('anomaly')) {
      const anomalyInsights = await generateAnomalyInsights(supabase, teamId, projectId);
      insights.push(...anomalyInsights);
    }

    // Store insights in database
    for (const insight of insights) {
      await storeInsight(supabase, insight);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        insights,
        totalInsights: insights.length,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    logger.error('Error generating insights', error as Error);
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

export default withSecurity(handleInsightsGenerator, {
  requireAuth: true,
  rateLimitRequests: 50,
  rateLimitWindow: 300000, // 5 minutes
  enableCORS: true
});

async function generatePerformanceInsights(supabase: any, teamId?: string, projectId?: string) {
  console.log('Generating performance insights');
  
  const insights = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get business metrics for trend analysis
  let query = supabase
    .from('business_metrics')
    .select('*')
    .gte('created_at', thirtyDaysAgo.toISOString());

  if (teamId) query = query.eq('team_id', teamId);
  if (projectId) query = query.eq('project_id', projectId);

  const { data: metrics, error } = await query;
  if (error) {
    console.error('Error fetching metrics for performance insights:', error);
    return insights;
  }

  // Analyze conversion trends
  const conversionMetrics = metrics.filter(m => m.metric_category === 'conversion');
  if (conversionMetrics.length > 0) {
    const avgChange = conversionMetrics.reduce((sum, m) => sum + (m.change_percentage || 0), 0) / conversionMetrics.length;
    
    if (avgChange > 10) {
      insights.push({
        team_id: teamId,
        project_id: projectId,
        insight_type: 'trend',
        insight_category: 'performance',
        title: 'Strong Conversion Growth Detected',
        description: `Your conversion metrics have increased by an average of ${avgChange.toFixed(1)}% over the past 30 days. This positive trend indicates effective optimization efforts.`,
        confidence_score: 85,
        impact_level: 'high',
        data_sources: ['business_metrics'],
        metrics_involved: { 
          category: 'conversion', 
          avg_change: avgChange,
          metrics_count: conversionMetrics.length 
        },
        recommended_actions: [
          'Continue current optimization strategies',
          'Document successful practices for replication',
          'Consider scaling successful campaigns'
        ],
        insight_data: { conversionMetrics: conversionMetrics.slice(0, 5) },
        time_period_start: thirtyDaysAgo.toISOString().split('T')[0],
        time_period_end: now.toISOString().split('T')[0],
        is_actionable: true
      });
    }
  }

  // Analyze engagement metrics
  const engagementMetrics = metrics.filter(m => m.metric_category === 'engagement');
  if (engagementMetrics.length > 0) {
    const lowPerformers = engagementMetrics.filter(m => m.metric_value < (m.target_value || 0) * 0.8);
    
    if (lowPerformers.length > 0) {
      insights.push({
        team_id: teamId,
        project_id: projectId,
        insight_type: 'opportunity',
        insight_category: 'performance',
        title: 'Engagement Optimization Opportunity',
        description: `${lowPerformers.length} engagement metrics are performing below 80% of their targets. Focus on these areas could yield significant improvements.`,
        confidence_score: 75,
        impact_level: 'medium',
        data_sources: ['business_metrics'],
        metrics_involved: { 
          category: 'engagement', 
          underperforming_count: lowPerformers.length,
          total_count: engagementMetrics.length 
        },
        recommended_actions: [
          'Review underperforming engagement metrics',
          'Analyze user behavior patterns',
          'A/B test engagement improvements'
        ],
        insight_data: { lowPerformers: lowPerformers.slice(0, 3) },
        time_period_start: thirtyDaysAgo.toISOString().split('T')[0],
        time_period_end: now.toISOString().split('T')[0],
        is_actionable: true
      });
    }
  }

  console.log(`Generated ${insights.length} performance insights`);
  return insights;
}

async function generateUserBehaviorInsights(supabase: any, teamId?: string, projectId?: string) {
  console.log('Generating user behavior insights');
  
  const insights = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get user analytics data
  const { data: userAnalytics, error } = await supabase
    .from('user_analytics')
    .select('*')
    .gte('created_at', sevenDaysAgo.toISOString());

  if (error) {
    console.error('Error fetching user analytics for behavior insights:', error);
    return insights;
  }

  // Analyze user engagement patterns
  if (userAnalytics.length > 0) {
    const sessionData = userAnalytics.reduce((acc, event) => {
      if (!acc[event.session_id]) {
        acc[event.session_id] = {
          events: [],
          user_id: event.user_id,
          start_time: event.created_at,
          end_time: event.created_at
        };
      }
      acc[event.session_id].events.push(event);
      if (event.created_at > acc[event.session_id].end_time) {
        acc[event.session_id].end_time = event.created_at;
      }
      return acc;
    }, {});

    const sessions = Object.values(sessionData);
    const avgSessionLength = sessions.reduce((sum, session: any) => {
      const start = new Date(session.start_time);
      const end = new Date(session.end_time);
      return sum + (end.getTime() - start.getTime());
    }, 0) / sessions.length / 1000 / 60; // Convert to minutes

    if (avgSessionLength > 10) {
      insights.push({
        team_id: teamId,
        project_id: projectId,
        insight_type: 'trend',
        insight_category: 'user_behavior',
        title: 'High User Engagement Detected',
        description: `Users are spending an average of ${avgSessionLength.toFixed(1)} minutes per session, indicating strong engagement with your platform.`,
        confidence_score: 80,
        impact_level: 'medium',
        data_sources: ['user_analytics'],
        metrics_involved: { 
          avg_session_length: avgSessionLength,
          total_sessions: sessions.length,
          total_events: userAnalytics.length
        },
        recommended_actions: [
          'Identify features driving high engagement',
          'Replicate engagement patterns in other areas',
          'Create content to maintain user interest'
        ],
        insight_data: { sessionStats: { avgLength: avgSessionLength, sessionCount: sessions.length } },
        time_period_start: sevenDaysAgo.toISOString().split('T')[0],
        time_period_end: now.toISOString().split('T')[0],
        is_actionable: true
      });
    }

    // Analyze popular pages
    const pageViews = userAnalytics.reduce((acc, event) => {
      if (event.page_path) {
        acc[event.page_path] = (acc[event.page_path] || 0) + 1;
      }
      return acc;
    }, {});

    const topPages = Object.entries(pageViews)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5);

    if (topPages.length > 0) {
      insights.push({
        team_id: teamId,
        project_id: projectId,
        insight_type: 'trend',
        insight_category: 'user_behavior',
        title: 'Popular Content Identified',
        description: `The top ${topPages.length} pages account for significant user traffic. Consider optimizing these high-traffic areas for better conversion.`,
        confidence_score: 90,
        impact_level: 'medium',
        data_sources: ['user_analytics'],
        metrics_involved: { 
          top_pages: topPages.length,
          total_page_types: Object.keys(pageViews).length
        },
        recommended_actions: [
          'Optimize top-performing pages for conversion',
          'Add related content recommendations',
          'Improve call-to-action placement'
        ],
        insight_data: { topPages },
        time_period_start: sevenDaysAgo.toISOString().split('T')[0],
        time_period_end: now.toISOString().split('T')[0],
        is_actionable: true
      });
    }
  }

  console.log(`Generated ${insights.length} user behavior insights`);
  return insights;
}

async function generateBusinessInsights(supabase: any, teamId?: string, projectId?: string) {
  console.log('Generating business insights');
  
  const insights = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get revenue metrics
  let query = supabase
    .from('business_metrics')
    .select('*')
    .eq('metric_category', 'revenue')
    .gte('created_at', thirtyDaysAgo.toISOString());

  if (teamId) query = query.eq('team_id', teamId);
  if (projectId) query = query.eq('project_id', projectId);

  const { data: revenueMetrics, error } = await query;
  if (error) {
    console.error('Error fetching revenue metrics for business insights:', error);
    return insights;
  }

  if (revenueMetrics.length > 0) {
    const totalRevenue = revenueMetrics.reduce((sum, m) => sum + m.metric_value, 0);
    const avgGrowth = revenueMetrics.reduce((sum, m) => sum + (m.change_percentage || 0), 0) / revenueMetrics.length;

    if (avgGrowth > 20) {
      insights.push({
        team_id: teamId,
        project_id: projectId,
        insight_type: 'opportunity',
        insight_category: 'business',
        title: 'Strong Revenue Growth Momentum',
        description: `Revenue metrics show an average growth of ${avgGrowth.toFixed(1)}%. This strong momentum presents opportunities for strategic expansion.`,
        confidence_score: 90,
        impact_level: 'high',
        data_sources: ['business_metrics'],
        metrics_involved: { 
          total_revenue: totalRevenue,
          avg_growth: avgGrowth,
          metrics_count: revenueMetrics.length
        },
        recommended_actions: [
          'Consider expanding successful revenue streams',
          'Increase marketing investment during growth phase',
          'Explore new market opportunities'
        ],
        insight_data: { revenueGrowth: avgGrowth, totalRevenue },
        time_period_start: thirtyDaysAgo.toISOString().split('T')[0],
        time_period_end: now.toISOString().split('T')[0],
        is_actionable: true
      });
    }
  }

  console.log(`Generated ${insights.length} business insights`);
  return insights;
}

async function generateAnomalyInsights(supabase: any, teamId?: string, projectId?: string) {
  console.log('Generating anomaly insights');
  
  const insights = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Check for unusual patterns in custom events
  let query = supabase
    .from('custom_events')
    .select('*')
    .gte('timestamp', sevenDaysAgo.toISOString());

  if (teamId) query = query.eq('team_id', teamId);
  if (projectId) query = query.eq('project_id', projectId);

  const { data: customEvents, error } = await query;
  if (error) {
    console.error('Error fetching custom events for anomaly insights:', error);
    return insights;
  }

  if (customEvents.length > 0) {
    // Group events by day
    const eventsByDay = customEvents.reduce((acc, event) => {
      const day = event.timestamp.split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    const dailyCounts = Object.values(eventsByDay) as number[];
    const avgDaily = dailyCounts.reduce((sum, count) => sum + count, 0) / dailyCounts.length;
    const maxDaily = Math.max(...dailyCounts);

    // Check for unusual spikes
    if (maxDaily > avgDaily * 2 && avgDaily > 10) {
      insights.push({
        team_id: teamId,
        project_id: projectId,
        insight_type: 'anomaly',
        insight_category: 'user_behavior',
        title: 'Unusual Activity Spike Detected',
        description: `A significant spike in user activity was detected, with ${maxDaily} events on the peak day compared to an average of ${avgDaily.toFixed(0)} events per day.`,
        confidence_score: 75,
        impact_level: 'medium',
        data_sources: ['custom_events'],
        metrics_involved: { 
          max_daily: maxDaily,
          avg_daily: avgDaily,
          spike_ratio: maxDaily / avgDaily
        },
        recommended_actions: [
          'Investigate the cause of the activity spike',
          'Check for potential system issues',
          'Analyze if spike correlates with marketing campaigns'
        ],
        insight_data: { eventsByDay, avgDaily, maxDaily },
        time_period_start: sevenDaysAgo.toISOString().split('T')[0],
        time_period_end: now.toISOString().split('T')[0],
        is_actionable: true
      });
    }
  }

  console.log(`Generated ${insights.length} anomaly insights`);
  return insights;
}

async function storeInsight(supabase: any, insight: any) {
  const { error } = await supabase
    .from('analytics_insights')
    .insert(insight);

  if (error) {
    console.error('Error storing insight:', error);
    throw error;
  }

  console.log('Insight stored successfully:', insight.title);
}