-- Fix database security warnings from linter

-- Fix function search path mutable warnings by setting search_path
-- Update all functions that don't have proper search_path settings

ALTER FUNCTION public.test_auth_uid() SET search_path TO 'public';
ALTER FUNCTION public.get_user_teams_safe(uuid) SET search_path TO 'public';
ALTER FUNCTION public.increment_generated_report_download(uuid) SET search_path TO 'public';
ALTER FUNCTION public.get_user_accessible_teams(uuid) SET search_path TO 'public';
ALTER FUNCTION public.can_manage_team_resources(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.create_default_team_channel() SET search_path TO 'public';
ALTER FUNCTION public.get_user_projects_safe(uuid) SET search_path TO 'public';
ALTER FUNCTION public.is_team_owner_safe(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.log_team_message_activity() SET search_path TO 'public';
ALTER FUNCTION public.get_user_team_role_level_safe(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.manage_file_versions(uuid, text, jsonb) SET search_path TO 'public';
ALTER FUNCTION public.is_user_system_admin(uuid) SET search_path TO 'public';
ALTER FUNCTION public.is_team_member_safe(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.update_user_presence() SET search_path TO 'public';
ALTER FUNCTION public.update_content_search_vector() SET search_path TO 'public';
ALTER FUNCTION public.update_content_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.update_collaborative_session() SET search_path TO 'public';
ALTER FUNCTION public.trigger_file_processing() SET search_path TO 'public';
ALTER FUNCTION public.update_competitor_analysis_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.update_folder_path() SET search_path TO 'public';
ALTER FUNCTION public.log_content_activity() SET search_path TO 'public';
ALTER FUNCTION public.cleanup_expired_invitations() SET search_path TO 'public';
ALTER FUNCTION public.cleanup_expired_typing_indicators() SET search_path TO 'public';
ALTER FUNCTION public.validate_competitor_data() SET search_path TO 'public';
ALTER FUNCTION public.create_team_invitation(uuid, text, uuid, uuid, text, timestamp with time zone, text, jsonb) SET search_path TO 'public';
ALTER FUNCTION public.accept_team_invitation(text, uuid) SET search_path TO 'public';
ALTER FUNCTION public.decline_team_invitation(text) SET search_path TO 'public';
ALTER FUNCTION public.cancel_team_invitation(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.resend_team_invitation(uuid) SET search_path TO 'public';
ALTER FUNCTION public.get_team_invitations(uuid, jsonb) SET search_path TO 'public';
ALTER FUNCTION public.get_invitation_by_token(text) SET search_path TO 'public';
ALTER FUNCTION public.get_pending_invitations(text) SET search_path TO 'public';
ALTER FUNCTION public.get_invitation_status(text) SET search_path TO 'public';
ALTER FUNCTION public.check_team_membership(uuid, text) SET search_path TO 'public';
ALTER FUNCTION public.get_existing_invitation(uuid, text) SET search_path TO 'public';
ALTER FUNCTION public.update_message_reactions() SET search_path TO 'public';
ALTER FUNCTION public.is_project_owner(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.is_project_team_member(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.is_project_admin_or_manager(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.create_project_secure(text, text, text, text, text, text[], text[], text, text, timestamp with time zone, timestamp with time zone, boolean, boolean, boolean, jsonb, jsonb, text[]) SET search_path TO 'public';
ALTER FUNCTION public.handle_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.can_manage_project_team(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.can_view_project_team(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.update_team_member_count() SET search_path TO 'public';
ALTER FUNCTION public.cleanup_expired_notifications() SET search_path TO 'public';
ALTER FUNCTION public.resolve_comment(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.create_team_with_member_integration(text, text, text, integer, jsonb) SET search_path TO 'public';
ALTER FUNCTION public.log_competitor_changes() SET search_path TO 'public';
ALTER FUNCTION public.update_analytics_insights_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.update_business_metrics_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.calculate_user_engagement_score(uuid, integer) SET search_path TO 'public';
ALTER FUNCTION public.get_user_teams(uuid) SET search_path TO 'public';
ALTER FUNCTION public.compute_next_run_at(timestamp with time zone, text, integer, integer, text) SET search_path TO 'public';
ALTER FUNCTION public.create_default_team_for_user() SET search_path TO 'public';
ALTER FUNCTION public.log_team_activity(uuid, uuid, activity_type, character varying, text, jsonb) SET search_path TO 'public';
ALTER FUNCTION public.apply_settings_automation() SET search_path TO 'public';
ALTER FUNCTION public.is_slug_unique_safe(text, uuid) SET search_path TO 'public';
ALTER FUNCTION public.update_ai_job_queue_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.cleanup_expired_ai_jobs() SET search_path TO 'public';
ALTER FUNCTION public.update_team_billing_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.can_access_team_billing(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.assign_role_permissions(text, text[]) SET search_path TO 'public';
ALTER FUNCTION public.calculate_content_performance_score() SET search_path TO 'public';
ALTER FUNCTION public.get_or_create_user_settings(uuid) SET search_path TO 'public';
ALTER FUNCTION public.get_or_create_project_settings(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.update_settings_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.validate_settings_data(text, jsonb) SET search_path TO 'public';

-- Move extensions out of public schema to extensions schema
-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Check if extensions exist in public schema and move them
DO $$
BEGIN
    -- Move common extensions if they exist in public
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER EXTENSION "pgcrypto" SET SCHEMA extensions;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER EXTENSION "http" SET SCHEMA extensions;
    END IF;
END $$;