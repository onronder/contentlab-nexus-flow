-- Fix RLS policies for enterprise tables
-- Enable RLS on all enterprise tables
ALTER TABLE public.team_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_usage_metrics ENABLE ROW LEVEL SECURITY;

-- Team Billing Policies
CREATE POLICY "Team members can view billing"
ON public.team_billing FOR SELECT
USING (team_id IN (
  SELECT tm.team_id FROM public.team_members tm
  WHERE tm.user_id = auth.uid() 
  AND tm.is_active = true 
  AND tm.status = 'active'
));

CREATE POLICY "Team owners can manage billing"
ON public.team_billing FOR ALL
USING (team_id IN (
  SELECT t.id FROM public.teams t
  WHERE t.owner_id = auth.uid()
));

-- Team Compliance Policies
CREATE POLICY "Team members can view compliance"
ON public.team_compliance FOR SELECT
USING (team_id IN (
  SELECT tm.team_id FROM public.team_members tm
  WHERE tm.user_id = auth.uid() 
  AND tm.is_active = true 
  AND tm.status = 'active'
));

CREATE POLICY "Team admins can manage compliance"
ON public.team_compliance FOR ALL
USING (team_id IN (
  SELECT tm.team_id FROM public.team_members tm
  JOIN public.user_roles ur ON tm.role_id = ur.id
  WHERE tm.user_id = auth.uid() 
  AND tm.is_active = true 
  AND tm.status = 'active'
  AND ur.hierarchy_level >= 8
));

-- Team Policies Policies
CREATE POLICY "Team members can view policies"
ON public.team_policies FOR SELECT
USING (team_id IN (
  SELECT tm.team_id FROM public.team_members tm
  WHERE tm.user_id = auth.uid() 
  AND tm.is_active = true 
  AND tm.status = 'active'
));

CREATE POLICY "Team admins can manage policies"
ON public.team_policies FOR ALL
USING (team_id IN (
  SELECT tm.team_id FROM public.team_members tm
  JOIN public.user_roles ur ON tm.role_id = ur.id
  WHERE tm.user_id = auth.uid() 
  AND tm.is_active = true 
  AND tm.status = 'active'
  AND ur.hierarchy_level >= 8
));

-- Team Security Events Policies
CREATE POLICY "Team members can view security events"
ON public.team_security_events FOR SELECT
USING (team_id IN (
  SELECT tm.team_id FROM public.team_members tm
  WHERE tm.user_id = auth.uid() 
  AND tm.is_active = true 
  AND tm.status = 'active'
));

CREATE POLICY "System can manage security events"
ON public.team_security_events FOR ALL
USING (true);

-- Team Data Exports Policies
CREATE POLICY "Team members can view exports"
ON public.team_data_exports FOR SELECT
USING (team_id IN (
  SELECT tm.team_id FROM public.team_members tm
  WHERE tm.user_id = auth.uid() 
  AND tm.is_active = true 
  AND tm.status = 'active'
));

CREATE POLICY "Team members can create exports"
ON public.team_data_exports FOR INSERT
WITH CHECK (team_id IN (
  SELECT tm.team_id FROM public.team_members tm
  WHERE tm.user_id = auth.uid() 
  AND tm.is_active = true 
  AND tm.status = 'active'
) AND requested_by = auth.uid());

CREATE POLICY "Users can update their exports"
ON public.team_data_exports FOR UPDATE
USING (requested_by = auth.uid());

-- Team Usage Metrics Policies
CREATE POLICY "Team members can view usage metrics"
ON public.team_usage_metrics FOR SELECT
USING (team_id IN (
  SELECT tm.team_id FROM public.team_members tm
  WHERE tm.user_id = auth.uid() 
  AND tm.is_active = true 
  AND tm.status = 'active'
));

CREATE POLICY "System can manage usage metrics"
ON public.team_usage_metrics FOR ALL
USING (true);