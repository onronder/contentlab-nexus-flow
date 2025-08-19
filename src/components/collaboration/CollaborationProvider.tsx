import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocketCollaboration } from '@/hooks/useWebSocketCollaboration';
import { supabase } from '@/integrations/supabase/client';

// Enhanced collaboration state management
interface CollaborationState {
  activeSession: CollaborationSession | null;
  sessionHistory: CollaborationSession[];
  participants: UserPresence[];
  typingUsers: string[];
  cursorPositions: Map<string, CursorPosition>;
  operations: OperationQueue[];
  conflicts: ConflictDetection[];
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  performance: PerformanceMetrics;
  settings: CollaborationSettings;
}

interface CollaborationSession {
  id: string;
  name: string;
  teamId: string;
  resourceId: string;
  resourceType: 'content' | 'project' | 'document';
  participants: UserPresence[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
  permissions: SessionPermissions;
}

interface UserPresence {
  user_id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  current_location?: string;
  activity_data?: any;
  last_seen: string;
  cursor_position?: CursorPosition;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface CursorPosition {
  x: number;
  y: number;
  selection?: {
    start: number;
    end: number;
  };
  viewport?: {
    scrollTop: number;
    scrollLeft: number;
  };
}

interface OperationQueue {
  id: string;
  type: 'insert' | 'delete' | 'format' | 'move';
  data: any;
  timestamp: number;
  userId: string;
  applied: boolean;
  conflicts?: string[];
}

interface ConflictDetection {
  id: string;
  type: 'text_collision' | 'cursor_conflict' | 'format_conflict';
  participants: string[];
  timestamp: number;
  resolved: boolean;
  resolution?: string;
}

interface PerformanceMetrics {
  messageLatency: number;
  operationThroughput: number;
  conflictRate: number;
  reconnectionCount: number;
  lastOptimization: number;
}

interface SessionPermissions {
  canEdit: boolean;
  canComment: boolean;
  canInvite: boolean;
  canManage: boolean;
  role: 'viewer' | 'editor' | 'admin' | 'owner';
}

interface CollaborationSettings {
  autoSave: boolean;
  conflictResolution: 'manual' | 'automatic' | 'latest_wins';
  cursorTracking: boolean;
  typingIndicators: boolean;
  soundNotifications: boolean;
  maxParticipants: number;
  sessionTimeout: number;
}

type CollaborationAction =
  | { type: 'SET_SESSION'; payload: CollaborationSession }
  | { type: 'UPDATE_PARTICIPANTS'; payload: UserPresence[] }
  | { type: 'ADD_OPERATION'; payload: OperationQueue }
  | { type: 'RESOLVE_CONFLICT'; payload: { id: string; resolution: string } }
  | { type: 'UPDATE_CURSOR'; payload: { userId: string; position: CursorPosition } }
  | { type: 'SET_TYPING'; payload: string[] }
  | { type: 'UPDATE_CONNECTION'; payload: { status: string; isConnected: boolean } }
  | { type: 'UPDATE_PERFORMANCE'; payload: Partial<PerformanceMetrics> }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<CollaborationSettings> }
  | { type: 'END_SESSION' };

const initialState: CollaborationState = {
  activeSession: null,
  sessionHistory: [],
  participants: [],
  typingUsers: [],
  cursorPositions: new Map(),
  operations: [],
  conflicts: [],
  isConnected: false,
  connectionStatus: 'disconnected',
  performance: {
    messageLatency: 0,
    operationThroughput: 0,
    conflictRate: 0,
    reconnectionCount: 0,
    lastOptimization: Date.now()
  },
  settings: {
    autoSave: true,
    conflictResolution: 'automatic',
    cursorTracking: true,
    typingIndicators: true,
    soundNotifications: false,
    maxParticipants: 20,
    sessionTimeout: 30 * 60 * 1000 // 30 minutes
  }
};

function collaborationReducer(state: CollaborationState, action: CollaborationAction): CollaborationState {
  switch (action.type) {
    case 'SET_SESSION':
      return {
        ...state,
        activeSession: action.payload,
        sessionHistory: state.activeSession 
          ? [...state.sessionHistory.slice(-9), state.activeSession]
          : state.sessionHistory
      };

    case 'UPDATE_PARTICIPANTS':
      return {
        ...state,
        participants: action.payload
      };

    case 'ADD_OPERATION':
      return {
        ...state,
        operations: [...state.operations.slice(-99), action.payload] // Keep last 100 operations
      };

    case 'RESOLVE_CONFLICT':
      return {
        ...state,
        conflicts: state.conflicts.map(conflict =>
          conflict.id === action.payload.id
            ? { ...conflict, resolved: true, resolution: action.payload.resolution }
            : conflict
        )
      };

    case 'UPDATE_CURSOR':
      const newCursorPositions = new Map(state.cursorPositions);
      newCursorPositions.set(action.payload.userId, action.payload.position);
      return {
        ...state,
        cursorPositions: newCursorPositions
      };

    case 'SET_TYPING':
      return {
        ...state,
        typingUsers: action.payload
      };

    case 'UPDATE_CONNECTION':
      return {
        ...state,
        connectionStatus: action.payload.status as any,
        isConnected: action.payload.isConnected
      };

    case 'UPDATE_PERFORMANCE':
      return {
        ...state,
        performance: { ...state.performance, ...action.payload }
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };

    case 'END_SESSION':
      return {
        ...state,
        activeSession: null,
        participants: [],
        typingUsers: [],
        cursorPositions: new Map(),
        operations: []
      };

    default:
      return state;
  }
}

interface CollaborationContextType {
  state: CollaborationState;
  actions: {
    startSession: (config: Partial<CollaborationSession>) => Promise<void>;
    endSession: () => Promise<void>;
    addOperation: (operation: Omit<OperationQueue, 'id' | 'timestamp' | 'userId' | 'applied'>) => void;
    updateCursor: (position: CursorPosition) => void;
    resolveConflict: (id: string, resolution: string) => void;
    updateSettings: (settings: Partial<CollaborationSettings>) => void;
    optimizePerformance: () => void;
  };
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

interface CollaborationProviderProps {
  children: React.ReactNode;
  teamId: string;
  resourceId?: string;
  resourceType?: 'content' | 'project' | 'document';
}

export const CollaborationProvider: React.FC<CollaborationProviderProps> = ({
  children,
  teamId,
  resourceId,
  resourceType
}) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(collaborationReducer, initialState);

  const {
    isConnected,
    presence,
    typingUsers,
    sendMessage,
    updatePresence,
    sendCursorMove,
    sendOperation
  } = useWebSocketCollaboration({
    teamId,
    resourceId,
    resourceType,
    onMessage: handleCollaborationMessage,
    onPresenceUpdate: (presence) => {
      dispatch({ type: 'UPDATE_PARTICIPANTS', payload: presence });
    },
    onTypingUpdate: (typing) => {
      dispatch({ type: 'SET_TYPING', payload: typing });
    }
  });

  // Performance monitoring
  useEffect(() => {
    const performanceInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastOpt = now - state.performance.lastOptimization;
      
      if (timeSinceLastOpt > 60000) { // Optimize every minute
        optimizePerformance();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(performanceInterval);
  }, [state.performance.lastOptimization]);

  function handleCollaborationMessage(message: any) {
    const startTime = Date.now();
    
    switch (message.type) {
      case 'operation':
        dispatch({
          type: 'ADD_OPERATION',
          payload: {
            id: `op-${Date.now()}-${Math.random()}`,
            ...message.data,
            timestamp: message.timestamp,
            userId: message.userId,
            applied: false
          }
        });
        break;
        
      case 'cursor_move':
        if (message.userId !== user?.id) {
          dispatch({
            type: 'UPDATE_CURSOR',
            payload: {
              userId: message.userId,
              position: message.data
            }
          });
        }
        break;
    }

    // Update performance metrics
    const latency = Date.now() - startTime;
    dispatch({
      type: 'UPDATE_PERFORMANCE',
      payload: { messageLatency: latency }
    });
  }

  const startSession = useCallback(async (config: Partial<CollaborationSession>) => {
    if (!user) return;

    try {
      const sessionId = `session-${Date.now()}-${user.id}`;
      
      // Create session in database
      const { data: sessionData, error } = await supabase
        .from('collaborative_sessions')
        .insert({
          id: sessionId,
          team_id: teamId,
          resource_id: resourceId || '',
          resource_type: resourceType || 'document',
          session_name: config.name || 'Untitled Session',
          created_by: user.id,
          participants: [user.id],
          session_data: config.metadata || {},
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      const session: CollaborationSession = {
        id: sessionId,
        name: config.name || 'Untitled Session',
        teamId,
        resourceId: resourceId || '',
        resourceType: resourceType || 'document',
        participants: presence,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: config.metadata || {},
        permissions: {
          canEdit: true,
          canComment: true,
          canInvite: true,
          canManage: true,
          role: 'owner'
        }
      };

      dispatch({ type: 'SET_SESSION', payload: session });
      await updatePresence('online', `${resourceType}:${resourceId}`, { session: sessionId });

    } catch (error) {
      console.error('Error starting collaboration session:', error);
      throw error;
    }
  }, [user, teamId, resourceId, resourceType, presence, updatePresence]);

  const endSession = useCallback(async () => {
    if (!state.activeSession || !user) return;

    try {
      // Update session in database
      await supabase
        .from('collaborative_sessions')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', state.activeSession.id);

      dispatch({ type: 'END_SESSION' });
      await updatePresence('away');

    } catch (error) {
      console.error('Error ending collaboration session:', error);
      throw error;
    }
  }, [state.activeSession, user, updatePresence]);

  const addOperation = useCallback((operation: Omit<OperationQueue, 'id' | 'timestamp' | 'userId' | 'applied'>) => {
    if (!user) return;

    const fullOperation: OperationQueue = {
      ...operation,
      id: `op-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      userId: user.id,
      applied: false
    };

    dispatch({ type: 'ADD_OPERATION', payload: fullOperation });
    sendOperation(fullOperation);
  }, [user, sendOperation]);

  const updateCursor = useCallback((position: CursorPosition) => {
    if (!user) return;

    dispatch({
      type: 'UPDATE_CURSOR',
      payload: { userId: user.id, position }
    });
    
    sendCursorMove(position);
  }, [user, sendCursorMove]);

  const resolveConflict = useCallback((id: string, resolution: string) => {
    dispatch({ type: 'RESOLVE_CONFLICT', payload: { id, resolution } });
  }, []);

  const updateSettings = useCallback((settings: Partial<CollaborationSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, []);

  const optimizePerformance = useCallback(() => {
    // Clean up old operations
    const cutoffTime = Date.now() - 5 * 60 * 1000; // 5 minutes
    const activeOperations = state.operations.filter(op => op.timestamp > cutoffTime);
    
    // Clean up resolved conflicts
    const activeConflicts = state.conflicts.filter(conflict => !conflict.resolved);
    
    dispatch({
      type: 'UPDATE_PERFORMANCE',
      payload: {
        lastOptimization: Date.now(),
        operationThroughput: activeOperations.length
      }
    });
  }, [state.operations, state.conflicts]);

  // Connection status monitoring
  useEffect(() => {
    dispatch({
      type: 'UPDATE_CONNECTION',
      payload: {
        status: isConnected ? 'connected' : 'disconnected',
        isConnected
      }
    });
  }, [isConnected]);

  const contextValue: CollaborationContextType = {
    state,
    actions: {
      startSession,
      endSession,
      addOperation,
      updateCursor,
      resolveConflict,
      updateSettings,
      optimizePerformance
    }
  };

  return (
    <CollaborationContext.Provider value={contextValue}>
      {children}
    </CollaborationContext.Provider>
  );
};

export const useCollaboration = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
};