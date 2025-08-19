-- Phase 2.0: AI Integration + Mobile/Cross-Platform + Advanced Analytics

-- AI Suggestions table for real-time collaboration assistance
CREATE TABLE public.ai_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.collaborative_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('content_improvement', 'conflict_resolution', 'style_suggestion', 'grammar_check', 'context_enhancement')),
  original_content TEXT,
  suggested_content TEXT NOT NULL,
  confidence_score FLOAT DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'ignored')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mobile sessions table for tracking mobile-specific collaboration
CREATE TABLE public.mobile_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  device_info JSONB DEFAULT '{}',
  session_duration INTEGER DEFAULT 0,
  gestures_used JSONB DEFAULT '[]',
  offline_actions JSONB DEFAULT '[]',
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'failed')),
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Analytics predictions for ML-powered forecasting
CREATE TABLE public.analytics_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL CHECK (prediction_type IN ('content_performance', 'collaboration_efficiency', 'user_engagement', 'market_trends', 'competitive_analysis')),
  input_data JSONB NOT NULL DEFAULT '{}',
  prediction_data JSONB NOT NULL DEFAULT '{}',
  confidence_level FLOAT DEFAULT 0.0 CHECK (confidence_level >= 0.0 AND confidence_level <= 1.0),
  model_version TEXT DEFAULT 'v1.0',
  accuracy_score FLOAT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'invalid')),
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Custom dashboards for user-created analytics views
CREATE TABLE public.custom_dashboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  dashboard_config JSONB NOT NULL DEFAULT '{}',
  widgets JSONB DEFAULT '[]',
  filters JSONB DEFAULT '{}',
  sharing_settings JSONB DEFAULT '{"public": false, "team_access": true}',
  view_count INTEGER DEFAULT 0,
  is_template BOOLEAN DEFAULT false,
  template_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Real-time analytics streams for live data processing
CREATE TABLE public.analytics_streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_name TEXT NOT NULL UNIQUE,
  data_source TEXT NOT NULL,
  aggregation_rules JSONB DEFAULT '{}',
  real_time_data JSONB DEFAULT '{}',
  last_processed_at TIMESTAMP WITH TIME ZONE,
  processing_status TEXT DEFAULT 'active' CHECK (processing_status IN ('active', 'paused', 'error', 'stopped')),
  error_log JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_streams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for AI Suggestions
CREATE POLICY "Users can view AI suggestions for their sessions" 
ON public.ai_suggestions FOR SELECT 
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.collaborative_sessions cs 
  WHERE cs.id = ai_suggestions.session_id 
  AND cs.participants ? auth.uid()::text
));

CREATE POLICY "Users can create AI suggestions" 
ON public.ai_suggestions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their AI suggestions" 
ON public.ai_suggestions FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for Mobile Sessions
CREATE POLICY "Users can manage their mobile sessions" 
ON public.mobile_sessions FOR ALL 
USING (auth.uid() = user_id);

-- RLS Policies for Analytics Predictions
CREATE POLICY "Team members can view predictions" 
ON public.analytics_predictions FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.team_members tm 
  WHERE tm.team_id = analytics_predictions.team_id 
  AND tm.user_id = auth.uid()
));

CREATE POLICY "Team admins can manage predictions" 
ON public.analytics_predictions FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.team_members tm 
  WHERE tm.team_id = analytics_predictions.team_id 
  AND tm.user_id = auth.uid() 
  AND tm.role_id IN (
    SELECT id FROM public.user_roles 
    WHERE slug IN ('admin', 'owner') AND is_active = true
  )
));

-- RLS Policies for Custom Dashboards
CREATE POLICY "Users can manage their dashboards" 
ON public.custom_dashboards FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Team members can view team dashboards" 
ON public.custom_dashboards FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.team_members tm 
  WHERE tm.team_id = custom_dashboards.team_id 
  AND tm.user_id = auth.uid()
));

-- RLS Policies for Analytics Streams
CREATE POLICY "System can manage analytics streams" 
ON public.analytics_streams FOR ALL 
USING (true);

-- Indexes for performance
CREATE INDEX idx_ai_suggestions_session_id ON public.ai_suggestions(session_id);
CREATE INDEX idx_ai_suggestions_user_id ON public.ai_suggestions(user_id);
CREATE INDEX idx_ai_suggestions_type_status ON public.ai_suggestions(suggestion_type, status);

CREATE INDEX idx_mobile_sessions_user_id ON public.mobile_sessions(user_id);
CREATE INDEX idx_mobile_sessions_device_type ON public.mobile_sessions(device_type);
CREATE INDEX idx_mobile_sessions_sync_status ON public.mobile_sessions(sync_status);

CREATE INDEX idx_analytics_predictions_team_id ON public.analytics_predictions(team_id);
CREATE INDEX idx_analytics_predictions_type ON public.analytics_predictions(prediction_type);
CREATE INDEX idx_analytics_predictions_status ON public.analytics_predictions(status);

CREATE INDEX idx_custom_dashboards_user_id ON public.custom_dashboards(user_id);
CREATE INDEX idx_custom_dashboards_team_id ON public.custom_dashboards(team_id);
CREATE INDEX idx_custom_dashboards_template ON public.custom_dashboards(is_template, template_category);

CREATE INDEX idx_analytics_streams_name ON public.analytics_streams(stream_name);
CREATE INDEX idx_analytics_streams_status ON public.analytics_streams(processing_status);

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_ai_suggestions_updated_at
  BEFORE UPDATE ON public.ai_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mobile_sessions_updated_at
  BEFORE UPDATE ON public.mobile_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analytics_predictions_updated_at
  BEFORE UPDATE ON public.analytics_predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_dashboards_updated_at
  BEFORE UPDATE ON public.custom_dashboards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analytics_streams_updated_at
  BEFORE UPDATE ON public.analytics_streams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();