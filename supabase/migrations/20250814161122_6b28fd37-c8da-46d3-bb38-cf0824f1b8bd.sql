-- Step 1: Create settings versioning tables
CREATE TABLE IF NOT EXISTS public.settings_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_type TEXT NOT NULL CHECK (setting_type IN ('user', 'team', 'project', 'content', 'competitive', 'analytics')),
  entity_id UUID NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  settings_data JSONB NOT NULL,
  change_summary TEXT,
  changed_fields TEXT[],
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(setting_type, entity_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_settings_versions_entity ON public.settings_versions(setting_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_settings_versions_created_at ON public.settings_versions(created_at);

-- Step 2: Create settings templates table
CREATE TABLE IF NOT EXISTS public.settings_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('user', 'team', 'project', 'content', 'competitive', 'analytics')),
  template_data JSONB NOT NULL,
  is_system_template BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_settings_templates_category ON public.settings_templates(category);
CREATE INDEX IF NOT EXISTS idx_settings_templates_tags ON public.settings_templates USING GIN(tags);

-- Step 3: Create settings backups table
CREATE TABLE IF NOT EXISTS public.settings_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_name TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  backup_data JSONB NOT NULL,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('manual', 'automatic', 'scheduled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  file_size BIGINT,
  checksum TEXT
);

CREATE INDEX IF NOT EXISTS idx_settings_backups_user_id ON public.settings_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_backups_created_at ON public.settings_backups(created_at);
CREATE INDEX IF NOT EXISTS idx_settings_backups_expires_at ON public.settings_backups(expires_at);

-- Step 4: Create settings audit logs table
CREATE TABLE IF NOT EXISTS public.settings_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_type TEXT NOT NULL CHECK (setting_type IN ('user', 'team', 'project', 'content', 'competitive', 'analytics')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore', 'import', 'export')),
  field_path TEXT,
  old_value JSONB,
  new_value JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_settings_audit_logs_entity ON public.settings_audit_logs(setting_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_settings_audit_logs_user_id ON public.settings_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_audit_logs_created_at ON public.settings_audit_logs(created_at);

-- Step 5: Create settings validation rules table
CREATE TABLE IF NOT EXISTS public.settings_validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_type TEXT NOT NULL CHECK (setting_type IN ('user', 'team', 'project', 'content', 'competitive', 'analytics')),
  field_path TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('required', 'format', 'range', 'dependency', 'business')),
  rule_config JSONB NOT NULL,
  error_message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settings_validation_rules_type_field ON public.settings_validation_rules(setting_type, field_path);

-- Step 6: Enable RLS on all new tables
ALTER TABLE public.settings_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_validation_rules ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies
-- Settings versions policies
CREATE POLICY "Users can view their own settings versions" 
ON public.settings_versions FOR SELECT 
TO authenticated 
USING (
  (setting_type = 'user' AND entity_id = auth.uid()) OR
  (setting_type = 'team' AND entity_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND is_active = true))
);

CREATE POLICY "Users can create settings versions" 
ON public.settings_versions FOR INSERT 
TO authenticated 
WITH CHECK (created_by = auth.uid());

-- Settings templates policies
CREATE POLICY "Users can view templates" 
ON public.settings_templates FOR SELECT 
TO authenticated 
USING (is_system_template = true OR created_by = auth.uid());

CREATE POLICY "Users can manage their own templates" 
ON public.settings_templates FOR ALL 
TO authenticated 
USING (created_by = auth.uid());

-- Settings backups policies
CREATE POLICY "Users can manage their own backups" 
ON public.settings_backups FOR ALL 
TO authenticated 
USING (user_id = auth.uid());

-- Settings audit logs policies
CREATE POLICY "Users can view their own audit logs" 
ON public.settings_audit_logs FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() OR
  (setting_type = 'team' AND entity_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND is_active = true))
);

CREATE POLICY "System can create audit logs" 
ON public.settings_audit_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Settings validation rules policies
CREATE POLICY "Users can view validation rules" 
ON public.settings_validation_rules FOR SELECT 
TO authenticated 
USING (true);

-- Step 8: Create functions for settings management

-- Function to create settings version
CREATE OR REPLACE FUNCTION public.create_settings_version(
  p_setting_type TEXT,
  p_entity_id UUID,
  p_settings_data JSONB,
  p_change_summary TEXT DEFAULT NULL,
  p_changed_fields TEXT[] DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_version_number INTEGER;
  v_version_id UUID;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 
  INTO v_version_number
  FROM public.settings_versions 
  WHERE setting_type = p_setting_type AND entity_id = p_entity_id;
  
  -- Create new version
  INSERT INTO public.settings_versions (
    setting_type, entity_id, version_number, settings_data, 
    change_summary, changed_fields, created_by
  ) VALUES (
    p_setting_type, p_entity_id, v_version_number, p_settings_data,
    p_change_summary, p_changed_fields, auth.uid()
  ) RETURNING id INTO v_version_id;
  
  RETURN v_version_id;
END;
$$;

-- Function to restore settings from version
CREATE OR REPLACE FUNCTION public.restore_settings_from_version(
  p_version_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_version_record public.settings_versions;
  v_restored_data JSONB;
BEGIN
  -- Get version record
  SELECT * INTO v_version_record
  FROM public.settings_versions
  WHERE id = p_version_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settings version not found';
  END IF;
  
  -- Log the restore action
  INSERT INTO public.settings_audit_logs (
    setting_type, entity_id, action, new_value, user_id
  ) VALUES (
    v_version_record.setting_type, 
    v_version_record.entity_id, 
    'restore', 
    v_version_record.settings_data,
    auth.uid()
  );
  
  RETURN v_version_record.settings_data;
END;
$$;

-- Function to validate settings data
CREATE OR REPLACE FUNCTION public.validate_settings_data(
  p_setting_type TEXT,
  p_settings_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rule RECORD;
  v_validation_errors JSONB := '[]'::JSONB;
  v_field_value JSONB;
BEGIN
  -- Iterate through validation rules
  FOR v_rule IN 
    SELECT * FROM public.settings_validation_rules 
    WHERE setting_type = p_setting_type AND is_active = true
  LOOP
    -- Extract field value using JSON path
    v_field_value := p_settings_data #> string_to_array(v_rule.field_path, '.');
    
    -- Apply validation based on rule type
    CASE v_rule.rule_type
      WHEN 'required' THEN
        IF v_field_value IS NULL THEN
          v_validation_errors := v_validation_errors || jsonb_build_object(
            'field', v_rule.field_path,
            'error', v_rule.error_message,
            'type', 'required'
          );
        END IF;
      -- Add more validation types as needed
    END CASE;
  END LOOP;
  
  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_validation_errors) = 0,
    'errors', v_validation_errors
  );
END;
$$;

-- Function to cleanup expired backups
CREATE OR REPLACE FUNCTION public.cleanup_expired_settings_backups()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.settings_backups
  WHERE expires_at IS NOT NULL AND expires_at < now();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- Step 9: Create triggers for automatic versioning
CREATE OR REPLACE FUNCTION public.auto_version_settings_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_setting_type TEXT;
  v_entity_id UUID;
  v_changed_fields TEXT[];
BEGIN
  -- Determine setting type and entity ID based on table
  CASE TG_TABLE_NAME
    WHEN 'user_settings' THEN
      v_setting_type := 'user';
      v_entity_id := NEW.user_id;
    WHEN 'content_settings' THEN
      v_setting_type := 'content';
      v_entity_id := NEW.user_id;
    WHEN 'competitive_settings' THEN
      v_setting_type := 'competitive';
      v_entity_id := NEW.user_id;
    WHEN 'analytics_settings' THEN
      v_setting_type := 'analytics';
      v_entity_id := NEW.user_id;
    ELSE
      RETURN NEW;
  END CASE;
  
  -- Create version record
  PERFORM public.create_settings_version(
    v_setting_type,
    v_entity_id,
    to_jsonb(NEW),
    'Automatic version on settings update',
    v_changed_fields
  );
  
  RETURN NEW;
END;
$$;

-- Add triggers to settings tables
CREATE TRIGGER trigger_auto_version_user_settings
  AFTER UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_version_settings_change();

CREATE TRIGGER trigger_auto_version_content_settings
  AFTER UPDATE ON public.content_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_version_settings_change();

CREATE TRIGGER trigger_auto_version_competitive_settings
  AFTER UPDATE ON public.competitive_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_version_settings_change();

CREATE TRIGGER trigger_auto_version_analytics_settings
  AFTER UPDATE ON public.analytics_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_version_settings_change();