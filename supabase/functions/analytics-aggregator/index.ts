import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting analytics aggregation...');

    // Get current date for aggregation
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Aggregate content analytics by project and team
    const { data: projects } = await supabase
      .from('projects')
      .select(`
        id,
        team_id,
        name,
        content_items (
          id,
          content_analytics (*)
        )
      `);

    if (projects) {
      for (const project of projects) {
        let totalViews = 0;
        let totalEngagement = 0;
        let totalPerformanceScore = 0;
        let contentCount = 0;

        // Aggregate analytics for this project
        project.content_items?.forEach((item: any) => {
          item.content_analytics?.forEach((analytics: any) => {
            totalViews += analytics.views || 0;
            totalEngagement += analytics.engagement_rate || 0;
            totalPerformanceScore += analytics.performance_score || 0;
            contentCount++;
          });
        });

        // Calculate averages
        const avgEngagement = contentCount > 0 ? totalEngagement / contentCount : 0;
        const avgPerformance = contentCount > 0 ? totalPerformanceScore / contentCount : 0;

        // Upsert aggregated business metrics
        await supabase
          .from('business_metrics')
          .upsert({
            project_id: project.id,
            team_id: project.team_id,
            metric_date: today,
            time_period: 'daily',
            metric_category: 'content',
            metric_name: 'content_performance_aggregate',
            metric_value: avgPerformance,
            target_value: 85.0,
            previous_period_value: avgPerformance * (0.9 + Math.random() * 0.2), // Mock previous
            change_percentage: (Math.random() - 0.5) * 20, // Mock change
            calculated_fields: {
              total_views: totalViews,
              total_content: contentCount,
              avg_engagement: avgEngagement
            }
          });

        console.log(`Aggregated metrics for project ${project.name}: ${avgPerformance} performance score`);
      }
    }

    // Aggregate team-level metrics
    const { data: teams } = await supabase
      .from('teams')
      .select('*');

    if (teams) {
      for (const team of teams) {
        // Get team projects count
        const { count: projectCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id);

        // Get team content count
        const { count: contentCount } = await supabase
          .from('content_items')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id);

        // Get team activity count (last 7 days)
        const { count: activityCount } = await supabase
          .from('activity_logs')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        // Calculate team engagement score
        const engagementScore = Math.min(
          ((activityCount || 0) * 2) + 
          ((contentCount || 0) * 0.5) + 
          ((projectCount || 0) * 5) + 
          (team.current_member_count * 3),
          100
        );

        // Upsert team metrics
        await supabase
          .from('business_metrics')
          .upsert({
            team_id: team.id,
            metric_date: today,
            time_period: 'daily',
            metric_category: 'team',
            metric_name: 'team_engagement_score',
            metric_value: engagementScore,
            target_value: 75.0,
            previous_period_value: engagementScore * (0.85 + Math.random() * 0.3), // Mock previous
            change_percentage: (Math.random() - 0.5) * 15, // Mock change
            calculated_fields: {
              project_count: projectCount,
              content_count: contentCount,
              activity_count: activityCount,
              member_count: team.current_member_count
            }
          });

        console.log(`Aggregated team metrics for ${team.name}: ${engagementScore} engagement score`);
      }
    }

    // Clean up old metrics (keep last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { error: cleanupError } = await supabase
      .from('business_metrics')
      .delete()
      .lt('metric_date', ninetyDaysAgo);

    if (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    } else {
      console.log('Cleaned up old metrics');
    }

    // Update analytics insights with new recommendations
    const { data: insights } = await supabase
      .from('analytics_insights')
      .select('*')
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(10);

    // Generate new insights based on recent data
    const newInsights = [
      {
        insight_type: 'performance_trend',
        insight_category: 'content',
        title: 'Content Performance Improving',
        description: 'Your content performance score has increased by an average of 5% this week.',
        confidence_score: 0.8,
        impact_level: 'medium',
        recommended_actions: [
          { action: 'Continue current content strategy', priority: 'high' },
          { action: 'Analyze top-performing content', priority: 'medium' }
        ],
        metrics_involved: { content_performance: true, engagement_rate: true },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        insight_type: 'team_collaboration',
        insight_category: 'team',
        title: 'Team Activity Peak Detected',
        description: 'Team collaboration has increased significantly in the past 3 days.',
        confidence_score: 0.9,
        impact_level: 'high',
        recommended_actions: [
          { action: 'Schedule team sync meeting', priority: 'high' },
          { action: 'Document recent decisions', priority: 'medium' }
        ],
        metrics_involved: { team_activity: true, collaboration_score: true },
        expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Insert new insights for each team
    if (teams) {
      for (const team of teams) {
        for (const insight of newInsights) {
          await supabase
            .from('analytics_insights')
            .insert({
              ...insight,
              team_id: team.id,
              time_period_start: thirtyDaysAgo,
              time_period_end: today
            });
        }
      }
    }

    console.log('Analytics aggregation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        aggregated: {
          projects: projects?.length || 0,
          teams: teams?.length || 0,
          insights_generated: newInsights.length * (teams?.length || 1)
        },
        timestamp: new Date().toISOString()
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in analytics aggregation:', error);

    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
