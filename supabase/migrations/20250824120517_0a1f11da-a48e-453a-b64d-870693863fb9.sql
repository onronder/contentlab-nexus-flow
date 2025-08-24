-- Add last_team_id column to profiles table for server-side team persistence
ALTER TABLE public.profiles 
ADD COLUMN last_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Create function to update user's last team
CREATE OR REPLACE FUNCTION public.update_user_last_team(p_team_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Verify user has access to the team
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = p_team_id 
    AND tm.user_id = auth.uid()
    AND tm.is_active = true
    AND tm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'User does not have access to this team';
  END IF;
  
  -- Update user's last team
  UPDATE public.profiles 
  SET last_team_id = p_team_id 
  WHERE id = auth.uid();
END;
$function$;

-- Create function to get user's last team
CREATE OR REPLACE FUNCTION public.get_user_last_team()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT last_team_id 
  FROM public.profiles 
  WHERE id = auth.uid();
$function$;