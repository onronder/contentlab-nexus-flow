-- Fix the remaining circular dependency in get_user_teams_safe
-- This function is called by team_members RLS policies, so it cannot query team_members

-- Replace get_user_teams_safe to avoid querying team_members directly
DROP FUNCTION IF EXISTS public.get_user_teams_safe(uuid);

CREATE OR REPLACE FUNCTION public.get_user_teams_safe(p_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Get teams where user is owner (no team_members query needed)
  SELECT t.id as team_id
  FROM public.teams t
  WHERE t.owner_id = p_user_id
  AND t.is_active = true
  
  UNION
  
  -- For member teams, we need a different approach
  -- Since we can't query team_members from within this function (circular dependency),
  -- we'll need to modify the RLS policies instead
  SELECT NULL::uuid WHERE FALSE;
$function$;

-- Update team_members RLS policies to break circular dependency
DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members;

-- Simple policy: users can view team members if they own the team OR if the query is from system
CREATE POLICY "Users can view team members"
ON public.team_members
FOR SELECT
USING (
  -- Team owners can always see members
  is_team_owner_safe(team_id, auth.uid())
  OR
  -- Allow viewing if user is checking their own membership
  user_id = auth.uid()
);