-- Complete RLS Policy Reset - Step 2: Create Simple, Non-Circular Policies

-- Simple policies for teams table (no cross-table references)
CREATE POLICY "Users can view teams they own" 
ON public.teams 
FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "Users can create teams" 
ON public.teams 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update teams" 
ON public.teams 
FOR UPDATE 
USING (owner_id = auth.uid());

CREATE POLICY "Team owners can delete teams" 
ON public.teams 
FOR DELETE 
USING (owner_id = auth.uid());

-- Simple policies for team_members table (no cross-table references)
CREATE POLICY "Users can view their own memberships" 
ON public.team_members 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "System can manage memberships" 
ON public.team_members 
FOR ALL 
USING (true);