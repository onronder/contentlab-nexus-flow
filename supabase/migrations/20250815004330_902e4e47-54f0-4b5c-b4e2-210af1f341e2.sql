-- First, check if team_billing table exists and create it if missing
-- with proper security from the start

-- Create team_billing table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.team_billing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL,
    subscription_tier TEXT NOT NULL DEFAULT 'free',
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    billing_email TEXT,
    payment_method_id TEXT,
    payment_method_last4 TEXT,
    payment_method_brand TEXT,
    subscription_status TEXT NOT NULL DEFAULT 'inactive',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    usage_limits JSONB DEFAULT '{}',
    usage_current JSONB DEFAULT '{}',
    billing_address JSONB DEFAULT '{}',
    tax_info JSONB DEFAULT '{}',
    discount_codes JSONB DEFAULT '[]',
    billing_history JSONB DEFAULT '[]',
    next_billing_date TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT true,
    billing_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT fk_team_billing_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
);

-- Enable RLS on team_billing table
ALTER TABLE public.team_billing ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_team_billing_team_id ON public.team_billing(team_id);
CREATE INDEX IF NOT EXISTS idx_team_billing_status ON public.team_billing(subscription_status);

-- Create security definer function to check billing access permissions
CREATE OR REPLACE FUNCTION public.can_access_team_billing(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Only team owners and members with billing management roles can access billing data
  SELECT EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = p_team_id AND t.owner_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.team_id = p_team_id 
    AND tm.user_id = p_user_id
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND (
      ur.slug IN ('owner', 'admin', 'billing_manager') 
      OR ur.hierarchy_level >= 8  -- High-level access required
    )
  );
$$;

-- Drop any existing overly permissive policies
DROP POLICY IF EXISTS "Allow public read access" ON public.team_billing;
DROP POLICY IF EXISTS "Public read access" ON public.team_billing;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.team_billing;

-- Create secure RLS policies for team_billing

-- Policy 1: Only authorized team members can view billing data
CREATE POLICY "Authorized team members can view billing data"
ON public.team_billing
FOR SELECT
TO authenticated
USING (public.can_access_team_billing(team_id, auth.uid()));

-- Policy 2: Only authorized team members can insert billing data
CREATE POLICY "Authorized team members can create billing data"
ON public.team_billing
FOR INSERT
TO authenticated
WITH CHECK (public.can_access_team_billing(team_id, auth.uid()));

-- Policy 3: Only authorized team members can update billing data
CREATE POLICY "Authorized team members can update billing data"
ON public.team_billing
FOR UPDATE
TO authenticated
USING (public.can_access_team_billing(team_id, auth.uid()))
WITH CHECK (public.can_access_team_billing(team_id, auth.uid()));

-- Policy 4: Only team owners can delete billing data
CREATE POLICY "Team owners can delete billing data"
ON public.team_billing
FOR DELETE
TO authenticated
USING (
  team_id IN (
    SELECT t.id FROM public.teams t 
    WHERE t.owner_id = auth.uid()
  )
);

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_team_billing_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_team_billing_updated_at
  BEFORE UPDATE ON public.team_billing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_team_billing_updated_at();

-- Create billing_manager role if it doesn't exist
INSERT INTO public.user_roles (name, slug, description, role_type, hierarchy_level, is_active)
VALUES ('Billing Manager', 'billing_manager', 'Can manage team billing and subscription settings', 'functional', 7, true)
ON CONFLICT (slug) DO NOTHING;

-- Log this security fix
INSERT INTO public.audit_logs (
  action_type,
  action_description,
  resource_type,
  metadata
) VALUES (
  'security_fix',
  'Fixed critical security vulnerability: Restricted access to team_billing table',
  'team_billing',
  jsonb_build_object(
    'issue', 'Financial data exposure',
    'severity', 'critical',
    'fix_description', 'Added proper RLS policies and access controls',
    'affected_data', 'subscription_tier, billing_cycle, usage_limits, payment_method_info'
  )
);