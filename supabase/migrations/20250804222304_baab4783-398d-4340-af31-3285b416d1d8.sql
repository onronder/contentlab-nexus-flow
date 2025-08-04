-- Create team_channels table for organized team conversations
CREATE TABLE public.team_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  channel_type TEXT NOT NULL DEFAULT 'general' CHECK (channel_type IN ('general', 'project', 'direct', 'announcement')),
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  is_archived BOOLEAN DEFAULT false
);

-- Create team_messages table for real-time chat
CREATE TABLE public.team_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.team_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'mention', 'system')),
  reply_to_id UUID REFERENCES public.team_messages(id),
  mentions JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  reactions JSONB DEFAULT '{}',
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Create team_message_reads table for tracking read status
CREATE TABLE public.team_message_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.team_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Create enhanced_notifications table for improved team notifications
CREATE TABLE public.enhanced_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL,
  sender_id UUID,
  team_id UUID,
  channel_id UUID REFERENCES public.team_channels(id),
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'mention', 'message', 'task', 'project', 'system')),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  delivery_channels JSONB DEFAULT '{"in_app": true, "email": false, "push": false}',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.team_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enhanced_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_channels
CREATE POLICY "Team members can view channels" ON public.team_channels
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND is_active = true AND status = 'active'
    )
  );

CREATE POLICY "Team admins can manage channels" ON public.team_channels
  FOR ALL USING (
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm
      JOIN public.user_roles ur ON tm.role_id = ur.id
      WHERE tm.user_id = auth.uid() AND tm.is_active = true 
      AND tm.status = 'active' AND ur.hierarchy_level >= 6
    )
  );

-- RLS Policies for team_messages
CREATE POLICY "Team members can view messages in accessible channels" ON public.team_messages
  FOR SELECT USING (
    channel_id IN (
      SELECT tc.id FROM public.team_channels tc
      JOIN public.team_members tm ON tc.team_id = tm.team_id
      WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
    )
  );

CREATE POLICY "Team members can create messages" ON public.team_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    channel_id IN (
      SELECT tc.id FROM public.team_channels tc
      JOIN public.team_members tm ON tc.team_id = tm.team_id
      WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
    )
  );

CREATE POLICY "Users can update their own messages" ON public.team_messages
  FOR UPDATE USING (sender_id = auth.uid());

-- RLS Policies for team_message_reads
CREATE POLICY "Users can manage their own read status" ON public.team_message_reads
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for enhanced_notifications
CREATE POLICY "Users can view their notifications" ON public.enhanced_notifications
  FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON public.enhanced_notifications
  FOR UPDATE USING (recipient_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.enhanced_notifications
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_team_channels_team_id ON public.team_channels(team_id);
CREATE INDEX idx_team_messages_channel_id ON public.team_messages(channel_id);
CREATE INDEX idx_team_messages_sender_id ON public.team_messages(sender_id);
CREATE INDEX idx_team_messages_created_at ON public.team_messages(created_at DESC);
CREATE INDEX idx_team_message_reads_user_id ON public.team_message_reads(user_id);
CREATE INDEX idx_enhanced_notifications_recipient_id ON public.enhanced_notifications(recipient_id);
CREATE INDEX idx_enhanced_notifications_created_at ON public.enhanced_notifications(created_at DESC);

-- Create triggers for updated_at
CREATE TRIGGER update_team_channels_updated_at
  BEFORE UPDATE ON public.team_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_messages_updated_at
  BEFORE UPDATE ON public.team_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create default team channel
CREATE OR REPLACE FUNCTION public.create_default_team_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create general channel for new team
  INSERT INTO public.team_channels (team_id, name, description, channel_type, created_by)
  VALUES (
    NEW.id,
    'general',
    'General team discussion',
    'general',
    NEW.owner_id
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to create default channel when team is created
CREATE TRIGGER create_default_channel_on_team_creation
  AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.create_default_team_channel();

-- Function to log team message activity
CREATE OR REPLACE FUNCTION public.log_team_message_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  channel_team_id UUID;
  activity_description TEXT;
BEGIN
  -- Get team_id from channel
  SELECT team_id INTO channel_team_id 
  FROM public.team_channels 
  WHERE id = NEW.channel_id;
  
  IF TG_OP = 'INSERT' THEN
    activity_description := 'New message posted in team chat';
    
    -- Log activity
    INSERT INTO public.activity_logs (
      team_id, user_id, activity_type, action, description, metadata
    ) VALUES (
      channel_team_id, NEW.sender_id, 'communication', 'message_posted', 
      activity_description,
      jsonb_build_object(
        'channel_id', NEW.channel_id,
        'message_id', NEW.id,
        'message_type', NEW.message_type
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to log message activity
CREATE TRIGGER log_message_activity
  AFTER INSERT ON public.team_messages
  FOR EACH ROW EXECUTE FUNCTION public.log_team_message_activity();