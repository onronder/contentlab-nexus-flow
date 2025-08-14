import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PresenceUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: string;
  currentLocation?: string;
}

interface TeamPresenceProps {
  teamId: string;
  className?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online':
      return 'bg-green-500';
    case 'away':
      return 'bg-yellow-500';
    case 'busy':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'online':
      return 'Online';
    case 'away':
      return 'Away';
    case 'busy':
      return 'Busy';
    default:
      return 'Offline';
  }
};

const formatLastSeen = (lastSeen: string) => {
  const now = new Date();
  const time = new Date(lastSeen);
  const diff = now.getTime() - time.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return time.toLocaleDateString();
};

export function TeamPresence({ teamId, className }: TeamPresenceProps) {
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    // Initialize current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser(user.id);
        trackUserPresence(user.id);
      }
    });

    // Subscribe to presence updates
    const channel = supabase.channel(`team-presence:${teamId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        updatePresenceUsers(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  const trackUserPresence = async (userId: string) => {
    const channel = supabase.channel(`team-presence:${teamId}`);
    
    // Track user presence
    await channel.track({
      user_id: userId,
      status: 'online',
      joined_at: new Date().toISOString(),
      location: window.location.pathname
    });
  };

  const updatePresenceUsers = (state: any) => {
    const users: PresenceUser[] = [];
    
    Object.entries(state).forEach(([key, presences]: [string, any]) => {
      const presence = presences[0]; // Get the latest presence
      if (presence) {
        users.push({
          id: presence.user_id,
          name: presence.name || presence.email || 'Unknown User',
          email: presence.email || '',
          avatarUrl: presence.avatar_url,
          status: presence.status || 'online',
          lastSeen: presence.joined_at,
          currentLocation: presence.location
        });
      }
    });
    
    setPresenceUsers(users);
  };

  const updateUserStatus = async (status: 'online' | 'away' | 'busy') => {
    if (!currentUser) return;
    
    const channel = supabase.channel(`team-presence:${teamId}`);
    await channel.track({
      user_id: currentUser,
      status,
      joined_at: new Date().toISOString(),
      location: window.location.pathname
    });
  };

  // Automatically update status based on activity
  useEffect(() => {
    let awayTimer: NodeJS.Timeout;
    
    const resetAwayTimer = () => {
      clearTimeout(awayTimer);
      if (currentUser) {
        updateUserStatus('online');
        awayTimer = setTimeout(() => {
          updateUserStatus('away');
        }, 5 * 60 * 1000); // 5 minutes
      }
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetAwayTimer, true);
    });

    resetAwayTimer();

    return () => {
      clearTimeout(awayTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetAwayTimer, true);
      });
    };
  }, [currentUser]);

  const onlineUsers = presenceUsers.filter(user => user.status === 'online');
  const awayUsers = presenceUsers.filter(user => user.status === 'away');
  const busyUsers = presenceUsers.filter(user => user.status === 'busy');

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Presence
          <Badge variant="secondary" className="ml-auto">
            {onlineUsers.length} online
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <TooltipProvider>
          {/* Online Users */}
          {onlineUsers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                <span className="text-sm font-medium">Online ({onlineUsers.length})</span>
              </div>
              <div className="space-y-2">
                {onlineUsers.map((user) => (
                  <Tooltip key={user.id}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 p-2 rounded hover:bg-muted">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                          <AvatarFallback className="text-xs">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          {user.currentLocation && (
                            <p className="text-xs text-muted-foreground truncate">
                              {user.currentLocation}
                            </p>
                          )}
                        </div>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(user.status)}`} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        <p className="text-xs">{getStatusLabel(user.status)}</p>
                        {user.lastSeen && (
                          <p className="text-xs">Active {formatLastSeen(user.lastSeen)}</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}

          {/* Away Users */}
          {awayUsers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                <span className="text-sm font-medium">Away ({awayUsers.length})</span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {awayUsers.map((user) => (
                  <Tooltip key={user.id}>
                    <TooltipTrigger asChild>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback className="text-xs">
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs">{getStatusLabel(user.status)}</p>
                        {user.lastSeen && (
                          <p className="text-xs">Last seen {formatLastSeen(user.lastSeen)}</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}

          {/* Busy Users */}
          {busyUsers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Circle className="h-3 w-3 fill-red-500 text-red-500" />
                <span className="text-sm font-medium">Busy ({busyUsers.length})</span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {busyUsers.map((user) => (
                  <Tooltip key={user.id}>
                    <TooltipTrigger asChild>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback className="text-xs">
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs">{getStatusLabel(user.status)}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}

          {presenceUsers.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No team members online</p>
            </div>
          )}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}