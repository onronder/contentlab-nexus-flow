-- Create WebSocket collaboration tables for real-time features

-- Real-time sessions for tracking active connections
CREATE TABLE IF NOT EXISTS public.websocket_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_id UUID,
  session_id TEXT NOT NULL UNIQUE,
  connection_state JSONB DEFAULT '{}',
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- User presence for real-time collaboration
CREATE TABLE IF NOT EXISTS public.user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_id UUID,
  status TEXT NOT NULL DEFAULT 'online', -- online, away, busy, offline
  current_location TEXT, -- current page/section
  activity_data JSONB DEFAULT '{}', -- cursor position, selected text, etc
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collaborative document sessions
CREATE TABLE IF NOT EXISTS public.collaborative_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL, -- content_item, project, etc
  resource_type TEXT NOT NULL, -- 'content', 'project', 'document'
  team_id UUID NOT NULL,
  created_by UUID NOT NULL,
  session_name TEXT,
  is_active BOOLEAN DEFAULT true,
  participants JSONB DEFAULT '[]', -- array of user IDs
  session_data JSONB DEFAULT '{}', -- document state, operations, etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time operations for collaborative editing
CREATE TABLE IF NOT EXISTS public.collaboration_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.collaborative_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  operation_type TEXT NOT NULL, -- 'insert', 'delete', 'format', 'cursor'
  operation_data JSONB NOT NULL, -- position, content, formatting, etc
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sequence_number INTEGER NOT NULL, -- for operation ordering
  acknowledged_by JSONB DEFAULT '[]' -- array of user IDs who received the operation
);

-- Enable RLS
ALTER TABLE public.websocket_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborative_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_operations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for websocket_sessions
CREATE POLICY "Users can manage their own websocket sessions" ON public.websocket_sessions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Team members can view team websocket sessions" ON public.websocket_sessions
  FOR SELECT USING (
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
    )
  );

-- RLS Policies for user_presence
CREATE POLICY "Users can manage their own presence" ON public.user_presence
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Team members can view team presence" ON public.user_presence
  FOR SELECT USING (
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
    )
  );

-- RLS Policies for collaborative_sessions
CREATE POLICY "Users can create collaborative sessions" ON public.collaborative_sessions
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Team members can view team collaborative sessions" ON public.collaborative_sessions
  FOR SELECT USING (
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
    )
  );

CREATE POLICY "Team members can update team collaborative sessions" ON public.collaborative_sessions
  FOR UPDATE USING (
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm 
      WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
    )
  );

-- RLS Policies for collaboration_operations
CREATE POLICY "Users can create collaboration operations" ON public.collaboration_operations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Session participants can view operations" ON public.collaboration_operations
  FOR SELECT USING (
    session_id IN (
      SELECT cs.id FROM public.collaborative_sessions cs
      WHERE cs.team_id IN (
        SELECT tm.team_id FROM public.team_members tm 
        WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
      )
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_websocket_sessions_user_team ON public.websocket_sessions(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_websocket_sessions_session_id ON public.websocket_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_user_team ON public.user_presence(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON public.user_presence(status, team_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_sessions_resource ON public.collaborative_sessions(resource_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_collaborative_sessions_team ON public.collaborative_sessions(team_id, is_active);
CREATE INDEX IF NOT EXISTS idx_collaboration_operations_session ON public.collaboration_operations(session_id, sequence_number);

-- Functions for real-time collaboration
CREATE OR REPLACE FUNCTION public.update_user_presence()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_collaborative_session()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_presence();

CREATE TRIGGER update_collaborative_session_updated_at
  BEFORE UPDATE ON public.collaborative_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_collaborative_session();

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.websocket_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaborative_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_operations;