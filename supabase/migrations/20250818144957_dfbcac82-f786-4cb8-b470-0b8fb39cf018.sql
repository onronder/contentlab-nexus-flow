-- Fix typing indicators foreign key relationship
-- Add proper foreign key constraint to link typing_indicators with profiles
ALTER TABLE public.typing_indicators 
ADD CONSTRAINT fk_typing_indicators_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;