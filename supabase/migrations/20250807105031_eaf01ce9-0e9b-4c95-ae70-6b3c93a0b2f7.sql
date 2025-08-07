-- Fix Team Functionality: Add Missing Foreign Key Constraints and Create Missing Table

-- Step 1: Add missing foreign key constraints (only if they don't exist)
-- Add user_id constraint to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'team_members_user_id_fkey' 
                   AND table_name = 'team_members') THEN
        ALTER TABLE public.team_members
        ADD CONSTRAINT team_members_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add role_id constraint to user_roles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'team_members_role_id_fkey' 
                   AND table_name = 'team_members') THEN
        ALTER TABLE public.team_members
        ADD CONSTRAINT team_members_role_id_fkey 
        FOREIGN KEY (role_id) REFERENCES public.user_roles(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- Step 2: Create missing team_activity_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.team_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on team_activity_logs
ALTER TABLE public.team_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for team_activity_logs (drop first if exists)
DROP POLICY IF EXISTS "Team members can view team activity logs" ON public.team_activity_logs;
CREATE POLICY "Team members can view team activity logs" 
ON public.team_activity_logs 
FOR SELECT 
USING (
  team_id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

DROP POLICY IF EXISTS "System can create team activity logs" ON public.team_activity_logs;
CREATE POLICY "System can create team activity logs" 
ON public.team_activity_logs 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_team_activity_logs_team_id ON public.team_activity_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_logs_created_at ON public.team_activity_logs(created_at DESC);