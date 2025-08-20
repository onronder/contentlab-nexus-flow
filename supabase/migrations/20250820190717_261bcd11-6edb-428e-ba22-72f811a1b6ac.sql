-- PHASE 1 Continued: Fix RLS Policies and Security Warnings
-- Now fix the problematic RLS policies using the security definer functions

-- Fix team_members policies (remove circular dependencies)
DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view their own team memberships" ON public.team_members;

-- Create non-recursive policies for team_members
CREATE POLICY "Users can view their own team memberships" ON public.team_members
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Team owners can manage all team members" ON public.team_members
  FOR ALL TO authenticated
  USING (public.is_team_owner_safe(team_id, auth.uid()))
  WITH CHECK (public.is_team_owner_safe(team_id, auth.uid()));

CREATE POLICY "Team members can view other team members" ON public.team_members
  FOR SELECT TO authenticated
  USING (team_id IN (SELECT team_id FROM public.get_user_teams_safe(auth.uid())));

-- Fix projects policies to use safe functions
DROP POLICY IF EXISTS "Users can view team projects" ON public.projects;
DROP POLICY IF EXISTS "Project creators can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Team members can view projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view accessible projects" ON public.projects;

CREATE POLICY "Project creators can manage their projects" ON public.projects
  FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view accessible projects" ON public.projects
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() 
    OR id IN (SELECT project_id FROM public.get_user_projects_safe(auth.uid()))
  );

-- Fix content_items policies
DROP POLICY IF EXISTS "Users can view team content and own content" ON public.content_items;
DROP POLICY IF EXISTS "Users can create team content" ON public.content_items;
DROP POLICY IF EXISTS "Users can manage their own content" ON public.content_items;
DROP POLICY IF EXISTS "Users can view team content" ON public.content_items;

CREATE POLICY "Users can manage their own content" ON public.content_items
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view team content" ON public.content_items
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR team_id IN (SELECT team_id FROM public.get_user_teams_safe(auth.uid()))
  );

-- PHASE 2: Fix Function Security Issues (Search Path)
-- Fix the 3 functions that have mutable search paths

-- Fix manage_file_versions function
CREATE OR REPLACE FUNCTION public.manage_file_versions(content_id uuid, action text, version_data jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
  current_version INTEGER;
BEGIN
  -- Get current version
  SELECT COALESCE(MAX((metadata->>'version')::INTEGER), 0) INTO current_version
  FROM content_items WHERE id = content_id;
  
  CASE action
    WHEN 'create_version' THEN
      current_version := current_version + 1;
      UPDATE content_items 
      SET metadata = metadata || jsonb_build_object('version', current_version, 'version_data', version_data)
      WHERE id = content_id;
      
      result := jsonb_build_object('version', current_version, 'action', 'created');
      
    WHEN 'restore_version' THEN
      UPDATE content_items 
      SET metadata = metadata || version_data
      WHERE id = content_id;
      
      result := jsonb_build_object('action', 'restored', 'version', version_data->>'version');
      
    ELSE
      result := jsonb_build_object('error', 'Invalid action');
  END CASE;
  
  RETURN result;
END;
$$;

-- Fix update_folder_path function
CREATE OR REPLACE FUNCTION public.update_folder_path()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update folder path when parent changes
  IF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
    -- Update path based on parent hierarchy
    WITH RECURSIVE folder_path AS (
      SELECT id, name, parent_id, name as path, 1 as level
      FROM content_folders 
      WHERE parent_id IS NULL
      
      UNION ALL
      
      SELECT cf.id, cf.name, cf.parent_id, 
             fp.path || '/' || cf.name as path,
             fp.level + 1
      FROM content_folders cf
      JOIN folder_path fp ON cf.parent_id = fp.id
    )
    UPDATE content_folders 
    SET metadata = COALESCE(metadata, '{}') || jsonb_build_object('full_path', fp.path)
    FROM folder_path fp
    WHERE content_folders.id = fp.id AND content_folders.id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function  
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;