import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  MessageSquare, 
  FileText, 
  Share2, 
  Settings,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit,
  Download
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocketCollaboration } from '@/hooks/useWebSocketCollaboration';
import { RealTimePresenceIndicator } from './RealTimePresenceIndicator';
import { TypingIndicator } from './TypingIndicator';
import { MessageReactions } from './MessageReactions';
import { FileAttachments } from './FileAttachments';
import { MentionInput } from './MentionInput';
import { NotificationCenter } from './NotificationCenter';

interface CollaborationSession {
  id: string;
  name: string;
  resourceType: string;
  resourceId: string;
  participants: Array<{
    id: string;
    name: string;
    status: 'active' | 'idle' | 'offline';
    lastSeen: string;
  }>;
  isActive: boolean;
}

interface AdvancedCollaborationManagerProps {
  teamId: string;
  resourceId: string;
  resourceType: 'content' | 'project' | 'document';
  className?: string;
}

export const AdvancedCollaborationManager: React.FC<AdvancedCollaborationManagerProps> = ({
  teamId,
  resourceId,
  resourceType,
  className = ''
}) => {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<CollaborationSession | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [collaborationStats, setCollaborationStats] = useState({
    activeUsers: 0,
    totalMessages: 0,
    filesShared: 0,
    lastActivity: null as Date | null
  });

  const {
    isConnected,
    presenceData,
    typingUsers,
    connectionError,
    updatePresence,
    sendMessage,
    sendOperation
  } = useWebSocketCollaboration({
    teamId,
    resourceId,
    resourceType,
    onMessage: (message) => {
      console.log('Received collaboration message:', message);
      updateStats();
    },
    onPresenceUpdate: (presence) => {
      setCollaborationStats(prev => ({
        ...prev,
        activeUsers: Object.keys(presence).length
      }));
    },
    onTypingUpdate: (typing) => {
      // Handle typing updates
    },
    onError: (error) => {
      console.error('Collaboration error:', error);
    }
  });

  const updateStats = useCallback(() => {
    setCollaborationStats(prev => ({
      ...prev,
      lastActivity: new Date()
    }));
  }, []);

  const startCollaborationSession = async () => {
    if (!user) return;

    try {
      setIsSessionActive(true);
      await updatePresence({
        status: 'active',
        location: `${resourceType}:${resourceId}`,
        activity: 'collaborating'
      });

      setActiveSession({
        id: `session-${Date.now()}`,
        name: `${resourceType.charAt(0).toUpperCase()}${resourceType.slice(1)} Collaboration`,
        resourceType,
        resourceId,
        participants: [
          {
            id: user.id,
            name: user.email?.split('@')[0] || 'Anonymous',
            status: 'active',
            lastSeen: new Date().toISOString()
          }
        ],
        isActive: true
      });
    } catch (error) {
      console.error('Error starting collaboration session:', error);
      setIsSessionActive(false);
    }
  };

  const endCollaborationSession = async () => {
    if (!activeSession) return;

    try {
      await updatePresence({
        status: 'offline',
        location: null,
        activity: null
      });
      
      setActiveSession(null);
      setIsSessionActive(false);
    } catch (error) {
      console.error('Error ending collaboration session:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'idle': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'offline': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Eye className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Collaboration Status Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">Collaboration Center</CardTitle>
              <Badge variant={isConnected ? 'default' : 'destructive'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              {connectionError && (
                <Badge variant="destructive">Error</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <NotificationCenter 
                userId={user?.id}
                teamId={teamId}
                enableRealTime={true}
              />
              
              <Button
                variant={isSessionActive ? 'destructive' : 'default'}
                size="sm"
                onClick={isSessionActive ? endCollaborationSession : startCollaborationSession}
                disabled={!isConnected}
              >
                {isSessionActive ? 'End Session' : 'Start Session'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-sm font-medium">Active Users</div>
                <div className="text-lg font-bold">{collaborationStats.activeUsers}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-sm font-medium">Messages</div>
                <div className="text-lg font-bold">{collaborationStats.totalMessages}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-sm font-medium">Files Shared</div>
                <div className="text-lg font-bold">{collaborationStats.filesShared}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-sm font-medium">Last Activity</div>
                <div className="text-sm text-muted-foreground">
                  {collaborationStats.lastActivity 
                    ? collaborationStats.lastActivity.toLocaleTimeString()
                    : 'No activity'
                  }
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Session Info */}
      {activeSession && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Session: {activeSession.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Participants */}
              <div>
                <div className="text-sm font-medium mb-2">Participants</div>
                <div className="flex flex-wrap gap-2">
                  {activeSession.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-2 bg-muted rounded-full px-3 py-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {participant.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{participant.name}</span>
                      {getStatusIcon(participant.status)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Presence */}
              <div>
                <div className="text-sm font-medium mb-2">Current Activity</div>
                <RealTimePresenceIndicator
                  teamId={teamId}
                  resourceId={resourceId}
                  resourceType={resourceType}
                  maxVisible={5}
                />
              </div>

              {/* Typing Indicator */}
              <TypingIndicator
                channelId={resourceId}
                teamId={teamId}
                currentUserId={user?.id}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collaboration Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Share2 className="h-4 w-4 mr-2" />
                Share Screen
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Create Shared Document
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Export Session Data
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Collaboration Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Session History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground text-center py-4">
                No recent collaboration sessions
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};