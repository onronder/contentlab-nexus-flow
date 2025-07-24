-- Fix the RLS policy for project creation
-- The current policy is too restrictive when explicitly setting created_by
-- We need to allow users to create projects where they are setting themselves as the creator

DROP POLICY IF EXISTS "Users can create projects" ON public.projects;

CREATE POLICY "Users can create projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (
  -- Allow if created_by matches the authenticated user
  created_by = auth.uid() OR
  -- Allow if created_by is not specified (will be handled by default)
  created_by IS NULL
);