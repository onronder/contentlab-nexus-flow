-- Fix remaining security definer functions with missing search paths

CREATE OR REPLACE FUNCTION public.validate_settings_data(p_setting_type text, p_settings_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    -- Extract field value from settings data
    v_field_value := p_settings_data #> string_to_array(v_rule.field_path, '.');
    
    -- Perform validation based on rule type
    CASE v_rule.rule_type
      WHEN 'required' THEN
        IF v_field_value IS NULL THEN
          v_validation_errors := v_validation_errors || jsonb_build_object(
            'field', v_rule.field_path,
            'error', 'Field is required'
          );
        END IF;
      WHEN 'type' THEN
        -- Type validation logic here
        NULL;
      WHEN 'range' THEN
        -- Range validation logic here
        NULL;
    END CASE;
  END LOOP;
  
  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_validation_errors) = 0,
    'errors', v_validation_errors
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_team_activity(p_team_id uuid, p_user_id uuid, p_activity_type activity_type, p_action character varying, p_description text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO public.activity_logs (
    team_id, user_id, activity_type, action, description, metadata
  ) VALUES (
    p_team_id, p_user_id, p_activity_type, p_action, p_description, p_metadata
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_role_permissions(role_slug text, permission_slugs text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  role_record public.user_roles;
  permission_record public.permissions;
  permission_slug TEXT;
BEGIN
  -- Get the role
  SELECT * INTO role_record FROM public.user_roles WHERE slug = role_slug AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role with slug % not found', role_slug;
  END IF;
  
  -- Assign each permission
  FOREACH permission_slug IN ARRAY permission_slugs
  LOOP
    SELECT * INTO permission_record FROM public.permissions WHERE slug = permission_slug;
    
    IF FOUND THEN
      INSERT INTO public.role_permissions (role_id, permission_id)
      VALUES (role_record.id, permission_record.id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.team_invitations 
  SET status = 'expired' 
  WHERE status = 'pending' AND expires_at < now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.notifications 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_comment(p_comment_id uuid, p_resolved_by uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.comments 
  SET 
    is_resolved = true,
    resolved_by = p_resolved_by,
    resolved_at = NOW()
  WHERE id = p_comment_id AND author_id = p_resolved_by;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_content_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_content_performance_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  score INTEGER := 0;
  engagement_weight INTEGER := 40;
  reach_weight INTEGER := 30;
  quality_weight INTEGER := 30;
BEGIN
  -- Calculate engagement score (40% weight)
  score := score + LEAST(
    (NEW.views * 1 + NEW.likes * 3 + NEW.shares * 5 + NEW.comments * 4) / GREATEST(NEW.views, 1) * engagement_weight,
    engagement_weight
  );
  
  -- Calculate reach score (30% weight)
  score := score + LEAST(
    NEW.reach / GREATEST(NEW.impressions, 1) * 100 * reach_weight / 100,
    reach_weight
  );
  
  -- Calculate quality score (30% weight) - based on CTR and conversion
  score := score + LEAST(
    (NEW.click_through_rate + NEW.conversion_rate) * quality_weight / 2,
    quality_weight
  );
  
  NEW.performance_score := LEAST(score, 100);
  RETURN NEW;
END;
$function$;