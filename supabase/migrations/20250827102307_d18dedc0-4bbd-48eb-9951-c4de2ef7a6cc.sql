-- Phase 1: Fix Content Team Relationship Data Integrity (Corrected)

-- 1. Add database trigger to automatically set team_id on content items
CREATE OR REPLACE FUNCTION public.set_content_team_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Get team_id from the project
  SELECT p.team_id INTO NEW.team_id
  FROM public.projects p
  WHERE p.id = NEW.project_id;
  
  -- Ensure we have a team_id
  IF NEW.team_id IS NULL THEN
    RAISE EXCEPTION 'Project must belong to a team before content can be created';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Create trigger for content_items
DROP TRIGGER IF EXISTS trigger_set_content_team_id ON public.content_items;
CREATE TRIGGER trigger_set_content_team_id
  BEFORE INSERT OR UPDATE ON public.content_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_content_team_id();

-- 3. Fix existing content items to have correct team_id
UPDATE public.content_items 
SET team_id = p.team_id
FROM public.projects p
WHERE content_items.project_id = p.id
AND (content_items.team_id IS NULL OR content_items.team_id != p.team_id);

-- 4. Enhanced RLS Policies for Content Team Access

-- Drop existing content policies
DROP POLICY IF EXISTS "Users can delete their own content" ON public.content_items;
DROP POLICY IF EXISTS "Users can manage their own content" ON public.content_items;
DROP POLICY IF EXISTS "Users can update their own content" ON public.content_items;

-- Create comprehensive team-aware content policies
CREATE POLICY "Team members can view team content"
ON public.content_items
FOR SELECT
USING (
  team_id IN (
    SELECT tm.team_id
    FROM team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.is_active = true
    AND tm.status = 'active'::member_status
  )
);

CREATE POLICY "Team members can create content for team projects"
ON public.content_items
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND project_id IN (
    SELECT p.id
    FROM projects p
    JOIN team_members tm ON p.team_id = tm.team_id
    WHERE tm.user_id = auth.uid()
    AND tm.is_active = true
    AND tm.status = 'active'::member_status
  )
);

CREATE POLICY "Content owners and team managers can update content"
ON public.content_items
FOR UPDATE
USING (
  user_id = auth.uid()
  OR team_id IN (
    SELECT tm.team_id
    FROM team_members tm
    JOIN user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid()
    AND tm.is_active = true
    AND tm.status = 'active'::member_status
    AND ur.hierarchy_level >= 6  -- managers and above
  )
);

CREATE POLICY "Content owners and team managers can delete content"
ON public.content_items
FOR DELETE
USING (
  user_id = auth.uid()
  OR team_id IN (
    SELECT tm.team_id
    FROM team_members tm
    JOIN user_roles ur ON tm.role_id = ur.id
    WHERE tm.user_id = auth.uid()
    AND tm.is_active = true
    AND tm.status = 'active'::member_status
    AND ur.hierarchy_level >= 8  -- admin level for deletion
  )
);

-- 5. Create validation trigger instead of check constraint
CREATE OR REPLACE FUNCTION public.validate_content_team_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  project_team_id UUID;
BEGIN
  -- Get the team_id from the project
  SELECT team_id INTO project_team_id
  FROM public.projects
  WHERE id = NEW.project_id;
  
  -- Validate that content team_id matches project team_id
  IF NEW.team_id IS DISTINCT FROM project_team_id THEN
    RAISE EXCEPTION 'Content team_id (%) must match project team_id (%)', NEW.team_id, project_team_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create validation trigger
DROP TRIGGER IF EXISTS trigger_validate_content_team_consistency ON public.content_items;
CREATE TRIGGER trigger_validate_content_team_consistency
  BEFORE INSERT OR UPDATE ON public.content_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_content_team_consistency();

-- 6. Enhance content analytics RLS for team context
DROP POLICY IF EXISTS "Users can view analytics for their content" ON public.content_analytics;

CREATE POLICY "Team members can view team content analytics"
ON public.content_analytics
FOR SELECT
USING (
  content_id IN (
    SELECT ci.id
    FROM content_items ci
    JOIN team_members tm ON ci.team_id = tm.team_id
    WHERE tm.user_id = auth.uid()
    AND tm.is_active = true
    AND tm.status = 'active'::member_status
  )
);

-- 7. Create helper function for team content validation
CREATE OR REPLACE FUNCTION public.user_can_access_team_content(p_content_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM content_items ci
    JOIN team_members tm ON ci.team_id = tm.team_id
    WHERE ci.id = p_content_id
    AND tm.user_id = p_user_id
    AND tm.is_active = true
    AND tm.status = 'active'::member_status
  );
$function$;