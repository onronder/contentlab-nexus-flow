import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Scheduled analytics aggregator started')

    // Run daily aggregations
    await aggregateDailyAnalytics(supabaseClient)
    await generateContentPerformanceScores(supabaseClient)
    await aggregateTeamPerformanceMetrics(supabaseClient)
    await generatePredictiveInsights(supabaseClient)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Scheduled analytics aggregation completed',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in scheduled analytics aggregation:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function aggregateDailyAnalytics(supabase: any) {
  console.log('Aggregating daily analytics...')
  
  // Aggregate user engagement metrics
  const { data: userAnalytics } = await supabase
    .from('user_analytics')
    .select('user_id, event_type, created_at')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if (userAnalytics) {
    const userEngagement = userAnalytics.reduce((acc: any, event: any) => {
      const userId = event.user_id
      if (!acc[userId]) {
        acc[userId] = { sessions: 0, events: 0, lastActivity: event.created_at }
      }
      acc[userId].events++
      if (event.event_type === 'session') {
        acc[userId].sessions++
      }
      return acc
    }, {})

    // Insert aggregated data into business_metrics
    for (const [userId, metrics] of Object.entries(userEngagement)) {
      const metric = metrics as any
      await supabase
        .from('business_metrics')
        .insert({
          metric_category: 'engagement',
          metric_name: 'daily_user_engagement',
          metric_value: metric.events,
          metric_date: new Date().toISOString().split('T')[0],
          time_period: 'daily',
          segment_filters: { user_id: userId },
          calculated_fields: {
            sessions: metric.sessions,
            events_per_session: metric.sessions > 0 ? metric.events / metric.sessions : 0
          }
        })
    }
  }

  console.log('Daily analytics aggregation completed')
}

async function generateContentPerformanceScores(supabase: any) {
  console.log('Generating content performance scores...')
  
  // Get all content analytics from the last week
  const { data: contentAnalytics } = await supabase
    .from('content_analytics')
    .select('content_id, views, likes, shares, comments, downloads')
    .gte('analytics_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

  if (contentAnalytics) {
    const contentScores = contentAnalytics.reduce((acc: any, analytics: any) => {
      const contentId = analytics.content_id
      if (!acc[contentId]) {
        acc[contentId] = { views: 0, likes: 0, shares: 0, comments: 0, downloads: 0 }
      }
      
      acc[contentId].views += analytics.views || 0
      acc[contentId].likes += analytics.likes || 0
      acc[contentId].shares += analytics.shares || 0
      acc[contentId].comments += analytics.comments || 0
      acc[contentId].downloads += analytics.downloads || 0
      
      return acc
    }, {})

    // Calculate and update performance scores
    for (const [contentId, metrics] of Object.entries(contentScores)) {
      const m = metrics as any
      
      // Calculate performance score (0-100)
      const engagementScore = (m.likes * 3 + m.shares * 5 + m.comments * 4) / Math.max(m.views, 1) * 100
      const reachScore = m.views * 0.1
      const qualityScore = (m.downloads / Math.max(m.views, 1)) * 100
      
      const performanceScore = Math.min(
        Math.round((engagementScore * 0.4 + reachScore * 0.3 + qualityScore * 0.3)),
        100
      )

      // Update content analytics with calculated score
      await supabase
        .from('content_analytics')
        .update({ 
          performance_score: performanceScore,
          engagement_rate: (m.likes + m.shares + m.comments) / Math.max(m.views, 1) * 100
        })
        .eq('content_id', contentId)
        .eq('analytics_date', new Date().toISOString().split('T')[0])
    }
  }

  console.log('Content performance scores generated')
}

async function aggregateTeamPerformanceMetrics(supabase: any) {
  console.log('Aggregating team performance metrics...')
  
  // Get team activity metrics
  const { data: teamData } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      current_member_count,
      team_members!inner(user_id, is_active, status),
      projects!inner(id, created_at, status)
    `)

  if (teamData) {
    for (const team of teamData) {
      const activeMembers = team.team_members?.filter((m: any) => m.is_active && m.status === 'active').length || 0
      const activeProjects = team.projects?.filter((p: any) => p.status === 'active').length || 0
      const completedProjects = team.projects?.filter((p: any) => p.status === 'completed').length || 0
      
      const productivity = activeProjects + completedProjects * 2
      const collaboration = activeMembers * 10

      // Insert team performance metrics
      await supabase
        .from('business_metrics')
        .insert([
          {
            team_id: team.id,
            metric_category: 'growth',
            metric_name: 'team_productivity',
            metric_value: productivity,
            metric_date: new Date().toISOString().split('T')[0],
            time_period: 'daily',
            calculated_fields: {
              active_members: activeMembers,
              active_projects: activeProjects,
              completed_projects: completedProjects
            }
          },
          {
            team_id: team.id,
            metric_category: 'engagement',
            metric_name: 'team_collaboration',
            metric_value: collaboration,
            metric_date: new Date().toISOString().split('T')[0],
            time_period: 'daily'
          }
        ])
    }
  }

  console.log('Team performance metrics aggregated')
}

async function generatePredictiveInsights(supabase: any) {
  console.log('Generating predictive insights...')
  
  // Get recent business metrics for trend analysis
  const { data: recentMetrics } = await supabase
    .from('business_metrics')
    .select('*')
    .gte('metric_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('metric_date', { ascending: true })

  if (recentMetrics && recentMetrics.length > 0) {
    const insights: any[] = []

    // Analyze trends by metric category
    const metricsByCategory = recentMetrics.reduce((acc: any, metric: any) => {
      const category = metric.metric_category
      if (!acc[category]) acc[category] = []
      acc[category].push(metric)
      return acc
    }, {})

    for (const [category, metrics] of Object.entries(metricsByCategory)) {
      const metricArray = metrics as any[]
      if (metricArray.length >= 7) { // Need at least a week of data
        const recent = metricArray.slice(-7)
        const previous = metricArray.slice(-14, -7)
        
        const recentAvg = recent.reduce((sum: number, m: any) => sum + m.metric_value, 0) / recent.length
        const previousAvg = previous.length > 0 
          ? previous.reduce((sum: number, m: any) => sum + m.metric_value, 0) / previous.length 
          : recentAvg

        const trend = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0
        
        let impactLevel = 'low'
        let insight = ''
        
        if (Math.abs(trend) > 20) {
          impactLevel = 'high'
          insight = trend > 0 
            ? `${category} metrics are trending upward by ${trend.toFixed(1)}%`
            : `${category} metrics are declining by ${Math.abs(trend).toFixed(1)}%`
        } else if (Math.abs(trend) > 10) {
          impactLevel = 'medium'
          insight = `${category} metrics show moderate ${trend > 0 ? 'growth' : 'decline'}`
        }

        if (insight) {
          insights.push({
            insight_type: 'trend_analysis',
            insight_category: 'performance',
            title: `${category.charAt(0).toUpperCase() + category.slice(1)} Performance Trend`,
            description: insight,
            impact_level: impactLevel,
            confidence_score: Math.min(90, metricArray.length * 3),
            metrics_involved: { category, trend_percentage: trend },
            recommended_actions: trend < -10 
              ? [{ action: 'investigate_decline', priority: 'high' }]
              : [{ action: 'maintain_momentum', priority: 'medium' }],
            time_period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            time_period_end: new Date().toISOString().split('T')[0],
            is_actionable: Math.abs(trend) > 15
          })
        }
      }
    }

    // Insert insights
    if (insights.length > 0) {
      await supabase
        .from('analytics_insights')
        .insert(insights)
    }
  }

  console.log('Predictive insights generated')
}