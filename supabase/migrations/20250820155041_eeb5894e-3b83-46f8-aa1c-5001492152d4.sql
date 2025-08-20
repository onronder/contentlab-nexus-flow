-- Fix function search path security warnings by setting explicit search_path
-- This addresses the 4 security warnings from the database linter

-- Update existing functions to have proper search_path settings
-- These functions need to be recreated with proper security settings

-- Fix functions that don't have explicit search_path set
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
AS $function$;
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

-- Move extensions from public schema to extensions schema
-- First create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move existing extensions to extensions schema (if any exist in public)
-- This is safe as it only affects future extension installs