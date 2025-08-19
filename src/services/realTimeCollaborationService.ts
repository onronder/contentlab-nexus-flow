/**
 * Real-time collaboration service - replacing mock data with actual database integration
 */

import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface CollaborationSession {
  id: string;
  team_id: string;
  resource_id: string;
  resource_type: string;
  session_name?: string;
  participants: CollaborationParticipant[];
  is_active: boolean;
  session_data: Record<string, any>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CollaborationParticipant {
  user_id: string;
  status: 'online' | 'offline' | 'away';
  current_location?: string;
  cursor_position?: { x: number; y: number };
  last_seen: string;
  profiles?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

export interface CollaborationOperation {
  id: string;
  session_id: string;
  user_id: string;
  operation_type: 'text_change' | 'cursor_move' | 'selection' | 'comment' | 'file_share';
  operation_data: Record<string, any>;
  sequence_number: number;
  acknowledged_by: string[];
  applied_at: string;
}

export interface CollaborationMetrics {
  totalSessions: number;
  activeUsers: number;
  messageCount: number;
  fileShares: number;
  averageSessionDuration: number;
  collaborationScore: number;
  performanceMetrics: {
    latency: number;
    throughput: number;
    errorRate: number;
  };
}

class RealTimeCollaborationService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private sessionCache: Map<string, CollaborationSession> = new Map();

  /**
   * Create a new collaboration session
   */
  async createSession(
    teamId: string,
    resourceId: string,
    resourceType: string,
    sessionName?: string
  ): Promise<CollaborationSession> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    const { data, error } = await supabase
      .from('collaborative_sessions')
      .insert({
        team_id: teamId,
        resource_id: resourceId,
        resource_type: resourceType,
        session_name: sessionName,
        participants: [{ user_id: user.id, status: 'online', last_seen: new Date().toISOString() }],
        is_active: true,
        session_data: {},
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    const session = this.formatSession(data);
    this.sessionCache.set(session.id, session);
    
    return session;
  }

  /**
   * Join an existing collaboration session
   */
  async joinSession(sessionId: string): Promise<CollaborationSession> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    // Get current session
    const { data: sessionData, error: sessionError } = await supabase
      .from('collaborative_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) throw new Error('Session not found');

    // Update participants list
    const participants = Array.isArray(sessionData.participants) ? sessionData.participants : [];
    const existingParticipant = participants.find((p: any) => p.user_id === user.id);
    
    if (existingParticipant && typeof existingParticipant === 'object') {
      (existingParticipant as any).status = 'online';
      (existingParticipant as any).last_seen = new Date().toISOString();
    } else {
      participants.push({
        user_id: user.id,
        status: 'online',
        last_seen: new Date().toISOString()
      });
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from('collaborative_sessions')
      .update({ participants })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) throw updateError;

    const session = this.formatSession(updatedSession);
    this.sessionCache.set(session.id, session);

    return session;
  }

  /**
   * Leave a collaboration session
   */
  async leaveSession(sessionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: sessionData } = await supabase
      .from('collaborative_sessions')
      .select('participants')
      .eq('id', sessionId)
      .single();

    if (sessionData) {
      const participants = Array.isArray(sessionData.participants) ? sessionData.participants : [];
      const updatedParticipants = participants.map((p: any) => 
        p.user_id === user.id 
          ? { ...p, status: 'offline', last_seen: new Date().toISOString() }
          : p
      );

      await supabase
        .from('collaborative_sessions')
        .update({ participants: updatedParticipants })
        .eq('id', sessionId);
    }

    this.sessionCache.delete(sessionId);
  }

  /**
   * Create a collaboration operation
   */
  async createOperation(
    sessionId: string,
    operationType: CollaborationOperation['operation_type'],
    operationData: Record<string, any>
  ): Promise<CollaborationOperation> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    // Get next sequence number
    const { data: lastOp } = await supabase
      .from('collaboration_operations')
      .select('sequence_number')
      .eq('session_id', sessionId)
      .order('sequence_number', { ascending: false })
      .limit(1)
      .single();

    const sequenceNumber = (lastOp?.sequence_number || 0) + 1;

    const { data, error } = await supabase
      .from('collaboration_operations')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        operation_type: operationType,
        operation_data: operationData,
        sequence_number: sequenceNumber,
        acknowledged_by: []
      })
      .select()
      .single();

    if (error) throw error;

    return data as CollaborationOperation;
  }

  /**
   * Get collaboration metrics for a team
   */
  async getCollaborationMetrics(teamId: string, timeRange: number = 7): Promise<CollaborationMetrics> {
    const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000).toISOString();

    // Get session metrics
    const { data: sessions } = await supabase
      .from('collaborative_sessions')
      .select('*')
      .eq('team_id', teamId)
      .gte('created_at', startDate);

    // Get operation metrics
    const { data: operations } = await supabase
      .from('collaboration_operations')
      .select('*')
      .in('session_id', sessions?.map(s => s.id) || [])
      .gte('applied_at', startDate);

    // Get activity metrics
    const { data: activities } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('team_id', teamId)
      .in('activity_type', ['team_management', 'content_activity'])
      .gte('created_at', startDate);

    // Calculate metrics
    const activeSessions = sessions?.filter(s => s.is_active) || [];
    const totalSessions = sessions?.length || 0;
    const activeUsers = activeSessions.reduce((acc, session) => {
      const participantsArray = Array.isArray(session.participants) ? session.participants : [];
      const onlineParticipants = participantsArray.filter((p: any) => p.status === 'online');
      return acc + onlineParticipants.length;
    }, 0);

    const averageDuration = sessions?.reduce((acc, session) => {
      const duration = new Date(session.updated_at).getTime() - new Date(session.created_at).getTime();
      return acc + duration;
    }, 0) / (totalSessions || 1) / (1000 * 60); // Convert to minutes

    const messageCount = operations?.filter(op => op.operation_type === 'text_change').length || 0;
    const fileShares = operations?.filter(op => op.operation_type === 'file_share').length || 0;

    // Calculate collaboration score
    const activityScore = Math.min(100, (activities?.length || 0) * 2);
    const sessionScore = Math.min(100, totalSessions * 5);
    const userScore = Math.min(100, activeUsers * 10);
    const collaborationScore = Math.round((activityScore + sessionScore + userScore) / 3);

    // Calculate performance metrics (simplified for now)
    const performanceMetrics = {
      latency: Math.random() * 200 + 50, // TODO: Replace with real latency tracking
      throughput: operations?.length || 0,
      errorRate: Math.random() * 5 // TODO: Replace with real error tracking
    };

    return {
      totalSessions,
      activeUsers,
      messageCount,
      fileShares,
      averageSessionDuration: Math.round(averageDuration),
      collaborationScore,
      performanceMetrics
    };
  }

  /**
   * Subscribe to real-time updates for a session
   */
  subscribeToSession(sessionId: string, callbacks: {
    onOperationReceived?: (operation: CollaborationOperation) => void;
    onParticipantUpdate?: (session: CollaborationSession) => void;
    onSessionUpdate?: (session: CollaborationSession) => void;
  }): RealtimeChannel {
    const channel = supabase
      .channel(`collaboration:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'collaboration_operations',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        callbacks.onOperationReceived?.(payload.new as CollaborationOperation);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'collaborative_sessions',
        filter: `id=eq.${sessionId}`
      }, (payload) => {
        const session = this.formatSession(payload.new);
        this.sessionCache.set(sessionId, session);
        callbacks.onParticipantUpdate?.(session);
        callbacks.onSessionUpdate?.(session);
      })
      .subscribe();

    this.channels.set(sessionId, channel);
    return channel;
  }

  /**
   * Unsubscribe from session updates
   */
  unsubscribeFromSession(sessionId: string): void {
    const channel = this.channels.get(sessionId);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(sessionId);
    }
  }

  /**
   * Get user's active sessions
   */
  async getUserActiveSessions(userId: string): Promise<CollaborationSession[]> {
    const { data, error } = await supabase
      .from('collaborative_sessions')
      .select('*')
      .contains('participants', [{ user_id: userId }])
      .eq('is_active', true);

    if (error) throw error;

    return (data || []).map(session => this.formatSession(session));
  }

  /**
   * Format session data with participant profiles
   */
  private formatSession(sessionData: any): CollaborationSession {
    return {
      id: sessionData.id,
      team_id: sessionData.team_id,
      resource_id: sessionData.resource_id,
      resource_type: sessionData.resource_type,
      session_name: sessionData.session_name,
      participants: Array.isArray(sessionData.participants) ? sessionData.participants : [],
      is_active: sessionData.is_active,
      session_data: typeof sessionData.session_data === 'object' && sessionData.session_data !== null ? sessionData.session_data : {},
      created_by: sessionData.created_by,
      created_at: sessionData.created_at,
      updated_at: sessionData.updated_at
    };
  }

  /**
   * Update user presence in session
   */
  async updatePresence(
    sessionId: string, 
    location?: string, 
    cursorPosition?: { x: number; y: number }
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: sessionData } = await supabase
      .from('collaborative_sessions')
      .select('participants')
      .eq('id', sessionId)
      .single();

    if (sessionData) {
      const participants = Array.isArray(sessionData.participants) ? sessionData.participants : [];
      const updatedParticipants = participants.map((p: any) => 
        p.user_id === user.id 
          ? { 
              ...p, 
              current_location: location || p.current_location,
              cursor_position: cursorPosition || p.cursor_position,
              last_seen: new Date().toISOString() 
            }
          : p
      );

      await supabase
        .from('collaborative_sessions')
        .update({ participants: updatedParticipants })
        .eq('id', sessionId);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.channels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.sessionCache.clear();
  }
}

export const realTimeCollaborationService = new RealTimeCollaborationService();