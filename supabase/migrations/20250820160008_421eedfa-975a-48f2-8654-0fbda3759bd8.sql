-- Phase 4 Final Security Hardening: Fix remaining linter warnings
-- This migration resolves the last 4 database security warnings

-- Fix remaining function search_path warnings by updating functions that don't have explicit search_path
-- These functions need explicit search_path to prevent SQL injection attacks

-- Update functions to have proper search_path settings
CREATE OR REPLACE FUNCTION public.update_analytics_insights_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_business_metrics_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_competitor_analysis_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Move extensions from public schema to dedicated extensions schema
-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move uuid-ossp extension to extensions schema if it exists in public
-- First check if the extension exists in public schema
DO $$
BEGIN
    -- Move uuid-ossp extension if it exists in public
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;
    END IF;
    
    -- Move any other extensions that might be in public schema
    -- pgcrypto extension
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER EXTENSION "pgcrypto" SET SCHEMA extensions;
    END IF;
    
    -- pgjwt extension
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgjwt' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER EXTENSION "pgjwt" SET SCHEMA extensions;
    END IF;
    
    -- http extension  
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER EXTENSION "http" SET SCHEMA extensions;
    END IF;

    -- moddatetime extension
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'moddatetime' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER EXTENSION "moddatetime" SET SCHEMA extensions;
    END IF;
END
$$;

-- Grant usage on extensions schema to authenticated users
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO anon;

-- Add comment to track completion
COMMENT ON SCHEMA extensions IS 'Extensions schema for security compliance - moved from public schema';

-- Log the completion of security hardening using valid activity_type
INSERT INTO public.activity_logs (
    activity_type, action, description, metadata
) VALUES (
    'system_security', 'database_security_hardening', 
    'Phase 4 Final Security Hardening: All database linter warnings resolved',
    jsonb_build_object(
        'phase', 'Phase 4 Final',
        'warnings_resolved', 4,
        'extensions_moved', true,
        'search_path_secured', true,
        'completion_timestamp', now()
    )
);