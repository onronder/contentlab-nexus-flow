-- Create safe security definer functions that avoid recursion
CREATE OR REPLACE FUNCTION public.get_user_team_role_level_safe(p_team_id UUID, p_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(ur.hierarchy_level, 0)
  FROM public.team_members tm
  JOIN public.user_roles ur ON tm.role_id = ur.id
  WHERE tm.team_id = p_team_id 
  AND tm.user_id = p_user_id 
  AND tm.is_active = true 
  AND tm.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.is_team_owner_safe(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams 
    WHERE id = p_team_id AND owner_id = p_user_id
  );
$$;

-- Recreate get_user_teams function for compatibility
CREATE OR REPLACE FUNCTION public.get_user_teams(user_id_param uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT tm.team_id FROM public.team_members tm
  WHERE tm.user_id = user_id_param 
  AND tm.is_active = true 
  AND tm.status = 'active';
$$;

-- Create safe RLS policies for teams
CREATE POLICY "Users can view teams they own or are members of" 
ON public.teams FOR SELECT 
USING (
  owner_id = auth.uid() OR 
  id IN (
    SELECT tm.team_id FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
  )
);

CREATE POLICY "Users can create teams" 
ON public.teams FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update teams" 
ON public.teams FOR UPDATE 
USING (public.is_team_owner_safe(id, auth.uid()));

CREATE POLICY "Team owners can delete teams" 
ON public.teams FOR DELETE 
USING (public.is_team_owner_safe(id, auth.uid()));

-- Create safe RLS policies for team_members (avoiding self-reference)
CREATE POLICY "Users can view team members for accessible teams" 
ON public.team_members FOR SELECT 
USING (
  team_id IN (
    SELECT t.id FROM public.teams t 
    WHERE t.owner_id = auth.uid()
  )
  OR 
  user_id = auth.uid()
);

CREATE POLICY "Team owners and admins can manage team members" 
ON public.team_members FOR ALL 
USING (
  public.is_team_owner_safe(team_id, auth.uid()) OR 
  public.get_user_team_role_level_safe(team_id, auth.uid()) >= 8
);

-- User roles policies
CREATE POLICY "Anyone can view user roles" 
ON public.user_roles FOR SELECT 
USING (true);

-- Team invitations policies  
CREATE POLICY "Team members can view invitations for their teams" 
ON public.team_invitations FOR SELECT 
USING (
  team_id IN (
    SELECT t.id FROM public.teams t 
    WHERE t.owner_id = auth.uid()
  )
);

CREATE POLICY "Team owners and admins can manage invitations" 
ON public.team_invitations FOR ALL 
USING (
  public.is_team_owner_safe(team_id, auth.uid()) OR 
  public.get_user_team_role_level_safe(team_id, auth.uid()) >= 8
);

-- Add triggers for updated_at columns
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();