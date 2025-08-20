-- Phase 2: Async Job Processing System (Simplified)
-- Create basic job queue system for AI operations

-- Create AI job queue table for async processing
CREATE TABLE IF NOT EXISTS public.ai_job_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type text NOT NULL, -- 'content_analysis', 'insight_generation', 'collaboration_assist'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  priority integer NOT NULL DEFAULT 5, -- 1 (highest) to 10 (lowest)
  user_id uuid, -- User who requested the job
  team_id uuid, -- Team context if applicable
  
  -- Job data
  input_data jsonb NOT NULL DEFAULT '{}',
  output_data jsonb DEFAULT '{}',
  error_data jsonb DEFAULT '{}',
  
  -- Processing metadata
  assigned_worker text, -- Worker instance processing the job
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  
  -- Timing
  scheduled_at timestamp with time zone NOT NULL DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  expires_at timestamp with time zone DEFAULT (now() + interval '24 hours'),
  
  -- Progress tracking
  progress_percent integer DEFAULT 0,
  progress_message text,
  
  -- Security and audit
  correlation_id text,
  source_ip inet,
  user_agent text,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create security events table for comprehensive monitoring
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL, -- 'auth_attempt', 'rate_limit_exceeded', 'suspicious_activity', 'api_abuse'
  severity text NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
  user_id uuid,
  team_id uuid,
  
  -- Event details
  event_data jsonb NOT NULL DEFAULT '{}',
  description text,
  
  -- Request context
  ip_address inet,
  user_agent text,
  request_path text,
  correlation_id text,
  
  -- Response actions
  action_taken text, -- 'none', 'rate_limited', 'blocked', 'escalated'
  automatic_response boolean DEFAULT false,
  
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create AI usage analytics table
CREATE TABLE IF NOT EXISTS public.ai_usage_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  team_id uuid,
  
  -- Usage metrics
  model_used text NOT NULL, -- 'gpt-4o-mini', 'gpt-4o', etc.
  tokens_used integer NOT NULL DEFAULT 0,
  cost_estimate numeric(10, 6) DEFAULT 0, -- Estimated cost in USD
  
  -- Request details
  endpoint text NOT NULL, -- 'ai-collaboration-assistant', 'content-analyzer', etc.
  operation_type text, -- 'content_improvement', 'sentiment_analysis', etc.
  processing_time_ms integer,
  
  -- Quality metrics
  confidence_score numeric(3, 2),
  success boolean NOT NULL DEFAULT true,
  error_type text,
  
  -- Time tracking
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.ai_job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_analytics ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies for ai_job_queue
CREATE POLICY "Users can view their own AI jobs" ON public.ai_job_queue FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create AI jobs" ON public.ai_job_queue FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "System can manage all AI jobs" ON public.ai_job_queue FOR ALL USING (true);

-- Simple RLS Policies for security_events  
CREATE POLICY "System can manage security events" ON public.security_events FOR ALL USING (true);

-- Simple RLS Policies for ai_usage_analytics
CREATE POLICY "Users can view their own AI usage" ON public.ai_usage_analytics FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can manage AI usage analytics" ON public.ai_usage_analytics FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_job_queue_status_priority ON public.ai_job_queue(status, priority, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_ai_job_queue_user ON public.ai_job_queue(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_job_queue_team ON public.ai_job_queue(team_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_job_queue_expires ON public.ai_job_queue(expires_at) WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_security_events_type_severity ON public.security_events(event_type, severity, created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON public.security_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON public.security_events(ip_address, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics_user_date ON public.ai_usage_analytics(user_id, request_date);
CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics_team_date ON public.ai_usage_analytics(team_id, request_date);
CREATE INDEX IF NOT EXISTS idx_ai_usage_analytics_endpoint ON public.ai_usage_analytics(endpoint, created_at);

-- Create updated_at trigger for ai_job_queue
CREATE OR REPLACE FUNCTION public.update_ai_job_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_job_queue_updated_at
  BEFORE UPDATE ON public.ai_job_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_job_queue_updated_at();

-- Create job cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_jobs()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Mark expired jobs as failed
  UPDATE public.ai_job_queue 
  SET status = 'failed',
      error_data = jsonb_build_object(
        'error', 'Job expired',
        'expired_at', now()
      )
  WHERE status IN ('pending', 'processing') 
  AND expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete completed jobs older than 7 days
  DELETE FROM public.ai_job_queue 
  WHERE status IN ('completed', 'failed', 'cancelled')
  AND completed_at < now() - interval '7 days';
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;