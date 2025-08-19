-- Create session_recordings table for collaboration session playback
CREATE TABLE public.session_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.collaborative_sessions(id) ON DELETE CASCADE,
  recording_name TEXT,
  recorded_by UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  file_path TEXT,
  file_size BIGINT,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_recordings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Team members can view team session recordings"
ON public.session_recordings FOR SELECT
USING (
  session_id IN (
    SELECT cs.id 
    FROM public.collaborative_sessions cs
    WHERE cs.team_id IN (
      SELECT tm.team_id 
      FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND tm.status = 'active'
    )
  )
);

CREATE POLICY "Users can create session recordings"
ON public.session_recordings FOR INSERT
WITH CHECK (recorded_by = auth.uid());

CREATE POLICY "Recorded by user can update their recordings"
ON public.session_recordings FOR UPDATE
USING (recorded_by = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_session_recordings_updated_at
  BEFORE UPDATE ON public.session_recordings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();