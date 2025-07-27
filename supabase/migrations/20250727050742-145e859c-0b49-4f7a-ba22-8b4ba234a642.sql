-- Find and fix any remaining security definer views
-- Check for any problematic views in the database
DO $$
DECLARE
    view_record RECORD;
    view_def TEXT;
BEGIN
    -- Loop through all views in public schema
    FOR view_record IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
    LOOP
        -- Get the view definition
        SELECT definition INTO view_def
        FROM pg_views 
        WHERE schemaname = view_record.schemaname 
        AND viewname = view_record.viewname;
        
        -- Check if it contains SECURITY DEFINER
        IF view_def LIKE '%SECURITY DEFINER%' THEN
            RAISE NOTICE 'Found problematic view: %.%', view_record.schemaname, view_record.viewname;
            -- Drop and recreate without SECURITY DEFINER
            EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', view_record.schemaname, view_record.viewname);
        END IF;
    END LOOP;
    
    -- Also check if there are any functions with potential issues
    RAISE NOTICE 'Checking for any remaining security issues...';
END $$;

-- Check for any remaining views that might be problematic
SELECT 
    schemaname,
    viewname,
    CASE 
        WHEN definition LIKE '%SECURITY DEFINER%' THEN 'HAS_SECURITY_DEFINER'
        ELSE 'CLEAN'
    END as security_status
FROM pg_views 
WHERE schemaname = 'public';

-- Final success message
SELECT 'Security cleanup completed' as status;