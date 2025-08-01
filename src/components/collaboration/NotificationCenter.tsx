import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Settings, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  recipient_id: string;
  sender_id?: string;
  team_id?: string;
  notification_type: string;
  title: string;
  message: string;
  action_url?: string;
  priority: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

interface NotificationCenterProps {
  userId: string;
  teamId?: string;
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  teamId,
  className = ''
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions'>('all');
  const { toast } = useToast();

  useEffect(() => {
    // Mock notifications data
    const mockNotifications: Notification[] = [
      {
        id: '1',
        recipient_id: userId,
        sender_id: 'sender-1',
        team_id: teamId,
        notification_type: 'comment_mention',
        title: 'You were mentioned in a comment',
        message: 'John Doe mentioned you in a comment on Project Alpha',
        action_url: '/projects/alpha/comments/123',
        priority: 'normal',
        is_read: false,
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        sender: {
          id: 'sender-1',
          full_name: 'John Doe'
        }
      },
      {
        id: '2',
        recipient_id: userId,
        notification_type: 'team_invitation',
        title: 'New team invitation',
        message: 'You have been invited to join the Marketing Team',
        action_url: '/invitations/accept/token123',
        priority: 'high',
        is_read: false,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        recipient_id: userId,
        notification_type: 'project_assigned',
        title: 'Project assignment',
        message: 'You have been assigned to work on the new website redesign project',
        priority: 'normal',
        is_read: true,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.is_read).length);
    setLoading(false);
  }, [userId, teamId]);

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => prev.map(notification =>
      notification.id === notificationId
        ? { ...notification, is_read: true }
        : notification
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, is_read: true })));
    setUnreadCount(0);
    toast({
      title: 'All notifications marked as read',
      description: 'Your notification list has been updated.'
    });
  };

  const deleteNotification = async (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    toast({
      title: 'Notification deleted',
      description: 'The notification has been removed.'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'comment_mention': return '💬';
      case 'team_invitation': return '👥';
      case 'project_assigned': return '📋';
      case 'role_changed': return '🔐';
      case 'security_alert': return '🔒';
      default: return '📢';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.is_read;
    if (filter === 'mentions') return notification.notification_type === 'comment_mention';
    return true;
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Filter className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilter('all')}>
                  All Notifications
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('unread')}>
                  Unread Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('mentions')}>
                  Mentions
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <Check className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-96">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Bell className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-accent/30' : ''
                  }`}
                  onClick={() => {
                    if (!notification.is_read) markAsRead(notification.id);
                    if (notification.action_url) {
                      window.location.href = notification.action_url;
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-lg">{getTypeIcon(notification.notification_type)}</div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="text-sm font-medium truncate">
                          {notification.title}
                        </h5>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <Badge variant={getPriorityColor(notification.priority)} className="text-xs">
                            {notification.priority}
                          </Badge>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center">
          <Settings className="w-4 h-4 mr-2" />
          Notification Settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};