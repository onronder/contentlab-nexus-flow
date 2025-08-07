-- Add missing policies for enterprise tables to complete security compliance

-- Additional policies for team_billing table
CREATE POLICY "Team members can view billing info" ON public.team_billing
FOR SELECT USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
  )
);

-- Additional policies for team_compliance table  
CREATE POLICY "Team members can view compliance status" ON public.team_compliance
FOR SELECT USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
  )
);

-- Additional policies for team_policies table
CREATE POLICY "Team members can view policies" ON public.team_policies
FOR SELECT USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
  )
);

-- System can manage billing for automated processes
CREATE POLICY "System can manage billing" ON public.team_billing
FOR ALL USING (true);

-- System can manage compliance for automated audits
CREATE POLICY "System can manage compliance" ON public.team_compliance
FOR ALL USING (true);

-- System can manage policies for automated enforcement
CREATE POLICY "System can manage policies" ON public.team_policies
FOR ALL USING (true);