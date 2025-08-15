-- Check current RLS policies on profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- Enable RLS on profiles table if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing overly permissive policies that allow public access
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- Create secure RLS policies for profiles table
-- Policy 1: Users can only view their own profile data
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT 
USING (auth.uid() = id);

-- Policy 2: Users can only insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Policy 3: Users can only update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 4: Users can only delete their own profile
CREATE POLICY "Users can delete own profile" ON public.profiles
FOR DELETE 
USING (auth.uid() = id);

-- Verify the policies are in place
SELECT policyname, cmd, permissive, qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;