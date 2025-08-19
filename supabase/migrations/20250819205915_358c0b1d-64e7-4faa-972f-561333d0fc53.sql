-- Fix database security warnings by setting search_path on remaining functions

-- Fix get_user_teams function
CREATE OR REPLACE FUNCTION public.get_user_teams(user_id_param uuid)
 RETURNS TABLE(team_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT tm.team_id FROM public.team_members tm
  WHERE tm.user_id = user_id_param 
  AND tm.is_active = true 
  AND tm.status = 'active';
$function$;

-- Fix is_user_system_admin function 
CREATE OR REPLACE FUNCTION public.is_user_system_admin(user_id_param uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = user_id_param 
    AND tm.is_active = true 
    AND tm.status = 'active'
    AND ur.slug IN ('admin', 'super_admin', 'system_admin')
    AND ur.is_active = true
  );
$function$;

-- Fix compute_next_run_at function
CREATE OR REPLACE FUNCTION public.compute_next_run_at(current timestamp with time zone, cadence text, hour integer, minute integer, tz text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  base_time timestamptz := (date_trunc('day', current at time zone tz) at time zone tz) + make_interval(hours => hour, mins => minute);
  next_time timestamptz;
begin
  if cadence = 'daily' then
    next_time := base_time;
    if next_time <= current then
      next_time := next_time + interval '1 day';
    end if;
  elsif cadence = 'weekly' then
    next_time := base_time;
    if next_time <= current then
      next_time := next_time + interval '7 days';
    end if;
  elsif cadence = 'monthly' then
    next_time := base_time;
    if next_time <= current then
      next_time := (base_time + interval '1 month');
    end if;
  else
    next_time := base_time + interval '1 day';
  end if;
  return next_time;
end;
$function$;

-- Create extensions schema for future use
CREATE SCHEMA IF NOT EXISTS extensions;