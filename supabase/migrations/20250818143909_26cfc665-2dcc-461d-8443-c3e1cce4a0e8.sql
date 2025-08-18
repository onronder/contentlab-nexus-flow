-- Phase 1.2: Enhanced WebSocket Collaboration Features

-- Add reactions to team messages
ALTER TABLE public.team_messages 
ADD COLUMN reactions jsonb DEFAULT '[]'::jsonb,
ADD COLUMN reply_to_id uuid REFERENCES public.team_messages(id),
ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb,
ADD COLUMN edited_at timestamp with time zone,
ADD COLUMN is_pinned boolean DEFAULT false;

-- Create typing indicators table
CREATE TABLE public.typing_indicators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  channel_id uuid NOT NULL REFERENCES public.team_channels(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '10 seconds')
);

-- Create message reactions table for detailed tracking
CREATE TABLE public.message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.team_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL, -- emoji or reaction name
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create file attachments table
CREATE TABLE public.file_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.team_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_by uuid NOT NULL,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_typing_indicators_channel_user ON public.typing_indicators(channel_id, user_id);
CREATE INDEX idx_typing_indicators_expires_at ON public.typing_indicators(expires_at);
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_message ON public.message_reactions(user_id, message_id);
CREATE INDEX idx_file_attachments_message_id ON public.file_attachments(message_id);
CREATE INDEX idx_team_messages_reply_to ON public.team_messages(reply_to_id);

-- Enable RLS
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for typing_indicators
CREATE POLICY "Team members can view typing indicators"
ON public.typing_indicators FOR SELECT
USING (team_id IN (
  SELECT tm.team_id FROM public.team_members tm
  WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
));

CREATE POLICY "Users can manage their own typing indicators"
ON public.typing_indicators FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS Policies for message_reactions
CREATE POLICY "Team members can view message reactions"
ON public.message_reactions FOR SELECT
USING (message_id IN (
  SELECT tm.id FROM public.team_messages tm
  JOIN public.team_channels tc ON tm.channel_id = tc.id
  WHERE tc.team_id IN (
    SELECT tmem.team_id FROM public.team_members tmem
    WHERE tmem.user_id = auth.uid() AND tmem.is_active = true AND tmem.status = 'active'
  )
));

CREATE POLICY "Team members can create reactions"
ON public.message_reactions FOR INSERT
WITH CHECK (user_id = auth.uid() AND message_id IN (
  SELECT tm.id FROM public.team_messages tm
  JOIN public.team_channels tc ON tm.channel_id = tc.id
  WHERE tc.team_id IN (
    SELECT tmem.team_id FROM public.team_members tmem
    WHERE tmem.user_id = auth.uid() AND tmem.is_active = true AND tmem.status = 'active'
  )
));

CREATE POLICY "Users can delete their own reactions"
ON public.message_reactions FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for file_attachments
CREATE POLICY "Team members can view file attachments"
ON public.file_attachments FOR SELECT
USING (team_id IN (
  SELECT tm.team_id FROM public.team_members tm
  WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
));

CREATE POLICY "Team members can create file attachments"
ON public.file_attachments FOR INSERT
WITH CHECK (uploaded_by = auth.uid() AND team_id IN (
  SELECT tm.team_id FROM public.team_members tm
  WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
));

CREATE POLICY "Uploaders can manage their attachments"
ON public.file_attachments FOR ALL
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

-- Function to cleanup expired typing indicators
CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.typing_indicators 
  WHERE expires_at < now();
END;
$$;

-- Trigger to update team message reactions count
CREATE OR REPLACE FUNCTION update_message_reactions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update the reactions jsonb in team_messages
  UPDATE public.team_messages 
  SET reactions = (
    SELECT jsonb_agg(
      jsonb_build_object(
        'type', reaction_type,
        'count', reaction_count,
        'users', user_ids
      )
    )
    FROM (
      SELECT 
        reaction_type,
        count(*) as reaction_count,
        jsonb_agg(user_id) as user_ids
      FROM public.message_reactions 
      WHERE message_id = COALESCE(NEW.message_id, OLD.message_id)
      GROUP BY reaction_type
    ) grouped_reactions
  )
  WHERE id = COALESCE(NEW.message_id, OLD.message_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for reaction updates
CREATE TRIGGER update_team_message_reactions
AFTER INSERT OR DELETE ON public.message_reactions
FOR EACH ROW
EXECUTE FUNCTION update_message_reactions();