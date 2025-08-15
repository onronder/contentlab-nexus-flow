-- CRITICAL SECURITY FIX: Implement proper RLS policies for sensitive system tables
-- Fix 5 critical security errors identified in security scan

-- Fix 1: System Health Status - restrict to system administrators only
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_health_status') THEN
    DROP POLICY IF EXISTS "Authenticated users can view system health status" ON public.system_health_status;
    DROP POLICY IF EXISTS "Public can view system health status" ON public.system_health_status;
    
    CREATE POLICY "System administrators can view health status" ON public.system_health_status
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM team_members tm 
          JOIN user_roles ur ON tm.role_id = ur.id
          WHERE tm.user_id = auth.uid() 
          AND tm.is_active = true 
          AND tm.status = 'active'
          AND ur.slug IN ('admin', 'super_admin', 'system_admin')
        ) OR
        is_user_system_admin(auth.uid())
      );
  END IF;
END $$;

-- Fix 2: Cache Statistics - restrict to developers and system administrators
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cache_statistics') THEN
    DROP POLICY IF EXISTS "Authenticated users can view cache statistics" ON public.cache_statistics;
    DROP POLICY IF EXISTS "Public can view cache statistics" ON public.cache_statistics;
    
    CREATE POLICY "System administrators can view cache statistics" ON public.cache_statistics
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM team_members tm 
          JOIN user_roles ur ON tm.role_id = ur.id
          WHERE tm.user_id = auth.uid() 
          AND tm.is_active = true 
          AND tm.status = 'active'
          AND ur.slug IN ('admin', 'super_admin', 'system_admin', 'developer')
        ) OR
        is_user_system_admin(auth.uid())
      );
  END IF;
END $$;

-- Fix 3: Settings Validation Rules - restrict to settings administrators
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings_validation_rules') THEN
    DROP POLICY IF EXISTS "Authenticated users can view settings validation rules" ON public.settings_validation_rules;
    DROP POLICY IF EXISTS "Public can view settings validation rules" ON public.settings_validation_rules;
    
    CREATE POLICY "Settings administrators can view validation rules" ON public.settings_validation_rules
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM team_members tm 
          JOIN user_roles ur ON tm.role_id = ur.id
          WHERE tm.user_id = auth.uid() 
          AND tm.is_active = true 
          AND tm.status = 'active'
          AND ur.slug IN ('admin', 'super_admin', 'settings_admin')
          AND ur.hierarchy_level >= 8
        ) OR
        is_user_system_admin(auth.uid())
      );
  END IF;
END $$;

-- Fix 4: Permissions - restrict to permission administrators
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
    DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.permissions;
    DROP POLICY IF EXISTS "Public can view permissions" ON public.permissions;
    
    CREATE POLICY "Permission administrators can view permissions" ON public.permissions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM team_members tm 
          JOIN user_roles ur ON tm.role_id = ur.id
          WHERE tm.user_id = auth.uid() 
          AND tm.is_active = true 
          AND tm.status = 'active'
          AND ur.slug IN ('admin', 'super_admin', 'permission_admin')
          AND ur.hierarchy_level >= 8
        ) OR
        is_user_system_admin(auth.uid())
      );
  END IF;
END $$;

-- Fix 5: Role Permissions - restrict to role administrators  
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
    DROP POLICY IF EXISTS "Anyone can view role permissions" ON public.role_permissions;
    DROP POLICY IF EXISTS "Public can view role permissions" ON public.role_permissions;
    
    CREATE POLICY "Role administrators can view role permissions" ON public.role_permissions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM team_members tm 
          JOIN user_roles ur ON tm.role_id = ur.id
          WHERE tm.user_id = auth.uid() 
          AND tm.is_active = true 
          AND tm.status = 'active'
          AND ur.slug IN ('admin', 'super_admin', 'role_admin', 'permission_admin')
          AND ur.hierarchy_level >= 8
        ) OR
        is_user_system_admin(auth.uid())
      );
  END IF;
END $$;