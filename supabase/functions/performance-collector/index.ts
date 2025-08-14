import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PerformanceMetric {
  metric_type: string;
  metric_name: string;
  metric_value: number;
  metric_unit?: string;
  context?: Record<string, any>;
  tags?: Record<string, any>;
  session_id?: string;
  correlation_id?: string;
  user_id?: string;
  team_id?: string;
  project_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'POST') {
      const metricsData = await req.json();
      
      // Handle batch metrics
      const metrics = Array.isArray(metricsData) ? metricsData : [metricsData];
      
      const processedMetrics = metrics.map((metric: PerformanceMetric) => ({
        ...metric,
        timestamp: new Date().toISOString(),
        context: metric.context || {},
        tags: metric.tags || {},
        metadata: {
          collected_at: new Date().toISOString(),
          source: 'performance-collector'
        }
      }));

      const { data, error } = await supabase
        .from('performance_metrics')
        .insert(processedMetrics)
        .select();

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data: data,
        message: `${processedMetrics.length} metrics collected successfully`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201
      });
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const metricType = url.searchParams.get('metric_type');
      const userId = url.searchParams.get('user_id');
      const teamId = url.searchParams.get('team_id');
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const hours = parseInt(url.searchParams.get('hours') || '24');
      
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      let query = supabase
        .from('performance_metrics')
        .select('*')
        .gte('timestamp', since)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (metricType) {
        query = query.eq('metric_type', metricType);
      }
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate aggregated statistics
      const stats = data?.reduce((acc: any, metric: any) => {
        const type = metric.metric_type;
        if (!acc[type]) {
          acc[type] = {
            count: 0,
            sum: 0,
            min: Infinity,
            max: -Infinity,
            avg: 0
          };
        }
        
        acc[type].count++;
        acc[type].sum += metric.metric_value;
        acc[type].min = Math.min(acc[type].min, metric.metric_value);
        acc[type].max = Math.max(acc[type].max, metric.metric_value);
        acc[type].avg = acc[type].sum / acc[type].count;
        
        return acc;
      }, {});

      return new Response(JSON.stringify({
        success: true,
        data: data || [],
        stats: stats || {},
        count: data?.length || 0,
        timeRange: {
          since,
          hours
        }
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
    console.error('Error in performance-collector function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error',
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});