-- Fix missing RLS policies for security warnings (corrected)

-- Add RLS policy for role_permissions table
DROP POLICY IF EXISTS "Anyone can view role permissions" ON public.role_permissions;
CREATE POLICY "Anyone can view role permissions" ON public.role_permissions
FOR SELECT USING (true);

-- Add RLS policy for user_roles table  
DROP POLICY IF EXISTS "Anyone can view user roles" ON public.user_roles;
CREATE POLICY "Anyone can view user roles" ON public.user_roles
FOR SELECT USING (true);

-- Add RLS policy for scheduled_reports table
DROP POLICY IF EXISTS "Users can manage their scheduled reports" ON public.scheduled_reports;
CREATE POLICY "Users can manage their scheduled reports" ON public.scheduled_reports
FOR ALL USING (created_by = auth.uid());

-- Add RLS policy for report_shares table (using correct column name)
DROP POLICY IF EXISTS "Users can manage their report shares" ON public.report_shares;
CREATE POLICY "Users can manage their report shares" ON public.report_shares
FOR ALL USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can view shared reports" ON public.report_shares;
CREATE POLICY "Users can view shared reports" ON public.report_shares
FOR SELECT USING (true);