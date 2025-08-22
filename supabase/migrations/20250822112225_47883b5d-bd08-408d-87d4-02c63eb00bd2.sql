-- Fix security warnings: Set search_path for all functions that don't have it
-- This addresses WARN 1: Function Search Path Mutable

-- Update all functions to have proper search_path settings
ALTER FUNCTION public.get_user_teams_safe(UUID) SET search_path TO 'public';
ALTER FUNCTION public.is_team_owner_safe(UUID, UUID) SET search_path TO 'public';
ALTER FUNCTION public.is_team_member_safe(UUID, UUID) SET search_path TO 'public';
ALTER FUNCTION public.get_user_team_role_level_safe(UUID, UUID) SET search_path TO 'public';
ALTER FUNCTION public.can_manage_team_resources(UUID, UUID) SET search_path TO 'public';
ALTER FUNCTION public.get_user_accessible_teams(UUID) SET search_path TO 'public';
ALTER FUNCTION public.get_user_projects_safe(UUID) SET search_path TO 'public';
ALTER FUNCTION public.get_user_team_settings_safe(UUID) SET search_path TO 'public';

-- Note: Extension in Public warning is about system extensions and typically doesn't require immediate action
-- It's a warning about extensions like uuid-ossp being in public schema, which is common and generally safe