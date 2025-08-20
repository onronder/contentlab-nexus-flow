import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withSecurity, SecurityLogger } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CollaborationMessage {
  type: 'join' | 'leave' | 'presence_update' | 'cursor_move' | 'text_change' | 'operation' | 'typing_start' | 'typing_stop';
  userId: string;
  teamId: string;
  resourceId?: string;
  resourceType?: string;
  data?: any;
  timestamp: number;
}

interface WebSocketConnection {
  socket: WebSocket;
  userId: string;
  teamId: string;
  sessionId: string;
  resourceId?: string;
  resourceType?: string;
  lastActivity: number;
}

// Store active connections
const connections = new Map<string, WebSocketConnection>();
const teamConnections = new Map<string, Set<string>>(); // teamId -> Set of connectionIds
const resourceConnections = new Map<string, Set<string>>(); // resourceId -> Set of connectionIds

const handler = async (req: Request, logger: SecurityLogger): Promise<Response> => {

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const teamId = url.searchParams.get('teamId');
  const resourceId = url.searchParams.get('resourceId');
  const resourceType = url.searchParams.get('resourceType');

  if (!token || !teamId) {
    return new Response("Missing required parameters", { status: 400 });
  }

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Verify JWT token and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    console.error('Authentication failed:', authError);
    return new Response("Authentication failed", { status: 401 });
  }

  // Verify team membership
  const { data: teamMember, error: memberError } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .eq('status', 'active')
    .single();

  if (memberError || !teamMember) {
    console.error('Team membership verification failed:', memberError);
    return new Response("Unauthorized", { status: 403 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const sessionId = crypto.randomUUID();
  const connectionId = `${user.id}-${sessionId}`;

  logger.info(`New WebSocket connection established`, { connectionId, teamId, userId: user.id });

  socket.onopen = async () => {
    // Store connection
    const connection: WebSocketConnection = {
      socket,
      userId: user.id,
      teamId,
      sessionId,
      resourceId: resourceId || undefined,
      resourceType: resourceType || undefined,
      lastActivity: Date.now()
    };
    connections.set(connectionId, connection);

    // Add to team connections
    if (!teamConnections.has(teamId)) {
      teamConnections.set(teamId, new Set());
    }
    teamConnections.get(teamId)!.add(connectionId);

    // Add to resource connections if specified
    if (resourceId) {
      const resourceKey = `${resourceType}-${resourceId}`;
      if (!resourceConnections.has(resourceKey)) {
        resourceConnections.set(resourceKey, new Set());
      }
      resourceConnections.get(resourceKey)!.add(connectionId);
    }

    // Store WebSocket session in database
    await supabase
      .from('websocket_sessions')
      .insert({
        user_id: user.id,
        team_id: teamId,
        session_id: sessionId,
        connection_state: {
          resource_id: resourceId,
          resource_type: resourceType,
          connected_at: new Date().toISOString()
        }
      });

    // Update user presence
    await supabase
      .from('user_presence')
      .upsert({
        user_id: user.id,
        team_id: teamId,
        status: 'online',
        current_location: resourceId ? `${resourceType}:${resourceId}` : 'dashboard',
        activity_data: { connection_id: connectionId },
        last_seen: new Date().toISOString()
      });

    // Broadcast join event to team members
    broadcastToTeam(teamId, {
      type: 'join',
      userId: user.id,
      teamId,
      resourceId,
      resourceType,
      data: { sessionId },
      timestamp: Date.now()
    }, connectionId);

    // Send current team presence to new connection
    const { data: teamPresence } = await supabase
      .from('user_presence')
      .select(`
        user_id,
        status,
        current_location,
        activity_data,
        last_seen,
        profiles!inner(full_name, email)
      `)
      .eq('team_id', teamId)
      .neq('user_id', user.id);

    socket.send(JSON.stringify({
      type: 'team_presence',
      data: teamPresence,
      timestamp: Date.now()
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const message: CollaborationMessage = JSON.parse(event.data);
      const connection = connections.get(connectionId);
      
      if (!connection) {
        console.error('Connection not found for message:', connectionId);
        return;
      }

      connection.lastActivity = Date.now();

      console.log(`Received message type: ${message.type} from user ${user.id}`);

      // Handle different message types
      switch (message.type) {
        case 'presence_update':
          await handlePresenceUpdate(supabase, user.id, teamId, message.data);
          broadcastToTeam(teamId, message, connectionId);
          break;

        case 'cursor_move':
          // Broadcast cursor position to resource participants
          if (resourceId) {
            broadcastToResource(`${resourceType}-${resourceId}`, message, connectionId);
          }
          break;

        case 'text_change':
        case 'operation':
          // Handle collaborative editing operations
          await handleCollaborativeOperation(supabase, message, user.id, teamId);
          if (resourceId) {
            broadcastToResource(`${resourceType}-${resourceId}`, message, connectionId);
          }
          break;

        case 'typing_start':
        case 'typing_stop':
          // Broadcast typing indicators
          if (resourceId) {
            broadcastToResource(`${resourceType}-${resourceId}`, message, connectionId);
          }
          break;

        default:
          console.log('Unknown message type:', message.type);
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
      socket.send(JSON.stringify({
        type: 'error',
        data: { message: 'Failed to process message' },
        timestamp: Date.now()
      }));
    }
  };

  socket.onclose = async () => {
    console.log(`WebSocket connection closed: ${connectionId}`);
    await handleDisconnection(supabase, connectionId, user.id, teamId);
  };

  socket.onerror = async (error) => {
    console.error(`WebSocket error for ${connectionId}:`, error);
    await handleDisconnection(supabase, connectionId, user.id, teamId);
  };

  return response;
};

export default withSecurity(handler, {
  requireAuth: true,
  rateLimitRequests: 1000, // Higher limit for WebSocket connections
  rateLimitWindow: 60000,
  validateInput: false, // WebSocket upgrade doesn't need JSON validation
  enableCORS: true
});

async function handlePresenceUpdate(supabase: any, userId: string, teamId: string, data: any) {
  await supabase
    .from('user_presence')
    .upsert({
      user_id: userId,
      team_id: teamId,
      status: data.status || 'online',
      current_location: data.current_location,
      activity_data: data.activity_data || {},
      last_seen: new Date().toISOString()
    });
}

async function handleCollaborativeOperation(supabase: any, message: CollaborationMessage, userId: string, teamId: string) {
  if (!message.resourceId || !message.resourceType) return;

  // Get or create collaborative session
  let { data: session } = await supabase
    .from('collaborative_sessions')
    .select('*')
    .eq('resource_id', message.resourceId)
    .eq('resource_type', message.resourceType)
    .eq('team_id', teamId)
    .eq('is_active', true)
    .single();

  if (!session) {
    const { data: newSession } = await supabase
      .from('collaborative_sessions')
      .insert({
        resource_id: message.resourceId,
        resource_type: message.resourceType,
        team_id: teamId,
        created_by: userId,
        participants: [userId],
        session_data: { operations: [] }
      })
      .select()
      .single();
    session = newSession;
  }

  if (session && message.type === 'operation') {
    // Store the operation
    await supabase
      .from('collaboration_operations')
      .insert({
        session_id: session.id,
        user_id: userId,
        operation_type: message.data.operation_type,
        operation_data: message.data,
        sequence_number: message.data.sequence_number || Date.now()
      });

    // Update session participants
    const participants = new Set(session.participants || []);
    participants.add(userId);
    
    await supabase
      .from('collaborative_sessions')
      .update({
        participants: Array.from(participants),
        session_data: {
          ...session.session_data,
          last_operation: message.data,
          last_activity: new Date().toISOString()
        }
      })
      .eq('id', session.id);
  }
}

async function handleDisconnection(supabase: any, connectionId: string, userId: string, teamId: string) {
  const connection = connections.get(connectionId);
  if (!connection) return;

  // Remove from connections
  connections.delete(connectionId);

  // Remove from team connections
  const teamConns = teamConnections.get(teamId);
  if (teamConns) {
    teamConns.delete(connectionId);
    if (teamConns.size === 0) {
      teamConnections.delete(teamId);
    }
  }

  // Remove from resource connections
  if (connection.resourceId) {
    const resourceKey = `${connection.resourceType}-${connection.resourceId}`;
    const resourceConns = resourceConnections.get(resourceKey);
    if (resourceConns) {
      resourceConns.delete(connectionId);
      if (resourceConns.size === 0) {
        resourceConnections.delete(resourceKey);
      }
    }
  }

  // Update presence to offline if no other connections for this user
  const userConnections = Array.from(connections.values()).filter(conn => conn.userId === userId && conn.teamId === teamId);
  
  if (userConnections.length === 0) {
    await supabase
      .from('user_presence')
      .update({
        status: 'offline',
        last_seen: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('team_id', teamId);
  }

  // Remove websocket session
  await supabase
    .from('websocket_sessions')
    .delete()
    .eq('session_id', connection.sessionId);

  // Broadcast leave event
  broadcastToTeam(teamId, {
    type: 'leave',
    userId,
    teamId,
    resourceId: connection.resourceId,
    resourceType: connection.resourceType,
    data: { sessionId: connection.sessionId },
    timestamp: Date.now()
  }, connectionId);
}

function broadcastToTeam(teamId: string, message: CollaborationMessage, excludeConnectionId?: string) {
  const teamConns = teamConnections.get(teamId);
  if (!teamConns) return;

  const messageStr = JSON.stringify(message);
  
  for (const connId of teamConns) {
    if (connId === excludeConnectionId) continue;
    
    const connection = connections.get(connId);
    if (connection && connection.socket.readyState === WebSocket.OPEN) {
      try {
        connection.socket.send(messageStr);
      } catch (error) {
        console.error(`Failed to send message to ${connId}:`, error);
      }
    }
  }
}

function broadcastToResource(resourceKey: string, message: CollaborationMessage, excludeConnectionId?: string) {
  const resourceConns = resourceConnections.get(resourceKey);
  if (!resourceConns) return;

  const messageStr = JSON.stringify(message);
  
  for (const connId of resourceConns) {
    if (connId === excludeConnectionId) continue;
    
    const connection = connections.get(connId);
    if (connection && connection.socket.readyState === WebSocket.OPEN) {
      try {
        connection.socket.send(messageStr);
      } catch (error) {
        console.error(`Failed to send message to ${connId}:`, error);
      }
    }
  }
}

// Cleanup inactive connections every 5 minutes
setInterval(() => {
  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000);
  
  for (const [connectionId, connection] of connections.entries()) {
    if (connection.lastActivity < fiveMinutesAgo) {
      console.log(`Cleaning up inactive connection: ${connectionId}`);
      handleDisconnection(null, connectionId, connection.userId, connection.teamId);
    }
  }
}, 5 * 60 * 1000);