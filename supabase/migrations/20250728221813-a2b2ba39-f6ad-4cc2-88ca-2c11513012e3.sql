-- Fix foreign key relationship between content_items and profiles
ALTER TABLE public.content_items 
ADD CONSTRAINT content_items_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix infinite recursion in content_items RLS policies by simplifying them
DROP POLICY IF EXISTS "Users can view content they own or collaborate on" ON public.content_items;
DROP POLICY IF EXISTS "Users can create content in accessible projects" ON public.content_items;
DROP POLICY IF EXISTS "Users can update their own content or collaborate content" ON public.content_items;
DROP POLICY IF EXISTS "Users can delete their own content" ON public.content_items;

-- Create simpler, non-recursive RLS policies
CREATE POLICY "Users can view their own content or project content" 
ON public.content_items FOR SELECT 
USING (
  user_id = auth.uid() 
  OR project_id IN (
    SELECT p.id FROM projects p 
    WHERE p.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_team_members ptm 
      WHERE ptm.project_id = p.id 
      AND ptm.user_id = auth.uid() 
      AND ptm.invitation_status = 'active'
    )
  )
);

CREATE POLICY "Users can create content in their projects" 
ON public.content_items FOR INSERT 
WITH CHECK (
  user_id = auth.uid() 
  AND project_id IN (
    SELECT p.id FROM projects p 
    WHERE p.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_team_members ptm 
      WHERE ptm.project_id = p.id 
      AND ptm.user_id = auth.uid() 
      AND ptm.role IN ('admin', 'manager', 'editor', 'analyst')
      AND ptm.invitation_status = 'active'
    )
  )
);

CREATE POLICY "Users can update their own content" 
ON public.content_items FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own content" 
ON public.content_items FOR DELETE 
USING (user_id = auth.uid());

-- Fix content_tags policies to avoid recursion
DROP POLICY IF EXISTS "Users can manage tags for accessible content" ON public.content_tags;

CREATE POLICY "Users can manage tags for their content" 
ON public.content_tags FOR ALL 
USING (
  content_id IN (
    SELECT ci.id FROM content_items ci 
    WHERE ci.user_id = auth.uid()
  )
);

-- Fix content_analytics policies
DROP POLICY IF EXISTS "Users can view analytics for accessible content" ON public.content_analytics;

CREATE POLICY "Users can view analytics for their content" 
ON public.content_analytics FOR SELECT 
USING (
  content_id IN (
    SELECT ci.id FROM content_items ci 
    WHERE ci.user_id = auth.uid()
  )
);

-- Fix content_activity_log policies
DROP POLICY IF EXISTS "Users can view activity for accessible content" ON public.content_activity_log;

CREATE POLICY "Users can view activity for their content" 
ON public.content_activity_log FOR SELECT 
USING (
  user_id = auth.uid() 
  OR content_id IN (
    SELECT ci.id FROM content_items ci 
    WHERE ci.user_id = auth.uid()
  )
);