-- Fix security warnings by setting proper search_path for functions

-- Update the session activity function
CREATE OR REPLACE FUNCTION public.update_session_activity()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.last_activity = now();
  RETURN NEW;
END;
$$;

-- Update the cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.user_sessions 
  WHERE expires_at < now();
END;
$$;