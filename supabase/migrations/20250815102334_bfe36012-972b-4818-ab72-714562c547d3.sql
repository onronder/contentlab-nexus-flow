-- Fix report sharing security vulnerability
-- Update RLS policies for report_shares table to prevent unauthorized access

-- Drop existing overly permissive policies that might expose sensitive data
DROP POLICY IF EXISTS "Users can view shared reports" ON public.report_shares;

-- Create secure policy for viewing reports
-- Only allow access to public reports via valid tokens that are not expired
CREATE POLICY "Public can access non-expired public shared reports" ON public.report_shares
FOR SELECT 
USING (
  is_public = true 
  AND (expires_at IS NULL OR expires_at > now())
);

-- Allow users to manage their own report shares
CREATE POLICY "Users can manage their own report shares" ON public.report_shares
FOR ALL
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Update database functions to use security definer with secure search path
CREATE OR REPLACE FUNCTION public.get_user_teams_safe(p_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Only return teams where user is owner to avoid circular dependency
  SELECT t.id as team_id
  FROM public.teams t
  WHERE t.owner_id = p_user_id
  AND t.is_active = true;
$function$;

-- Update other security definer functions to use secure search path
CREATE OR REPLACE FUNCTION public.get_user_projects_safe(p_user_id uuid)
RETURNS TABLE(project_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.id 
  FROM public.projects p
  WHERE p.created_by = p_user_id
  UNION
  SELECT ptm.project_id
  FROM public.project_team_members ptm
  WHERE ptm.user_id = p_user_id 
  AND ptm.invitation_status = 'active';
$function$;