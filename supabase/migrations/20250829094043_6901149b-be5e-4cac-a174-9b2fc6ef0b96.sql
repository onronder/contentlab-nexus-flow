-- Fix security issue: Make subscription_plans table properly secured
-- Currently anyone can read subscription plans, which should be restricted

-- Enable RLS on subscription_plans table
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view subscription plans
CREATE POLICY "Authenticated users can view subscription plans" 
ON public.subscription_plans 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create policy for system/admin to manage subscription plans
CREATE POLICY "System can manage subscription plans" 
ON public.subscription_plans 
FOR ALL 
USING (auth.role() = 'service_role');

-- Log security enhancement
DO $$
BEGIN
  PERFORM public.log_security_event(
    'security_enhancement',
    'Enabled RLS on subscription_plans table and added access policies',
    NULL, NULL, true,
    jsonb_build_object('table', 'subscription_plans', 'action', 'enable_rls')
  );
END $$;