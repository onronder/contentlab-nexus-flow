-- Add missing foreign key constraint between project_team_members and profiles
ALTER TABLE public.project_team_members 
ADD CONSTRAINT fk_project_team_members_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;