-- Add missing RLS policies for tables that have RLS enabled but no policies

-- For teams table (if no policies exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'teams' AND policyname = 'Users can view their teams'
  ) THEN
    CREATE POLICY "Users can view their teams"
      ON public.teams
      FOR SELECT
      USING (
        owner_id = auth.uid() OR
        id IN (
          SELECT team_id FROM public.team_members 
          WHERE user_id = auth.uid() AND is_active = true AND status = 'active'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'teams' AND policyname = 'Users can update their teams'
  ) THEN
    CREATE POLICY "Users can update their teams"
      ON public.teams
      FOR UPDATE
      USING (owner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'teams' AND policyname = 'Users can insert teams'
  ) THEN
    CREATE POLICY "Users can insert teams"
      ON public.teams
      FOR INSERT
      WITH CHECK (owner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'teams' AND policyname = 'Users can delete their teams'
  ) THEN
    CREATE POLICY "Users can delete their teams"
      ON public.teams
      FOR DELETE
      USING (owner_id = auth.uid());
  END IF;
END
$$;

-- For team_channels table (if no policies exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'team_channels' AND policyname = 'Team members can view channels'
  ) THEN
    CREATE POLICY "Team members can view channels"
      ON public.team_channels
      FOR SELECT
      USING (
        team_id IN (
          SELECT team_id FROM public.team_members 
          WHERE user_id = auth.uid() AND is_active = true AND status = 'active'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'team_channels' AND policyname = 'Team admins can manage channels'
  ) THEN
    CREATE POLICY "Team admins can manage channels"
      ON public.team_channels
      FOR ALL
      USING (
        team_id IN (
          SELECT tm.team_id FROM public.team_members tm
          JOIN public.user_roles ur ON tm.role_id = ur.id
          WHERE tm.user_id = auth.uid() 
          AND tm.is_active = true 
          AND tm.status = 'active'
          AND ur.hierarchy_level >= 8
        )
      );
  END IF;
END
$$;

-- For team_messages table (if no policies exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'team_messages' AND policyname = 'Team members can view messages'
  ) THEN
    CREATE POLICY "Team members can view messages"
      ON public.team_messages
      FOR SELECT
      USING (
        channel_id IN (
          SELECT tc.id FROM public.team_channels tc
          JOIN public.team_members tm ON tc.team_id = tm.team_id
          WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'team_messages' AND policyname = 'Team members can send messages'
  ) THEN
    CREATE POLICY "Team members can send messages"
      ON public.team_messages
      FOR INSERT
      WITH CHECK (
        sender_id = auth.uid() AND
        channel_id IN (
          SELECT tc.id FROM public.team_channels tc
          JOIN public.team_members tm ON tc.team_id = tm.team_id
          WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'team_messages' AND policyname = 'Users can update their messages'
  ) THEN
    CREATE POLICY "Users can update their messages"
      ON public.team_messages
      FOR UPDATE
      USING (sender_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'team_messages' AND policyname = 'Users can delete their messages'
  ) THEN
    CREATE POLICY "Users can delete their messages"
      ON public.team_messages
      FOR DELETE
      USING (sender_id = auth.uid());
  END IF;
END
$$;

-- For team_invitations table (if no policies exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'team_invitations' AND policyname = 'Team admins can view invitations'
  ) THEN
    CREATE POLICY "Team admins can view invitations"
      ON public.team_invitations
      FOR SELECT
      USING (
        team_id IN (
          SELECT tm.team_id FROM public.team_members tm
          JOIN public.user_roles ur ON tm.role_id = ur.id
          WHERE tm.user_id = auth.uid() 
          AND tm.is_active = true 
          AND tm.status = 'active'
          AND ur.hierarchy_level >= 8
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'team_invitations' AND policyname = 'Team admins can manage invitations'
  ) THEN
    CREATE POLICY "Team admins can manage invitations"
      ON public.team_invitations
      FOR ALL
      USING (
        team_id IN (
          SELECT tm.team_id FROM public.team_members tm
          JOIN public.user_roles ur ON tm.role_id = ur.id
          WHERE tm.user_id = auth.uid() 
          AND tm.is_active = true 
          AND tm.status = 'active'
          AND ur.hierarchy_level >= 8
        )
      );
  END IF;
END
$$;