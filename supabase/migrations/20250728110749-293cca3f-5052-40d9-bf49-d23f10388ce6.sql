-- List all views with SECURITY DEFINER to identify the issue
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE definition ILIKE '%SECURITY DEFINER%' 
  AND schemaname = 'public';