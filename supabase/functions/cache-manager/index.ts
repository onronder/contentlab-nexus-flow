import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withSecurity, SecurityLogger } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CacheStatistics {
  cache_name: string;
  cache_type: string;
  hit_count?: number;
  miss_count?: number;
  eviction_count?: number;
  total_requests?: number;
  hit_ratio?: number;
  average_response_time_ms?: number;
  cache_size_bytes?: number;
  max_size_bytes?: number;
  key_count?: number;
  oldest_entry_age_seconds?: number;
  memory_usage_bytes?: number;
  statistics_period_start?: string;
  statistics_period_end?: string;
}

const handler = async (req: Request, logger: SecurityLogger): Promise<Response> => {
  try {
    logger.info('Cache manager request', { method: req.method });
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'POST') {
      const statsData = await req.json();
      
      // Handle batch statistics
      const stats = Array.isArray(statsData) ? statsData : [statsData];
      
      const processedStats = stats.map((stat: CacheStatistics) => {
        const hitRatio = stat.total_requests && stat.total_requests > 0 
          ? (stat.hit_count || 0) / stat.total_requests 
          : 0;
          
        return {
          ...stat,
          hit_ratio: hitRatio,
          statistics_period_start: stat.statistics_period_start || new Date().toISOString(),
          statistics_period_end: stat.statistics_period_end || new Date().toISOString(),
          metadata: {
            collected_at: new Date().toISOString(),
            source: 'cache-manager'
          },
          created_at: new Date().toISOString()
        };
      });

      const { data, error } = await supabase
        .from('cache_statistics')
        .insert(processedStats)
        .select();

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data: data,
        message: `${processedStats.length} cache statistics recorded successfully`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201
      });
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const cacheName = url.searchParams.get('cache_name');
      const cacheType = url.searchParams.get('cache_type');
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const hours = parseInt(url.searchParams.get('hours') || '24');
      const aggregate = url.searchParams.get('aggregate') === 'true';
      
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      let query = supabase
        .from('cache_statistics')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false });

      if (!aggregate) {
        query = query.limit(limit);
      }

      if (cacheName) {
        query = query.eq('cache_name', cacheName);
      }
      
      if (cacheType) {
        query = query.eq('cache_type', cacheType);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (aggregate && data) {
        // Calculate aggregated statistics
        const aggregatedStats = data.reduce((acc: any, stat: any) => {
          const key = `${stat.cache_name}-${stat.cache_type}`;
          
          if (!acc[key]) {
            acc[key] = {
              cache_name: stat.cache_name,
              cache_type: stat.cache_type,
              total_hits: 0,
              total_misses: 0,
              total_evictions: 0,
              total_requests: 0,
              avg_response_time: 0,
              max_cache_size: 0,
              samples: 0
            };
          }
          
          acc[key].total_hits += stat.hit_count || 0;
          acc[key].total_misses += stat.miss_count || 0;
          acc[key].total_evictions += stat.eviction_count || 0;
          acc[key].total_requests += stat.total_requests || 0;
          acc[key].avg_response_time = (acc[key].avg_response_time * acc[key].samples + (stat.average_response_time_ms || 0)) / (acc[key].samples + 1);
          acc[key].max_cache_size = Math.max(acc[key].max_cache_size, stat.cache_size_bytes || 0);
          acc[key].samples++;
          
          return acc;
        }, {});

        // Calculate overall hit ratios
        Object.values(aggregatedStats).forEach((stats: any) => {
          stats.overall_hit_ratio = stats.total_requests > 0 
            ? stats.total_hits / stats.total_requests 
            : 0;
        });

        return new Response(JSON.stringify({
          success: true,
          aggregated_data: Object.values(aggregatedStats),
          timeRange: { since, hours },
          sample_count: data.length
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: data || [],
        count: data?.length || 0,
        timeRange: { since, hours }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const cacheName = url.searchParams.get('cache_name');
      const olderThan = url.searchParams.get('older_than');
      
      let query = supabase.from('cache_statistics').delete();
      
      if (cacheName) {
        query = query.eq('cache_name', cacheName);
      }
      
      if (olderThan) {
        query = query.lt('created_at', olderThan);
      }
      
      const { data, error } = await query.select('id');

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        message: `${data?.length || 0} cache statistics deleted`,
        deleted_count: data?.length || 0
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
    logger.error('Cache manager operation failed', error as Error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error',
      error: error.message
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
};

export default withSecurity(handler, {
  requireAuth: true,
  rateLimitRequests: 200,
  rateLimitWindow: 60000,
  validateInput: true,
  enableCORS: true
});