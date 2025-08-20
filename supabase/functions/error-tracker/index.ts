import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withSecurity, SecurityLogger } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ErrorTrackingRequest {
  error_type: string;
  error_message: string;
  error_stack?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
  user_agent?: string;
  url?: string;
  fingerprint?: string;
  user_id?: string;
  team_id?: string;
  project_id?: string;
}

const handler = async (req: Request, logger: SecurityLogger): Promise<Response> => {
  try {
    logger.info('Error tracker request', { method: req.method });
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'POST') {
      const errorData: ErrorTrackingRequest = await req.json();
      
      // Generate fingerprint if not provided
      const fingerprint = errorData.fingerprint || 
        btoa(`${errorData.error_type}-${errorData.error_message}`).substring(0, 32);

      // Check if error already exists (deduplication)
      const { data: existingError } = await supabase
        .from('error_logs')
        .select('*')
        .eq('fingerprint', fingerprint)
        .single();

      if (existingError) {
        // Update existing error with new occurrence
        const { data, error } = await supabase
          .from('error_logs')
          .update({
            occurrence_count: existingError.occurrence_count + 1,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingError.id)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          data: data,
          message: 'Error occurrence updated'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      } else {
        // Create new error log
        const { data, error } = await supabase
          .from('error_logs')
          .insert({
            error_type: errorData.error_type,
            error_message: errorData.error_message,
            error_stack: errorData.error_stack,
            severity: errorData.severity || 'medium',
            context: errorData.context || {},
            user_agent: errorData.user_agent,
            url: errorData.url,
            fingerprint,
            user_id: errorData.user_id,
            team_id: errorData.team_id,
            project_id: errorData.project_id,
            occurrence_count: 1,
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          data: data,
          message: 'Error logged successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201
        });
      }
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const userId = url.searchParams.get('user_id');
      const teamId = url.searchParams.get('team_id');
      const severity = url.searchParams.get('severity');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      
      let query = supabase
        .from('error_logs')
        .select('*')
        .order('last_seen_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      if (teamId) {
        query = query.eq('team_id', teamId);
      }
      
      if (severity) {
        query = query.eq('severity', severity);
      }

      const { data, error } = await query;

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data: data || [],
        count: data?.length || 0
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
    logger.error('Error tracker operation failed', error as Error);
    
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
  rateLimitRequests: 500, // Higher limit for error tracking
  rateLimitWindow: 60000,
  validateInput: true,
  enableCORS: true
});