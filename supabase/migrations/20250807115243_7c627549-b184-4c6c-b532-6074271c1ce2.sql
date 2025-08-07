-- Create enterprise team administration tables

-- Team billing and subscription management
CREATE TABLE public.team_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'suspended', 'expired')),
  subscription_tier TEXT NOT NULL DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'professional', 'enterprise')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  monthly_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  usage_limits JSONB NOT NULL DEFAULT '{"users": 10, "projects": 5, "storage_gb": 10}',
  current_usage JSONB NOT NULL DEFAULT '{"users": 0, "projects": 0, "storage_gb": 0}',
  billing_contact_id UUID REFERENCES public.profiles(id),
  payment_method JSONB DEFAULT '{}',
  next_billing_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team compliance and audit
CREATE TABLE public.team_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  compliance_framework TEXT NOT NULL CHECK (compliance_framework IN ('gdpr', 'soc2', 'hipaa', 'iso27001')),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('compliant', 'in_progress', 'non_compliant', 'under_review')),
  last_audit_date TIMESTAMPTZ,
  next_audit_date TIMESTAMPTZ,
  findings JSONB DEFAULT '[]',
  remediation_plan JSONB DEFAULT '{}',
  evidence_documents JSONB DEFAULT '[]',
  audit_score INTEGER CHECK (audit_score >= 0 AND audit_score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team policies and governance
CREATE TABLE public.team_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('security', 'data_retention', 'access_control', 'communication', 'workflow', 'content_moderation')),
  policy_name TEXT NOT NULL,
  policy_description TEXT,
  policy_rules JSONB NOT NULL DEFAULT '{}',
  enforcement_level TEXT NOT NULL DEFAULT 'advisory' CHECK (enforcement_level IN ('advisory', 'warning', 'blocking')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  effective_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enhanced security events table
CREATE TABLE public.team_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('login_attempt', 'permission_change', 'data_access', 'policy_violation', 'suspicious_activity', 'security_breach')),
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  event_description TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  location_data JSONB DEFAULT '{}',
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100) DEFAULT 0,
  resolution_status TEXT DEFAULT 'open' CHECK (resolution_status IN ('open', 'investigating', 'resolved', 'false_positive')),
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team data exports and backups
CREATE TABLE public.team_data_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('full_backup', 'partial_export', 'compliance_report', 'audit_trail')),
  export_format TEXT NOT NULL DEFAULT 'json' CHECK (export_format IN ('json', 'csv', 'pdf', 'xml')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  file_path TEXT,
  file_size_bytes BIGINT,
  included_data JSONB NOT NULL DEFAULT '{}',
  retention_days INTEGER NOT NULL DEFAULT 30,
  download_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Team resource usage tracking
CREATE TABLE public.team_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active_users INTEGER NOT NULL DEFAULT 0,
  total_projects INTEGER NOT NULL DEFAULT 0,
  storage_used_gb DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  api_calls INTEGER NOT NULL DEFAULT 0,
  data_processed_gb DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  collaboration_sessions INTEGER NOT NULL DEFAULT 0,
  content_items_created INTEGER NOT NULL DEFAULT 0,
  features_used JSONB DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, metric_date)
);

-- Enable RLS on all tables
ALTER TABLE public.team_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_usage_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for team admins and owners
CREATE POLICY "Team admins can manage billing" ON public.team_billing
FOR ALL USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.slug IN ('owner', 'admin', 'billing_admin')
  )
);

CREATE POLICY "Team admins can manage compliance" ON public.team_compliance
FOR ALL USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.slug IN ('owner', 'admin', 'compliance_officer')
  )
);

CREATE POLICY "Team admins can manage policies" ON public.team_policies
FOR ALL USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.slug IN ('owner', 'admin', 'policy_manager')
  )
);

CREATE POLICY "Team security officers can view security events" ON public.team_security_events
FOR SELECT USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.slug IN ('owner', 'admin', 'security_officer')
  )
);

CREATE POLICY "Team admins can manage data exports" ON public.team_data_exports
FOR ALL USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.slug IN ('owner', 'admin', 'data_manager')
  )
);

CREATE POLICY "Team members can view usage metrics" ON public.team_usage_metrics
FOR SELECT USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
  )
);

-- Create indexes for performance
CREATE INDEX idx_team_billing_team_id ON public.team_billing(team_id);
CREATE INDEX idx_team_compliance_team_id ON public.team_compliance(team_id);
CREATE INDEX idx_team_policies_team_id ON public.team_policies(team_id);
CREATE INDEX idx_team_security_events_team_id ON public.team_security_events(team_id);
CREATE INDEX idx_team_security_events_severity ON public.team_security_events(severity);
CREATE INDEX idx_team_data_exports_team_id ON public.team_data_exports(team_id);
CREATE INDEX idx_team_usage_metrics_team_date ON public.team_usage_metrics(team_id, metric_date);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_billing_updated_at BEFORE UPDATE ON public.team_billing
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_compliance_updated_at BEFORE UPDATE ON public.team_compliance
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_policies_updated_at BEFORE UPDATE ON public.team_policies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();