-- PROMPT 3: Comprehensive Settings Integration and Platform Synchronization Database Schema

-- Settings integration tables for cross-module relationships
CREATE TABLE IF NOT EXISTS public.settings_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_setting_type TEXT NOT NULL,
  source_entity_id UUID NOT NULL,
  target_setting_type TEXT NOT NULL,
  target_entity_id UUID NOT NULL,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('inheritance', 'override', 'dependency', 'sync')),
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_setting_type, source_entity_id, target_setting_type, target_entity_id)
);

-- Settings synchronization log for tracking real-time updates
CREATE TABLE IF NOT EXISTS public.settings_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  sync_event TEXT NOT NULL CHECK (sync_event IN ('propagate', 'conflict', 'resolve', 'retry')),
  source_user_id UUID,
  target_entities JSONB DEFAULT '[]',
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'success', 'failed', 'partial')),
  conflict_resolution TEXT,
  error_details TEXT,
  processing_time_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Settings automation rules for intelligent configuration
CREATE TABLE IF NOT EXISTS public.settings_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  setting_type TEXT NOT NULL,
  trigger_conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  user_id UUID,
  team_id UUID,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Settings recommendations for user productivity
CREATE TABLE IF NOT EXISTS public.settings_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('optimization', 'feature', 'security', 'productivity')),
  setting_type TEXT NOT NULL,
  entity_id UUID,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_changes JSONB NOT NULL DEFAULT '{}',
  confidence_score DECIMAL(3,2) DEFAULT 0.5,
  impact_level TEXT DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'dismissed')),
  applied_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Settings analytics for usage tracking
CREATE TABLE IF NOT EXISTS public.settings_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  setting_type TEXT NOT NULL,
  entity_id UUID,
  action_type TEXT NOT NULL CHECK (action_type IN ('view', 'update', 'reset', 'export', 'import')),
  setting_path TEXT,
  old_value JSONB,
  new_value JSONB,
  session_id TEXT,
  user_agent TEXT,
  ip_address INET,
  performance_impact_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enhanced project settings table with team inheritance
ALTER TABLE public.project_settings 
ADD COLUMN IF NOT EXISTS inherit_from_team BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS team_settings_override JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_inherited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS inheritance_conflicts JSONB DEFAULT '[]';

-- Enhanced user settings with cross-platform sync
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS platform_sync_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_conflicts JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS device_preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS accessibility_settings JSONB DEFAULT '{"highContrast": false, "reducedMotion": false, "screenReader": false, "fontSize": "medium"}';

-- Enhanced team settings with member propagation
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS default_member_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS settings_policy JSONB DEFAULT '{"allowMemberOverrides": true, "requireApproval": false, "inheritanceRules": []}';

-- Content settings enhancements for library integration
ALTER TABLE public.content_settings
ADD COLUMN IF NOT EXISTS library_integration JSONB DEFAULT '{"autoSync": true, "conflictResolution": "user", "batchSize": 100}',
ADD COLUMN IF NOT EXISTS workflow_automation JSONB DEFAULT '{"autoTagging": false, "smartCategorization": false, "duplicateDetection": true}';

-- Competitive settings enhancements for analysis integration
ALTER TABLE public.competitive_settings
ADD COLUMN IF NOT EXISTS analysis_automation JSONB DEFAULT '{"autoSchedule": false, "intelligentFrequency": false, "alertThresholds": {}}',
ADD COLUMN IF NOT EXISTS integration_settings JSONB DEFAULT '{"shareWithTeam": true, "syncAnalysis": true, "collaborativeAlerts": false}';

-- Analytics settings enhancements for dashboard integration
ALTER TABLE public.analytics_settings
ADD COLUMN IF NOT EXISTS cross_module_analytics JSONB DEFAULT '{"includeContent": true, "includeCompetitive": true, "includeTeam": true}',
ADD COLUMN IF NOT EXISTS automation_preferences JSONB DEFAULT '{"autoReports": false, "intelligentInsights": false, "predictiveAnalytics": false}';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_settings_integrations_source ON public.settings_integrations(source_setting_type, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_settings_integrations_target ON public.settings_integrations(target_setting_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_settings_sync_log_entity ON public.settings_sync_log(setting_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_settings_sync_log_status ON public.settings_sync_log(sync_status, created_at);
CREATE INDEX IF NOT EXISTS idx_settings_automation_user ON public.settings_automation_rules(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_settings_recommendations_user ON public.settings_recommendations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_settings_analytics_user_time ON public.settings_analytics(user_id, created_at);

-- Enable Row Level Security
ALTER TABLE public.settings_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for settings_integrations
CREATE POLICY "Users can view integrations for their settings" ON public.settings_integrations
  FOR SELECT USING (
    source_entity_id = auth.uid() OR 
    target_entity_id = auth.uid() OR
    source_entity_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND is_active = true) OR
    target_entity_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Users can manage integrations for their settings" ON public.settings_integrations
  FOR ALL USING (
    source_entity_id = auth.uid() OR 
    target_entity_id = auth.uid() OR
    source_entity_id IN (SELECT team_id FROM team_members tm JOIN user_roles ur ON tm.role_id = ur.id 
                        WHERE tm.user_id = auth.uid() AND tm.is_active = true AND ur.hierarchy_level >= 7)
  );

-- RLS Policies for settings_sync_log
CREATE POLICY "Users can view their sync logs" ON public.settings_sync_log
  FOR SELECT USING (
    entity_id = auth.uid() OR
    source_user_id = auth.uid() OR
    entity_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND is_active = true)
  );

-- RLS Policies for settings_automation_rules
CREATE POLICY "Users can manage their automation rules" ON public.settings_automation_rules
  FOR ALL USING (
    user_id = auth.uid() OR
    team_id IN (SELECT team_id FROM team_members tm JOIN user_roles ur ON tm.role_id = ur.id 
                WHERE tm.user_id = auth.uid() AND tm.is_active = true AND ur.hierarchy_level >= 6)
  );

-- RLS Policies for settings_recommendations
CREATE POLICY "Users can view their recommendations" ON public.settings_recommendations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their recommendations" ON public.settings_recommendations
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for settings_analytics
CREATE POLICY "Users can view their analytics" ON public.settings_analytics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert analytics" ON public.settings_analytics
  FOR INSERT WITH CHECK (true);

-- Create functions for settings integration

-- Function to propagate settings changes
CREATE OR REPLACE FUNCTION public.propagate_settings_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  integration_record RECORD;
  sync_targets JSONB := '[]';
BEGIN
  -- Find all integration relationships where this setting is a source
  FOR integration_record IN 
    SELECT * FROM public.settings_integrations 
    WHERE source_entity_id = COALESCE(NEW.user_id, NEW.team_id, NEW.project_id)
    AND is_active = true
    AND integration_type IN ('inheritance', 'sync')
  LOOP
    -- Add to sync targets
    sync_targets := sync_targets || jsonb_build_object(
      'type', integration_record.target_setting_type,
      'entity_id', integration_record.target_entity_id,
      'integration_type', integration_record.integration_type
    );
  END LOOP;

  -- Log the synchronization event
  IF jsonb_array_length(sync_targets) > 0 THEN
    INSERT INTO public.settings_sync_log (
      setting_type, entity_id, sync_event, source_user_id, target_entities, metadata
    ) VALUES (
      TG_TABLE_NAME, 
      COALESCE(NEW.user_id, NEW.team_id, NEW.project_id),
      'propagate',
      auth.uid(),
      sync_targets,
      jsonb_build_object('trigger', 'settings_change', 'table', TG_TABLE_NAME)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Function to apply automation rules
CREATE OR REPLACE FUNCTION public.apply_settings_automation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rule_record RECORD;
  conditions_met BOOLEAN;
BEGIN
  -- Check automation rules for this setting type
  FOR rule_record IN 
    SELECT * FROM public.settings_automation_rules 
    WHERE setting_type = TG_TABLE_NAME
    AND (user_id = COALESCE(NEW.user_id, auth.uid()) OR team_id = NEW.team_id)
    AND is_active = true
  LOOP
    -- Simple condition checking (can be enhanced)
    conditions_met := true; -- Placeholder for complex condition logic
    
    IF conditions_met THEN
      -- Update execution count
      UPDATE public.settings_automation_rules 
      SET execution_count = execution_count + 1,
          last_executed_at = now()
      WHERE id = rule_record.id;
      
      -- Log the automation execution
      INSERT INTO public.settings_analytics (
        user_id, setting_type, entity_id, action_type, metadata
      ) VALUES (
        COALESCE(NEW.user_id, auth.uid()),
        TG_TABLE_NAME,
        COALESCE(NEW.user_id, NEW.team_id, NEW.project_id),
        'automation',
        jsonb_build_object('rule_id', rule_record.id, 'rule_name', rule_record.rule_name)
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Function to generate settings recommendations
CREATE OR REPLACE FUNCTION public.generate_settings_recommendations(
  p_user_id UUID,
  p_setting_type TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_analytics RECORD;
  recommendation_data JSONB;
BEGIN
  -- Analyze user settings usage patterns
  FOR user_analytics IN 
    SELECT 
      setting_type,
      COUNT(*) as usage_count,
      AVG(performance_impact_ms) as avg_performance,
      array_agg(DISTINCT action_type) as action_types
    FROM public.settings_analytics 
    WHERE user_id = p_user_id 
    AND (p_setting_type IS NULL OR setting_type = p_setting_type)
    AND created_at > now() - interval '30 days'
    GROUP BY setting_type
  LOOP
    -- Generate recommendations based on usage patterns
    IF user_analytics.avg_performance > 1000 THEN
      INSERT INTO public.settings_recommendations (
        user_id, recommendation_type, setting_type, title, description,
        suggested_changes, confidence_score, impact_level
      ) VALUES (
        p_user_id,
        'optimization',
        user_analytics.setting_type,
        'Performance Optimization Available',
        'Your settings operations are slower than average. Consider optimizing your configuration.',
        '{"caching": true, "batchUpdates": true}',
        0.8,
        'medium'
      ) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- Add triggers for settings tables
CREATE TRIGGER settings_propagation_user_settings
  AFTER UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.propagate_settings_change();

CREATE TRIGGER settings_automation_user_settings
  AFTER INSERT OR UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.apply_settings_automation();

-- Add triggers for updated_at columns
CREATE TRIGGER update_settings_integrations_updated_at
  BEFORE UPDATE ON public.settings_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_settings_updated_at();

CREATE TRIGGER update_settings_automation_rules_updated_at
  BEFORE UPDATE ON public.settings_automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_settings_updated_at();