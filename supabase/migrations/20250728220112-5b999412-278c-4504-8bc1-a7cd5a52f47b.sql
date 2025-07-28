-- Fix Security Issues: Recreate functions with proper search_path

-- Drop triggers first
DROP TRIGGER IF EXISTS update_content_items_updated_at ON content_items;
DROP TRIGGER IF EXISTS update_content_categories_updated_at ON content_categories;
DROP TRIGGER IF EXISTS update_content_analytics_updated_at ON content_analytics;
DROP TRIGGER IF EXISTS update_content_search_vector_trigger ON content_items;
DROP TRIGGER IF EXISTS calculate_performance_score_trigger ON content_analytics;
DROP TRIGGER IF EXISTS log_content_activity_trigger ON content_items;

-- Drop functions
DROP FUNCTION IF EXISTS update_content_updated_at();
DROP FUNCTION IF EXISTS update_content_search_vector();
DROP FUNCTION IF EXISTS calculate_content_performance_score();
DROP FUNCTION IF EXISTS log_content_activity();

-- Recreate functions with proper search_path
CREATE OR REPLACE FUNCTION update_content_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_content_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector = to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' || 
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(array_to_string(ARRAY(SELECT tag FROM public.content_tags WHERE content_id = NEW.id), ' '), '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_content_performance_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

CREATE OR REPLACE FUNCTION log_content_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  action_type TEXT;
  user_id_val UUID;
BEGIN
  user_id_val := auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status AND NEW.status = 'published' THEN
      action_type := 'published';
    ELSIF OLD.status != NEW.status AND NEW.status = 'archived' THEN
      action_type := 'archived';
    ELSE
      action_type := 'updated';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'deleted';
  END IF;
  
  INSERT INTO public.content_activity_log (
    content_id,
    user_id,
    action,
    description,
    metadata
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    user_id_val,
    action_type,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Content created: ' || NEW.title
      WHEN TG_OP = 'UPDATE' THEN 'Content updated: ' || NEW.title
      WHEN TG_OP = 'DELETE' THEN 'Content deleted: ' || OLD.title
    END,
    jsonb_build_object(
      'operation', TG_OP,
      'content_type', COALESCE(NEW.content_type, OLD.content_type),
      'status', COALESCE(NEW.status, OLD.status)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_content_items_updated_at
  BEFORE UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION update_content_updated_at();

CREATE TRIGGER update_content_categories_updated_at
  BEFORE UPDATE ON content_categories
  FOR EACH ROW EXECUTE FUNCTION update_content_updated_at();

CREATE TRIGGER update_content_analytics_updated_at
  BEFORE UPDATE ON content_analytics
  FOR EACH ROW EXECUTE FUNCTION update_content_updated_at();

CREATE TRIGGER update_content_search_vector_trigger
  BEFORE INSERT OR UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION update_content_search_vector();

CREATE TRIGGER calculate_performance_score_trigger
  BEFORE INSERT OR UPDATE ON content_analytics
  FOR EACH ROW EXECUTE FUNCTION calculate_content_performance_score();

CREATE TRIGGER log_content_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON content_items
  FOR EACH ROW EXECUTE FUNCTION log_content_activity();