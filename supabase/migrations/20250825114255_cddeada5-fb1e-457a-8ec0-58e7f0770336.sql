-- Fix the extension warning by moving pg_net to extensions schema
-- pg_net is used by Supabase for HTTP functions but should be in extensions schema
DO $$ 
BEGIN
  -- Check if pg_net exists in public schema and move it
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    -- Create extensions schema if it doesn't exist
    CREATE SCHEMA IF NOT EXISTS extensions;
    
    -- Move the extension
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  END IF;
END $$;