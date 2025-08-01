import React, { useState } from 'react';
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
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications';

// Remove duplicate interface - using the one from service

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
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions'>('all');
  const { toast } = useToast();
  
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead: markAllAsReadService,
    deleteNotification: deleteNotificationService
  } = useRealTimeNotifications({
    unread: filter === 'unread',
    type: filter === 'mentions' ? 'comment_mention' : undefined
  });

  const handleMarkAllAsRead = async () => {
    const success = await markAllAsReadService();
    if (success) {
      toast({
        title: 'All notifications marked as read',
        description: 'Your notification list has been updated.'
      });
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    const success = await deleteNotificationService(notificationId);
    if (success) {
      toast({
        title: 'Notification deleted',
        description: 'The notification has been removed.'
      });
    }
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
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
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
                              handleDeleteNotification(notification.id);
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