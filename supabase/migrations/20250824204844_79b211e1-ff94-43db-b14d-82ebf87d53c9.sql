-- Phase 5: Cleanup - Remove deprecated functions (optional, for full cleanup)
-- Keep the old functions for now to maintain backward compatibility
-- They can be removed in a future release once all code is migrated

-- Add comment to deprecated functions
COMMENT ON FUNCTION public.update_user_last_team(uuid) IS 'DEPRECATED: Use update_user_app_preferences instead';
COMMENT ON FUNCTION public.get_user_last_team() IS 'DEPRECATED: Use get_user_app_preferences instead';