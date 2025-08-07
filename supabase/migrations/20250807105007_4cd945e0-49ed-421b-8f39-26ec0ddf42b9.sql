-- Fix Team Functionality: Add Foreign Key Constraints and Missing Table

-- Step 1: Add missing foreign key constraints to team_members table
ALTER TABLE public.team_members
ADD CONSTRAINT team_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.team_members
ADD CONSTRAINT team_members_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

ALTER TABLE public.team_members
ADD CONSTRAINT team_members_role_id_fkey 
FOREIGN KEY (role_id) REFERENCES public.user_roles(id) ON DELETE RESTRICT;

-- Step 2: Create missing team_activity_logs table
CREATE TABLE public.team_activity_logs (
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

-- Create RLS policies for team_activity_logs
CREATE POLICY "Team members can view team activity logs" 
ON public.team_activity_logs 
FOR SELECT 
USING (
  team_id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "System can create team activity logs" 
ON public.team_activity_logs 
FOR INSERT 
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_team_activity_logs_team_id ON public.team_activity_logs(team_id);
CREATE INDEX idx_team_activity_logs_created_at ON public.team_activity_logs(created_at DESC);