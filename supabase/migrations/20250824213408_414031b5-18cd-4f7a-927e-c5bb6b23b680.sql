-- More specific fix for extension in public schema warning
-- This creates the extensions schema if it doesn't exist and moves all extensions

DO $$ 
BEGIN
    -- Ensure extensions schema exists
    CREATE SCHEMA IF NOT EXISTS extensions;
    
    -- Grant usage to postgres role
    GRANT USAGE ON SCHEMA extensions TO postgres;
    GRANT USAGE ON SCHEMA extensions TO anon;
    GRANT USAGE ON SCHEMA extensions TO authenticated;
    GRANT USAGE ON SCHEMA extensions TO service_role;
    
    -- Move uuid-ossp extension if it exists in public schema
    IF EXISTS (
        SELECT 1 FROM pg_extension e
        JOIN pg_namespace n ON e.extnamespace = n.oid
        WHERE e.extname = 'uuid-ossp' AND n.nspname = 'public'
    ) THEN
        ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;
        RAISE NOTICE 'Moved uuid-ossp extension from public to extensions schema';
    END IF;
    
    -- Move pgcrypto extension if it exists in public schema  
    IF EXISTS (
        SELECT 1 FROM pg_extension e
        JOIN pg_namespace n ON e.extnamespace = n.oid
        WHERE e.extname = 'pgcrypto' AND n.nspname = 'public'
    ) THEN
        ALTER EXTENSION "pgcrypto" SET SCHEMA extensions;
        RAISE NOTICE 'Moved pgcrypto extension from public to extensions schema';
    END IF;
    
    -- Move any other extensions that might be in public schema
    DECLARE
        ext_record RECORD;
    BEGIN
        FOR ext_record IN 
            SELECT e.extname 
            FROM pg_extension e
            JOIN pg_namespace n ON e.extnamespace = n.oid
            WHERE n.nspname = 'public' 
            AND e.extname NOT IN ('plpgsql') -- Don't move plpgsql as it's core
        LOOP
            EXECUTE 'ALTER EXTENSION "' || ext_record.extname || '" SET SCHEMA extensions';
            RAISE NOTICE 'Moved % extension from public to extensions schema', ext_record.extname;
        END LOOP;
    END;
END $$;