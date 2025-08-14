import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  component?: string;
  module?: string;
  function_name?: string;
  line_number?: number;
  correlation_id?: string;
  session_id?: string;
  request_id?: string;
  user_agent?: string;
  ip_address?: string;
  context?: Record<string, any>;
  tags?: string[];
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
      const logData = await req.json();
      
      // Handle batch logs
      const logs = Array.isArray(logData) ? logData : [logData];
      
      const processedLogs = logs.map((log: LogEntry) => ({
        ...log,
        context: log.context || {},
        tags: log.tags || [],
        metadata: {
          processed_at: new Date().toISOString(),
          source: 'log-processor'
        },
        created_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('log_entries')
        .insert(processedLogs)
        .select();

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data: data,
        message: `${processedLogs.length} logs processed successfully`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201
      });
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const level = url.searchParams.get('level');
      const component = url.searchParams.get('component');
      const userId = url.searchParams.get('user_id');
      const teamId = url.searchParams.get('team_id');
      const correlationId = url.searchParams.get('correlation_id');
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const hours = parseInt(url.searchParams.get('hours') || '24');
      const search = url.searchParams.get('search');
      
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      let query = supabase
        .from('log_entries')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (level) {
        query = query.eq('level', level);
      }
      
      if (component) {
        query = query.eq('component', component);
      }
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      if (teamId) {
        query = query.eq('team_id', teamId);
      }
      
      if (correlationId) {
        query = query.eq('correlation_id', correlationId);
      }
      
      if (search) {
        query = query.ilike('message', `%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate log level distribution
      const levelStats = data?.reduce((acc: any, log: any) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
      }, {});

      // Calculate component distribution
      const componentStats = data?.reduce((acc: any, log: any) => {
        if (log.component) {
          acc[log.component] = (acc[log.component] || 0) + 1;
        }
        return acc;
      }, {});

      return new Response(JSON.stringify({
        success: true,
        data: data || [],
        stats: {
          levels: levelStats || {},
          components: componentStats || {},
          total: data?.length || 0
        },
        timeRange: {
          since,
          hours
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const olderThan = url.searchParams.get('older_than');
      
      if (!olderThan) {
        throw new Error('older_than parameter is required');
      }

      const { data, error } = await supabase
        .from('log_entries')
        .delete()
        .lt('created_at', olderThan)
        .select('id');

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        message: `${data?.length || 0} log entries deleted`,
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
    console.error('Error in log-processor function:', error);
    
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