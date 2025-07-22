-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.get_avatar_url(user_id UUID, full_name TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, storage
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