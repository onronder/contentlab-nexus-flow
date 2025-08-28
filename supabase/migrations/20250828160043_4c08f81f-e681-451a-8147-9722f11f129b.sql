-- Fix function search path security issue by altering existing function
ALTER FUNCTION public.update_updated_at_column() SET search_path TO 'public';