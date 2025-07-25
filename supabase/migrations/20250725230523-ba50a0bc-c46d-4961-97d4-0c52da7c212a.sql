-- Create a simple function to test auth.uid() in database context
CREATE OR REPLACE FUNCTION public.test_auth_uid()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT auth.uid();
$function$;