import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface CollaborationMessage {
  type: 'join' | 'leave' | 'presence_update' | 'cursor_move' | 'text_change' | 'operation' | 'typing_start' | 'typing_stop' | 'team_presence' | 'error';
  userId?: string;
  teamId?: string;
  resourceId?: string;
  resourceType?: string;
  data?: any;
  timestamp: number;
}

interface UserPresence {
  user_id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  current_location?: string;
  activity_data?: any;
  last_seen: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface UseWebSocketCollaborationOptions {
  teamId: string;
  resourceId?: string;
  resourceType?: 'content' | 'project' | 'document';
  onMessage?: (message: CollaborationMessage) => void;
  onPresenceUpdate?: (presence: UserPresence[]) => void;
  onUserJoin?: (userId: string) => void;
  onUserLeave?: (userId: string) => void;
  onTypingUpdate?: (typingUsers: string[]) => void;
}

export function useWebSocketCollaboration({
  teamId,
  resourceId,
  resourceType,
  onMessage,
  onPresenceUpdate,
  onUserJoin,
  onUserLeave,
  onTypingUpdate
}: UseWebSocketCollaborationOptions) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [presence, setPresence] = useState<UserPresence[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(async () => {
    if (!user || !teamId || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No valid session');
      }

      const wsUrl = new URL(`wss://ijvhqqdfthchtittyvnt.functions.supabase.co/functions/v1/realtime-collaboration`);
      wsUrl.searchParams.set('token', session.access_token);
      wsUrl.searchParams.set('teamId', teamId);
      
      if (resourceId) {
        wsUrl.searchParams.set('resourceId', resourceId);
      }
      if (resourceType) {
        wsUrl.searchParams.set('resourceType', resourceType);
      }

      console.log('Connecting to WebSocket:', wsUrl.toString());
      
      const ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: CollaborationMessage = JSON.parse(event.data);
          console.log('Received WebSocket message:', message.type, message);

          // Handle different message types
          switch (message.type) {
            case 'team_presence':
              if (message.data) {
                setPresence(message.data);
                onPresenceUpdate?.(message.data);
              }
              break;

            case 'join':
              if (message.userId && message.userId !== user.id) {
                console.log('User joined:', message.userId);
                onUserJoin?.(message.userId);
              }
              break;

            case 'leave':
              if (message.userId && message.userId !== user.id) {
                console.log('User left:', message.userId);
                onUserLeave?.(message.userId);
                // Remove from typing users
                setTypingUsers(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(message.userId!);
                  return newSet;
                });
              }
              break;

            case 'typing_start':
              if (message.userId && message.userId !== user.id) {
                setTypingUsers(prev => new Set(prev).add(message.userId!));
                
                // Clear existing timeout for this user
                const existingTimeout = typingTimeoutRef.current.get(message.userId);
                if (existingTimeout) {
                  clearTimeout(existingTimeout);
                }
                
                // Set new timeout to remove typing indicator after 3 seconds
                const timeout = setTimeout(() => {
                  setTypingUsers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(message.userId!);
                    return newSet;
                  });
                  typingTimeoutRef.current.delete(message.userId!);
                }, 3000);
                
                typingTimeoutRef.current.set(message.userId, timeout);
              }
              break;

            case 'typing_stop':
              if (message.userId && message.userId !== user.id) {
                setTypingUsers(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(message.userId);
                  return newSet;
                });
                
                // Clear timeout
                const timeout = typingTimeoutRef.current.get(message.userId);
                if (timeout) {
                  clearTimeout(timeout);
                  typingTimeoutRef.current.delete(message.userId);
                }
              }
              break;

            case 'error':
              console.error('WebSocket error message:', message.data);
              setConnectionError(message.data?.message || 'Unknown error');
              break;

            default:
              // Pass through other messages to the callback
              onMessage?.(message);
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection error occurred');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setConnectionError('Failed to connect after multiple attempts');
        }
      };

    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    }
  }, [user, teamId, resourceId, resourceType, onMessage, onPresenceUpdate, onUserJoin, onUserLeave]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clear all typing timeouts
    typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
    typingTimeoutRef.current.clear();

    if (wsRef.current) {
      wsRef.current.close(1000, 'Disconnecting');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setPresence([]);
    setTypingUsers(new Set());
    setConnectionError(null);
  }, []);

  const sendMessage = useCallback((message: Omit<CollaborationMessage, 'timestamp'>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const fullMessage = {
        ...message,
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(fullMessage));
      return true;
    }
    return false;
  }, []);

  const updatePresence = useCallback((status: 'online' | 'away' | 'busy', location?: string, activityData?: any) => {
    return sendMessage({
      type: 'presence_update',
      userId: user?.id,
      teamId,
      data: {
        status,
        current_location: location,
        activity_data: activityData
      }
    });
  }, [sendMessage, user?.id, teamId]);

  const sendTypingStart = useCallback(() => {
    return sendMessage({
      type: 'typing_start',
      userId: user?.id,
      teamId,
      resourceId,
      resourceType
    });
  }, [sendMessage, user?.id, teamId, resourceId, resourceType]);

  const sendTypingStop = useCallback(() => {
    return sendMessage({
      type: 'typing_stop',
      userId: user?.id,
      teamId,
      resourceId,
      resourceType
    });
  }, [sendMessage, user?.id, teamId, resourceId, resourceType]);

  const sendCursorMove = useCallback((position: { x: number; y: number; selection?: any }) => {
    return sendMessage({
      type: 'cursor_move',
      userId: user?.id,
      teamId,
      resourceId,
      resourceType,
      data: position
    });
  }, [sendMessage, user?.id, teamId, resourceId, resourceType]);

  const sendOperation = useCallback((operation: any) => {
    return sendMessage({
      type: 'operation',
      userId: user?.id,
      teamId,
      resourceId,
      resourceType,
      data: operation
    });
  }, [sendMessage, user?.id, teamId, resourceId, resourceType]);

  // Connect on mount
  useEffect(() => {
    if (user && teamId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user, teamId, connect, disconnect]);

  // Update typing users effect
  useEffect(() => {
    onTypingUpdate?.(Array.from(typingUsers));
  }, [typingUsers, onTypingUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    presence,
    typingUsers: Array.from(typingUsers),
    connectionError,
    connect,
    disconnect,
    sendMessage,
    updatePresence,
    sendTypingStart,
    sendTypingStop,
    sendCursorMove,
    sendOperation
  };
}