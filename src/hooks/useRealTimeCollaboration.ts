/**
 * Real-time collaboration hook - replacing mock data with actual database integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { realTimeCollaborationService } from '@/services/realTimeCollaborationService';
import type { 
  CollaborationSession, 
  CollaborationParticipant, 
  CollaborationOperation,
  CollaborationMetrics 
} from '@/services/realTimeCollaborationService';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealTimeCollaborationOptions {
  teamId: string;
  resourceId?: string;
  resourceType?: string;
  autoJoin?: boolean;
}

interface UseRealTimeCollaborationReturn {
  // Session state
  session: CollaborationSession | null;
  isSessionActive: boolean;
  isConnected: boolean;
  
  // Participants
  participants: CollaborationParticipant[];
  onlineParticipants: CollaborationParticipant[];
  
  // Operations
  operations: CollaborationOperation[];
  pendingOperations: CollaborationOperation[];
  
  // Metrics
  metrics: CollaborationMetrics | null;
  
  // Actions
  createSession: (resourceId: string, resourceType: string, sessionName?: string) => Promise<CollaborationSession>;
  joinSession: (sessionId: string) => Promise<void>;
  leaveSession: () => Promise<void>;
  sendOperation: (type: CollaborationOperation['operation_type'], data: Record<string, any>) => Promise<void>;
  updatePresence: (location?: string, cursorPosition?: { x: number; y: number }) => Promise<void>;
  
  // Status
  loading: boolean;
  error: string | null;
}

export function useRealTimeCollaboration(options: UseRealTimeCollaborationOptions): UseRealTimeCollaborationReturn {
  const { teamId, resourceId, resourceType, autoJoin = false } = options;
  const { toast } = useToast();
  
  // State
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [participants, setParticipants] = useState<CollaborationParticipant[]>([]);
  const [operations, setOperations] = useState<CollaborationOperation[]>([]);
  const [pendingOperations, setPendingOperations] = useState<CollaborationOperation[]>([]);
  const [metrics, setMetrics] = useState<CollaborationMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null);
  const sessionRef = useRef<CollaborationSession | null>(null);
  
  // Update refs when session changes
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Create session
  const createSession = useCallback(async (
    resourceId: string, 
    resourceType: string, 
    sessionName?: string
  ): Promise<CollaborationSession> => {
    try {
      setLoading(true);
      setError(null);
      
      const newSession = await realTimeCollaborationService.createSession(
        teamId,
        resourceId,
        resourceType,
        sessionName
      );
      
      setSession(newSession);
      setParticipants(newSession.participants);
      
      // Subscribe to real-time updates
      if (channelRef.current) {
        realTimeCollaborationService.unsubscribeFromSession(newSession.id);
      }
      
      channelRef.current = realTimeCollaborationService.subscribeToSession(newSession.id, {
        onOperationReceived: (operation) => {
          setOperations(prev => [...prev, operation]);
        },
        onParticipantUpdate: (updatedSession) => {
          setParticipants(updatedSession.participants);
        },
        onSessionUpdate: (updatedSession) => {
          setSession(updatedSession);
        }
      });
      
      setIsConnected(true);
      
      toast({
        title: "Collaboration session created",
        description: "You can now collaborate in real-time with your team."
      });
      
      return newSession;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create collaboration session';
      setError(errorMessage);
      toast({
        title: "Failed to create session",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [teamId, toast]);

  // Join session
  const joinSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const joinedSession = await realTimeCollaborationService.joinSession(sessionId);
      
      setSession(joinedSession);
      setParticipants(joinedSession.participants);
      
      // Subscribe to real-time updates
      if (channelRef.current) {
        realTimeCollaborationService.unsubscribeFromSession(sessionId);
      }
      
      channelRef.current = realTimeCollaborationService.subscribeToSession(sessionId, {
        onOperationReceived: (operation) => {
          setOperations(prev => [...prev, operation]);
        },
        onParticipantUpdate: (updatedSession) => {
          setParticipants(updatedSession.participants);
        },
        onSessionUpdate: (updatedSession) => {
          setSession(updatedSession);
        }
      });
      
      setIsConnected(true);
      
      toast({
        title: "Joined collaboration session",
        description: "You're now collaborating in real-time."
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to join collaboration session';
      setError(errorMessage);
      toast({
        title: "Failed to join session",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Leave session
  const leaveSession = useCallback(async (): Promise<void> => {
    if (!session) return;
    
    try {
      await realTimeCollaborationService.leaveSession(session.id);
      
      // Unsubscribe from updates
      if (channelRef.current) {
        realTimeCollaborationService.unsubscribeFromSession(session.id);
        channelRef.current = null;
      }
      
      setSession(null);
      setParticipants([]);
      setOperations([]);
      setPendingOperations([]);
      setIsConnected(false);
      
      toast({
        title: "Left collaboration session",
        description: "You're no longer in the collaboration session."
      });
    } catch (err: any) {
      console.error('Error leaving session:', err);
      toast({
        title: "Error leaving session",
        description: err.message,
        variant: "destructive"
      });
    }
  }, [session, toast]);

  // Send operation
  const sendOperation = useCallback(async (
    type: CollaborationOperation['operation_type'],
    data: Record<string, any>
  ): Promise<void> => {
    if (!session) {
      throw new Error('No active collaboration session');
    }
    
    try {
      const operation = await realTimeCollaborationService.createOperation(
        session.id,
        type,
        data
      );
      
      // Add to pending operations until acknowledged
      setPendingOperations(prev => [...prev, operation]);
      
      // Remove from pending when acknowledged by all participants
      setTimeout(() => {
        setPendingOperations(prev => prev.filter(op => op.id !== operation.id));
      }, 5000); // 5 second timeout
      
    } catch (err: any) {
      console.error('Error sending operation:', err);
      toast({
        title: "Failed to send operation",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  }, [session, toast]);

  // Update presence
  const updatePresence = useCallback(async (
    location?: string,
    cursorPosition?: { x: number; y: number }
  ): Promise<void> => {
    if (!session) return;
    
    try {
      await realTimeCollaborationService.updatePresence(
        session.id,
        location,
        cursorPosition
      );
    } catch (err: any) {
      console.error('Error updating presence:', err);
    }
  }, [session]);

  // Load metrics
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const collaborationMetrics = await realTimeCollaborationService.getCollaborationMetrics(teamId);
        setMetrics(collaborationMetrics);
      } catch (err: any) {
        console.error('Error loading collaboration metrics:', err);
      }
    };

    loadMetrics();
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [teamId]);

  // Auto-join session if specified
  useEffect(() => {
    if (autoJoin && resourceId && resourceType && teamId && !session) {
      createSession(resourceId, resourceType, `${resourceType} collaboration`);
    }
  }, [autoJoin, resourceId, resourceType, teamId, session, createSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current && channelRef.current) {
        realTimeCollaborationService.leaveSession(sessionRef.current.id);
        realTimeCollaborationService.unsubscribeFromSession(sessionRef.current.id);
      }
    };
  }, []);

  // Calculate derived state
  const onlineParticipants = participants.filter(p => p.status === 'online');
  const isSessionActive = session?.is_active || false;

  return {
    // Session state
    session,
    isSessionActive,
    isConnected,
    
    // Participants
    participants,
    onlineParticipants,
    
    // Operations
    operations,
    pendingOperations,
    
    // Metrics
    metrics,
    
    // Actions
    createSession,
    joinSession,
    leaveSession,
    sendOperation,
    updatePresence,
    
    // Status
    loading,
    error
  };
}