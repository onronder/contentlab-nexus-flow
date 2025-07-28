-- Check for any security definer views that may have been created
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE definition ILIKE '%security definer%';