-- Fix infinite recursion in user_roles RLS policies

-- Step 1: Create security definer function to check if user is system admin
CREATE OR REPLACE FUNCTION public.is_user_system_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = user_id_param 
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.slug IN ('admin', 'super_admin', 'system_admin')
    AND ur.is_active = true
  );
$$;

-- Step 2: Drop existing problematic RLS policies on user_roles
DROP POLICY IF EXISTS "System admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "All authenticated users can view active roles" ON public.user_roles;

-- Step 3: Create new RLS policies using the security definer function
CREATE POLICY "All authenticated users can view active roles" 
ON public.user_roles 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "System admins can manage roles" 
ON public.user_roles 
FOR ALL 
USING (public.is_user_system_admin(auth.uid()));

-- Step 4: Also create a simplified function for team membership checks to prevent other recursions
CREATE OR REPLACE FUNCTION public.is_team_member_safe(team_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team_id_param 
    AND tm.user_id = user_id_param 
    AND tm.is_active = true 
    AND tm.status = 'active'
  );
$$;