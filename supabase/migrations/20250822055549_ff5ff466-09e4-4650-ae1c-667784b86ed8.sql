-- Fix security warnings: Add search_path to new functions
ALTER FUNCTION public.get_user_teams_direct(UUID) SET search_path TO 'public';
ALTER FUNCTION public.is_team_owner(UUID, UUID) SET search_path TO 'public';
ALTER FUNCTION public.is_team_member(UUID, UUID) SET search_path TO 'public';