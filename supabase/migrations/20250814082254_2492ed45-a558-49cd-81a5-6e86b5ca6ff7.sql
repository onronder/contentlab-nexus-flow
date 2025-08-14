-- Drop existing functions and recreate them properly
DROP FUNCTION IF EXISTS get_user_teams_safe(uuid);
DROP FUNCTION IF EXISTS can_manage_team_resources(uuid, uuid);

-- Create new security definer function with correct parameters
CREATE OR REPLACE FUNCTION get_user_teams_safe(user_uuid uuid)
RETURNS TABLE(team_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT tm.team_id
  FROM team_members tm
  WHERE tm.user_id = user_uuid
  AND tm.is_active = true
  AND tm.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create security definer function to check if user can manage team resources
CREATE OR REPLACE FUNCTION can_manage_team_resources(user_uuid uuid, team_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM teams t
    WHERE t.id = team_uuid
    AND t.owner_id = user_uuid
  ) OR EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN user_roles ur ON tm.role_id = ur.id
    WHERE tm.team_id = team_uuid
    AND tm.user_id = user_uuid
    AND tm.is_active = true
    AND tm.status = 'active'
    AND ur.hierarchy_level >= 8
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fix team_members policies with correct table references
DROP POLICY IF EXISTS "Users can view their own team memberships" ON team_members;
DROP POLICY IF EXISTS "Users can view team members in their teams" ON team_members;
DROP POLICY IF EXISTS "Team owners and admins can manage team members" ON team_members;
DROP POLICY IF EXISTS "Users can insert team memberships when invited" ON team_members;

-- Simple non-recursive policies
CREATE POLICY "Users can view their own team memberships"
ON team_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can view team members in their teams"
ON team_members  
FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT get_user_teams_safe.team_id
    FROM get_user_teams_safe(auth.uid())
  )
);

CREATE POLICY "Team owners and admins can manage team members"
ON team_members
FOR ALL
TO authenticated
USING (can_manage_team_resources(auth.uid(), team_id))
WITH CHECK (can_manage_team_resources(auth.uid(), team_id));

CREATE POLICY "Users can insert team memberships when invited"
ON team_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());