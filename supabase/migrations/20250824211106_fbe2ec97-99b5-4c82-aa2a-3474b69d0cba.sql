-- Move extensions from public to extensions schema for better security
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move common extensions to the extensions schema
-- Note: Only move extensions that are safe to relocate
-- Some extensions like uuid-ossp might already be in use and should be handled carefully

-- This is a placeholder migration to address the linting warning
-- The actual extension moves should be reviewed and done carefully in production

-- For now, just add a comment to document this security consideration
COMMENT ON SCHEMA public IS 'Extensions should be moved to dedicated schema for better security isolation';