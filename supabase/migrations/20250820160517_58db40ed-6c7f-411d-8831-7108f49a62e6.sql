-- Phase 4 Final Security Hardening: Fix remaining linter warnings
-- This migration resolves the last 4 database security warnings

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

-- Create extensions schema for security compliance
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move extensions from public schema to extensions schema
DO $$
BEGIN
    -- Move uuid-ossp extension if it exists in public
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;
    END IF;
    
    -- Move pgcrypto extension if it exists in public
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER EXTENSION "pgcrypto" SET SCHEMA extensions;
    END IF;
    
    -- Move pgjwt extension if it exists in public
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgjwt' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER EXTENSION "pgjwt" SET SCHEMA extensions;
    END IF;
    
    -- Move http extension if it exists in public
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER EXTENSION "http" SET SCHEMA extensions;
    END IF;

    -- Move moddatetime extension if it exists in public
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'moddatetime' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER EXTENSION "moddatetime" SET SCHEMA extensions;
    END IF;
END
$$;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO anon;

-- Add comment to track completion
COMMENT ON SCHEMA extensions IS 'Extensions schema for security compliance - moved from public schema';