-- Move pg_net extension out of public schema to fix security warning
-- This addresses Supabase linter warning: Extension in Public

-- Drop the extension from public schema if it exists
DROP EXTENSION IF EXISTS pg_net;

-- Create dedicated extensions schema for better security
CREATE SCHEMA IF NOT EXISTS extensions;

-- Install pg_net in the extensions schema instead of public
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions to authenticated users for HTTP requests
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO authenticated;

-- Update any existing functions that might reference pg_net to use the correct schema
-- Most edge functions use Deno's fetch API instead of pg_net, so this is primarily precautionary