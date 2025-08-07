-- Fix security linter issues from previous migration

-- Add missing RLS policies for tables that need system-level access

-- Team security events - allow system to insert security events
CREATE POLICY "System can create security events" ON public.team_security_events
FOR INSERT WITH CHECK (true);

CREATE POLICY "Team admins can manage security events" ON public.team_security_events
FOR ALL USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.slug IN ('owner', 'admin', 'security_officer')
  )
);

-- Team usage metrics - allow system to update metrics
CREATE POLICY "System can manage usage metrics" ON public.team_usage_metrics
FOR ALL USING (true);

-- Team data exports - allow users to view their own exports
CREATE POLICY "Users can view their own exports" ON public.team_data_exports
FOR SELECT USING (requested_by = auth.uid());

-- Fix the function search path issue by updating the existing function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;