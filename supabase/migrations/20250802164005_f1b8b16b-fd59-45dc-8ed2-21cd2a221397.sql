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

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Users can view teams they own or are members of" ON public.teams;
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can update teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can delete teams" ON public.teams;

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

-- Drop and recreate team_members policies
DROP POLICY IF EXISTS "Users can view team members for accessible teams" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can manage team members" ON public.team_members;

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

-- Add triggers for updated_at columns (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_teams_updated_at') THEN
    CREATE TRIGGER update_teams_updated_at
      BEFORE UPDATE ON public.teams
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_roles_updated_at') THEN
    CREATE TRIGGER update_user_roles_updated_at
      BEFORE UPDATE ON public.user_roles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_team_invitations_updated_at') THEN
    CREATE TRIGGER update_team_invitations_updated_at
      BEFORE UPDATE ON public.team_invitations
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_team_members_updated_at') THEN
    CREATE TRIGGER update_team_members_updated_at
      BEFORE UPDATE ON public.team_members
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;