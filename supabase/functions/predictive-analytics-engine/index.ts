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

    const { teamId, predictionType = 'user_engagement', timeHorizon = 30 } = await req.json();

    console.log(`Predictive analytics request: teamId=${teamId}, type=${predictionType}`);

    if (!teamId) {
      throw new Error('Team ID is required');
    }

    // Get current user and verify team access
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // Verify team membership
    const { data: teamMember, error: memberError } = await supabaseClient
      .from('team_members')
      .select('role_id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (memberError || !teamMember) {
      throw new Error('Access denied: Not a member of this team');
    }

    // Gather historical data for predictions
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (90 * 24 * 60 * 60 * 1000)); // 90 days back

    let historicalData = [];
    let inputData = {};
    let predictionData = {};

    switch (predictionType) {
      case 'user_engagement':
        // Get user analytics data
        const { data: userAnalytics } = await supabaseClient
          .from('user_analytics')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        historicalData = userAnalytics || [];
        
        // Calculate engagement trends
        const dailyEngagement = calculateDailyEngagement(historicalData);
        predictionData = generateEngagementPredictions(dailyEngagement, timeHorizon);
        inputData = { dailyEngagement, timeHorizon, dataPoints: historicalData.length };
        break;

      case 'content_performance':
        // Get content analytics
        const { data: contentAnalytics } = await supabaseClient
          .from('content_analytics')
          .select('*')
          .gte('analytics_date', startDate.toISOString().split('T')[0]);

        historicalData = contentAnalytics || [];
        
        const contentTrends = calculateContentTrends(historicalData);
        predictionData = generateContentPredictions(contentTrends, timeHorizon);
        inputData = { contentTrends, timeHorizon, dataPoints: historicalData.length };
        break;

      case 'collaboration_efficiency':
        // Get collaboration data
        const { data: collabSessions } = await supabaseClient
          .from('collaborative_sessions')
          .select('*')
          .eq('team_id', teamId)
          .gte('created_at', startDate.toISOString());

        historicalData = collabSessions || [];
        
        const efficiencyTrends = calculateEfficiencyTrends(historicalData);
        predictionData = generateEfficiencyPredictions(efficiencyTrends, timeHorizon);
        inputData = { efficiencyTrends, timeHorizon, dataPoints: historicalData.length };
        break;

      default:
        throw new Error(`Unsupported prediction type: ${predictionType}`);
    }

    // Calculate confidence level based on data quality
    const confidenceLevel = calculateConfidenceLevel(historicalData, predictionType);

    // Store prediction in database
    const validUntil = new Date(endDate.getTime() + (timeHorizon * 24 * 60 * 60 * 1000));
    
    const { data: prediction, error: insertError } = await supabaseClient
      .from('analytics_predictions')
      .insert({
        team_id: teamId,
        prediction_type: predictionType,
        input_data: inputData,
        prediction_data: predictionData,
        confidence_level: confidenceLevel,
        model_version: 'v2.0',
        valid_until: validUntil.toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to store prediction');
    }

    console.log(`Prediction created: ${prediction.id} (confidence: ${confidenceLevel})`);

    return new Response(
      JSON.stringify({
        success: true,
        prediction,
        metadata: {
          historicalDataPoints: historicalData.length,
          predictionHorizon: timeHorizon,
          confidenceLevel,
          modelVersion: 'v2.0'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Predictive analytics error:', error);
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

// Helper functions for calculations
function calculateDailyEngagement(data: any[]): any[] {
  const dailyMap = new Map();
  
  data.forEach(record => {
    const date = record.created_at.split('T')[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { date, events: 0, sessions: new Set() });
    }
    const day = dailyMap.get(date);
    day.events++;
    if (record.session_id) day.sessions.add(record.session_id);
  });

  return Array.from(dailyMap.values()).map(day => ({
    ...day,
    sessions: day.sessions.size
  }));
}

function generateEngagementPredictions(historical: any[], days: number): any {
  const avgEvents = historical.reduce((sum, day) => sum + day.events, 0) / historical.length || 0;
  const avgSessions = historical.reduce((sum, day) => sum + day.sessions, 0) / historical.length || 0;
  
  // Simple trend calculation
  const trend = historical.length > 1 ? 
    (historical[historical.length - 1].events - historical[0].events) / historical.length : 0;

  const predictions = [];
  const today = new Date();
  
  for (let i = 1; i <= days; i++) {
    const futureDate = new Date(today.getTime() + (i * 24 * 60 * 60 * 1000));
    const predictedEvents = Math.max(0, avgEvents + (trend * i));
    const predictedSessions = Math.max(0, avgSessions * (1 + (trend / avgEvents) * i));
    
    predictions.push({
      date: futureDate.toISOString().split('T')[0],
      predictedEvents: Math.round(predictedEvents),
      predictedSessions: Math.round(predictedSessions),
      confidence: Math.max(0.3, 0.9 - (i * 0.02)) // Decreasing confidence over time
    });
  }

  return { predictions, summary: { avgEvents, avgSessions, trend } };
}

function calculateContentTrends(data: any[]): any {
  const totalViews = data.reduce((sum, item) => sum + (item.views || 0), 0);
  const totalEngagement = data.reduce((sum, item) => sum + (item.likes || 0) + (item.shares || 0), 0);
  const avgPerformanceScore = data.reduce((sum, item) => sum + (item.performance_score || 0), 0) / data.length || 0;

  return { totalViews, totalEngagement, avgPerformanceScore, contentCount: data.length };
}

function generateContentPredictions(trends: any, days: number): any {
  const dailyViews = trends.totalViews / 30; // Assume 30-day average
  const engagementRate = trends.totalEngagement / trends.totalViews || 0.02;
  
  const predictions = [];
  for (let i = 1; i <= days; i++) {
    predictions.push({
      day: i,
      predictedViews: Math.round(dailyViews * (1 + Math.random() * 0.2 - 0.1)), // ±10% variance
      predictedEngagement: Math.round(dailyViews * engagementRate),
      expectedPerformanceScore: Math.min(100, trends.avgPerformanceScore * (1 + Math.random() * 0.1))
    });
  }

  return { predictions, trends };
}

function calculateEfficiencyTrends(data: any[]): any {
  const activeSessions = data.filter(s => s.is_active).length;
  const avgParticipants = data.reduce((sum, s) => {
    const participants = Array.isArray(s.participants) ? s.participants.length : 0;
    return sum + participants;
  }, 0) / data.length || 0;

  return { activeSessions, avgParticipants, totalSessions: data.length };
}

function generateEfficiencyPredictions(trends: any, days: number): any {
  const predictions = [];
  for (let i = 1; i <= days; i++) {
    predictions.push({
      day: i,
      predictedSessions: Math.round(trends.totalSessions / 30 * (1 + Math.random() * 0.15 - 0.075)),
      predictedParticipants: Math.round(trends.avgParticipants * (1 + Math.random() * 0.1 - 0.05)),
      efficiencyScore: Math.min(100, 75 + Math.random() * 20)
    });
  }

  return { predictions, trends };
}

function calculateConfidenceLevel(data: any[], predictionType: string): number {
  const dataPoints = data.length;
  const baseConfidence = Math.min(0.95, 0.3 + (dataPoints / 100) * 0.6);
  
  // Adjust based on prediction type
  const typeMultiplier = {
    user_engagement: 0.9,
    content_performance: 0.85,
    collaboration_efficiency: 0.8,
    market_trends: 0.7,
    competitive_analysis: 0.75
  };

  return Math.round(baseConfidence * (typeMultiplier[predictionType as keyof typeof typeMultiplier] || 0.8) * 100) / 100;
}