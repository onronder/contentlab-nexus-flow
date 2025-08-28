-- Create RPC function for user usage summary
CREATE OR REPLACE FUNCTION public.get_user_usage_summary(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  resource_type TEXT,
  sum BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ut.resource_type,
    SUM(ut.usage_count)::BIGINT as sum
  FROM public.usage_tracking ut
  WHERE ut.user_id = p_user_id
    AND ut.usage_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  GROUP BY ut.resource_type;
$$;