-- Fix remaining database security warnings

-- Query to find any remaining extensions in public schema
DO $$
DECLARE
    ext_record RECORD;
BEGIN
    -- Loop through all extensions in public schema and move them
    FOR ext_record IN 
        SELECT e.extname 
        FROM pg_extension e 
        JOIN pg_namespace n ON e.extnamespace = n.oid 
        WHERE n.nspname = 'public'
    LOOP
        -- Create the extensions schema if it doesn't exist
        CREATE SCHEMA IF NOT EXISTS extensions;
        
        -- Move the extension
        EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', ext_record.extname);
        RAISE NOTICE 'Moved extension % from public to extensions schema', ext_record.extname;
    END LOOP;
END $$;

-- Also ensure the extensions schema has proper permissions
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;