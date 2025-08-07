-- Fix subscription tier values for default billing
INSERT INTO public.team_billing (team_id, subscription_tier, billing_cycle, subscription_status, created_at)
SELECT 
  t.id,
  'basic',
  'monthly',
  'active',
  now()
FROM public.teams t
WHERE NOT EXISTS (
  SELECT 1 FROM public.team_billing tb WHERE tb.team_id = t.id
);