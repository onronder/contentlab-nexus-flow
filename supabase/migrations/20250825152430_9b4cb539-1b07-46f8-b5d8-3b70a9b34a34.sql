-- Complete nuclear reset - drop the recursive policies I just created
DROP POLICY IF EXISTS "Team members can view their teams" ON public.teams;
DROP POLICY IF EXISTS "Team members can view team member list" ON public.team_members;

-- Create absolutely minimal policies with NO subqueries or cross-table references
-- Teams: Only owners can see/manage their own teams
CREATE POLICY "Owners only can manage teams"
ON public.teams
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Team members: Only users can see/manage their own memberships
CREATE POLICY "Users manage own memberships"
ON public.team_members
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create security definer functions to handle complex access patterns without RLS recursion
CREATE OR REPLACE FUNCTION public.get_accessible_teams(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  description text,
  owner_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  team_type text,
  is_active boolean,
  current_member_count integer,
  member_limit integer,
  settings jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
  -- Get teams where user is owner
  SELECT t.id, t.name, t.slug, t.description, t.owner_id, t.created_at, t.updated_at, 
         t.team_type::text, t.is_active, t.current_member_count, t.member_limit, t.settings
  FROM teams t
  WHERE t.owner_id = p_user_id
  AND t.is_active = true
  
  UNION
  
  -- Get teams where user is a member
  SELECT t.id, t.name, t.slug, t.description, t.owner_id, t.created_at, t.updated_at,
         t.team_type::text, t.is_active, t.current_member_count, t.member_limit, t.settings
  FROM teams t
  JOIN team_members tm ON t.id = tm.team_id
  WHERE tm.user_id = p_user_id
  AND tm.is_active = true
  AND tm.status = 'active'::member_status
  AND t.is_active = true;
$$;