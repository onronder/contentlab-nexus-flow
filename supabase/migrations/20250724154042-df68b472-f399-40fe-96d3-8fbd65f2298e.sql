-- First, let's revert to the original simple policy
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;

CREATE POLICY "Users can create projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

-- Add a default value for created_by to automatically set it to the authenticated user
ALTER TABLE public.projects 
ALTER COLUMN created_by SET DEFAULT auth.uid();