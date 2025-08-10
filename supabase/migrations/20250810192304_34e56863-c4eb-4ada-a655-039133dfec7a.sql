-- Fix compute_next_run_at reserved keyword issue
create or replace function public.compute_next_run_at(current timestamptz, cadence text, hour int, minute int, tz text)
returns timestamptz as $$
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
$$ language plpgsql security definer set search_path = public;