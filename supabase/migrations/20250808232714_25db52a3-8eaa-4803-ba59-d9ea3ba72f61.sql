-- Move extensions to the extensions schema to satisfy security best practices
alter extension if exists pg_net set schema extensions;
alter extension if exists pg_cron set schema extensions;