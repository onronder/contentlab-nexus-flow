-- Create default billing record for existing teams without billing data
INSERT INTO public.team_billing (team_id, subscription_tier, billing_cycle, subscription_status, created_at)
SELECT 
  t.id,
  'starter',
  'monthly',
  'active',
  now()
FROM public.teams t
WHERE NOT EXISTS (
  SELECT 1 FROM public.team_billing tb WHERE tb.team_id = t.id
);

-- Create function to ensure team has billing record
CREATE OR REPLACE FUNCTION public.ensure_team_billing(p_team_id UUID)
RETURNS public.team_billing
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  billing_record public.team_billing;
BEGIN
  -- Try to get existing record
  SELECT * INTO billing_record 
  FROM public.team_billing 
  WHERE team_id = p_team_id;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.team_billing (
      team_id, 
      subscription_tier, 
      billing_cycle, 
      subscription_status,
      monthly_cost,
      usage_limits,
      current_usage
    ) VALUES (
      p_team_id,
      'starter',
      'monthly',
      'active',
      29.00,
      '{"projects": 5, "team_members": 10, "storage_gb": 10, "api_calls": 1000}',
      '{"projects": 0, "team_members": 1, "storage_gb": 0, "api_calls": 0}'
    ) RETURNING * INTO billing_record;
  END IF;
  
  RETURN billing_record;
END;
$$;