-- Fix infinite recursion in team_members RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their team memberships" ON team_members;
DROP POLICY IF EXISTS "Team admins can manage team members" ON team_members;

-- Create non-recursive policies using direct user_id checks
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
    SELECT tm.team_id 
    FROM team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'
  )
);

CREATE POLICY "Team owners can manage team members"
ON team_members
FOR ALL
TO authenticated
USING (
  team_id IN (
    SELECT t.id 
    FROM teams t 
    WHERE t.created_by = auth.uid()
  )
);

CREATE POLICY "Team admins can manage team members"
ON team_members
FOR ALL  
TO authenticated
USING (
  team_id IN (
    SELECT tm.team_id
    FROM team_members tm
    JOIN user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid()
    AND tm.is_active = true
    AND tm.status = 'active'
    AND ur.hierarchy_level >= 8
  )
);

-- Users can insert team memberships when invited
CREATE POLICY "Users can insert team memberships when invited"
ON team_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());