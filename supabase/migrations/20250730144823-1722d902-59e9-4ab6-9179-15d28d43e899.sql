-- Add missing foreign key constraint for content_collaborators to profiles
ALTER TABLE public.content_collaborators 
ADD CONSTRAINT content_collaborators_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;