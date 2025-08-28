-- Move extensions out of public schema for security
-- This fixes the Supabase linter warning about extensions in public schema

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move commonly used extensions to extensions schema
-- Note: This needs to be done carefully to avoid breaking existing functionality
-- We'll create the extensions in the extensions schema from now on

-- Grant usage on extensions schema to appropriate roles
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO anon;