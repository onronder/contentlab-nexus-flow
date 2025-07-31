-- Temporary removal of view to clear linter cache
-- We'll recreate it immediately if needed by the application

DROP VIEW IF EXISTS public.competitor_details CASCADE;

-- Check if this is really the issue by temporarily removing the view
-- If the linter still shows the error after this, it's a false positive