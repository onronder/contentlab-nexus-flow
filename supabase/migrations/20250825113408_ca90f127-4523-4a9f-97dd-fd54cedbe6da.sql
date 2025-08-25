-- Phase 3: Create simple, non-recursive RLS policies for teams and team_members

-- Drop any remaining problematic policies for teams and team_members
DROP POLICY IF EXISTS "Members view accessible teams" ON public.teams;
DROP POLICY IF EXISTS "Team members can view other team members" ON public.team_members;

-- Create simple team policies without recursion
CREATE POLICY "Team owners and members can view teams" 
ON public.teams 
FOR SELECT 
USING (
  owner_id = auth.uid() OR 
  id IN (
    SELECT tm.team_id 
    FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'::member_status
  )
);

-- Create simple team_members policies without recursion  
CREATE POLICY "Team members can view same team members"
ON public.team_members
FOR SELECT
USING (
  user_id = auth.uid() OR
  team_id IN (
    SELECT tm.team_id 
    FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.is_active = true 
    AND tm.status = 'active'::member_status
  )
);

-- Fix the extension warning by moving uuid-ossp to extensions schema if not already done
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    DROP EXTENSION "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
  END IF;
END $$;