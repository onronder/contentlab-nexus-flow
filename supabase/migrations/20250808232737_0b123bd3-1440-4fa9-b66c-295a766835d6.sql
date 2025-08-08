-- Move extensions into the extensions schema
ALTER EXTENSION pg_net SET SCHEMA extensions;
ALTER EXTENSION pg_cron SET SCHEMA extensions;