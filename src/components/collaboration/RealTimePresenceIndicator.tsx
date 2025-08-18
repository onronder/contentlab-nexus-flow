import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useWebSocketCollaboration } from '@/hooks/useWebSocketCollaboration';

interface User {
  user_id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  current_location?: string;
  last_seen: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface RealTimePresenceIndicatorProps {
  teamId: string;
  resourceId?: string;
  resourceType?: 'content' | 'project' | 'document';
  className?: string;
  maxVisible?: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online': return 'bg-success';
    case 'away': return 'bg-warning';
    case 'busy': return 'bg-destructive';
    default: return 'bg-muted';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'online': return 'Online';
    case 'away': return 'Away';
    case 'busy': return 'Busy';
    default: return 'Offline';
  }
};

const formatLastSeen = (lastSeen: string) => {
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return `${Math.floor(diffMins / 1440)}d ago`;
};

export function RealTimePresenceIndicator({
  teamId,
  resourceId,
  resourceType,
  className = '',
  maxVisible = 5
}: RealTimePresenceIndicatorProps) {
  const { presence, isConnected, typingUsers } = useWebSocketCollaboration({
    teamId,
    resourceId,
    resourceType
  });

  // Filter and sort users
  const activeUsers = presence
    .filter(user => user.status !== 'offline')
    .sort((a, b) => {
      // Sort by status priority, then by last seen
      const statusPriority = { online: 3, busy: 2, away: 1, offline: 0 };
      const aPriority = statusPriority[a.status] || 0;
      const bPriority = statusPriority[b.status] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime();
    });

  const visibleUsers = activeUsers.slice(0, maxVisible);
  const remainingCount = Math.max(0, activeUsers.length - maxVisible);

  if (activeUsers.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-muted animate-pulse" />
        <span className="text-sm text-muted-foreground">
          {isConnected ? 'No one else online' : 'Connecting...'}
        </span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Connection Status Indicator */}
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-warning animate-pulse'}`} />
        
        {/* User Avatars */}
        <div className="flex items-center -space-x-2">
          {visibleUsers.map((user) => {
            const isTyping = typingUsers.includes(user.user_id);
            
            return (
              <Tooltip key={user.user_id}>
                <TooltipTrigger>
                  <div className="relative">
                    <Avatar className={`w-8 h-8 border-2 border-background ${isTyping ? 'ring-2 ring-primary animate-pulse' : ''}`}>
                      <AvatarImage 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.user_id}`} 
                        alt={user.profiles?.full_name || 'User'} 
                      />
                      <AvatarFallback className="text-xs">
                        {(user.profiles?.full_name || user.profiles?.email || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Status Dot */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(user.status)}`} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium">{user.profiles?.full_name || user.profiles?.email || 'Unknown User'}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {getStatusLabel(user.status)}
                      </Badge>
                      {isTyping && (
                        <Badge variant="outline" className="text-xs animate-pulse">
                          Typing...
                        </Badge>
                      )}
                    </div>
                    {user.current_location && (
                      <p className="text-xs text-muted-foreground">
                        📍 {user.current_location}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {user.status === 'online' ? 'Active now' : `Last seen ${formatLastSeen(user.last_seen)}`}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
          
          {/* Remaining Count */}
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger>
                <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">
                    +{remainingCount}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-sm">
                  {remainingCount} more {remainingCount === 1 ? 'person' : 'people'} online
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Active Count */}
        <span className="text-sm text-muted-foreground">
          {activeUsers.length} online
        </span>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-muted-foreground">
              {typingUsers.length === 1 ? 'Someone is' : `${typingUsers.length} people are`} typing
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}