-- Move any extensions from public schema to extensions schema
-- This addresses the Supabase linter warning about extensions in public schema

-- Check if extensions schema exists, if not create it
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move uuid-ossp extension from public to extensions if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension 
        WHERE extname = 'uuid-ossp' 
        AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;
    END IF;
END $$;

-- Move any other common extensions that might be in public
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension 
        WHERE extname = 'pgcrypto' 
        AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        ALTER EXTENSION "pgcrypto" SET SCHEMA extensions;
    END IF;
END $$;