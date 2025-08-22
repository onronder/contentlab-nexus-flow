-- Fix the last security warning: Set search_path for manage_file_versions function
ALTER FUNCTION public.manage_file_versions() SET search_path TO 'public';