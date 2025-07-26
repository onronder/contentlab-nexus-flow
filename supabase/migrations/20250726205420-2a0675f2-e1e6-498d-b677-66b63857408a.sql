-- Critical Migration: Fix create_project_secure Function Overloading Conflict
-- This resolves data loss issue where only basic fields were being saved

-- Step 1: Drop the old 6-parameter function that's causing conflicts
DROP FUNCTION IF EXISTS public.create_project_secure(
  text, text, text, text, text, text
) CASCADE;

-- Step 2: Verify the enhanced 17-parameter function still exists and is intact
-- (This should already exist from previous migration - just confirming it's there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_project_secure' 
    AND pronargs = 17
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE EXCEPTION 'Enhanced create_project_secure function with 17 parameters not found - migration aborted';
  END IF;
END $$;

-- Step 3: Validation - Ensure only one create_project_secure function exists
DO $$
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM pg_proc 
  WHERE proname = 'create_project_secure' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  IF function_count != 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 create_project_secure function, found %', function_count;
  END IF;
  
  RAISE NOTICE 'SUCCESS: Function conflict resolved. Only enhanced create_project_secure function remains.';
END $$;