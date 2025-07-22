-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Create storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add bio and phone fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN bio TEXT,
ADD COLUMN phone TEXT;

-- Create function to generate default avatar URL
CREATE OR REPLACE FUNCTION public.get_avatar_url(user_id UUID, full_name TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM storage.objects 
      WHERE bucket_id = 'avatars' 
      AND name LIKE user_id::text || '/%'
    ) THEN (
      SELECT 'https://ijvhqqdfthchtittyvnt.supabase.co/storage/v1/object/public/avatars/' || name
      FROM storage.objects 
      WHERE bucket_id = 'avatars' 
      AND name LIKE user_id::text || '/%'
      ORDER BY created_at DESC 
      LIMIT 1
    )
    ELSE 'https://api.dicebear.com/7.x/initials/svg?seed=' || COALESCE(full_name, 'User')
  END;
$$;