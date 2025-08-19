import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Settings, Filter, MessageSquare, UserPlus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  is_read: boolean;
  created_at: string;
  user_id: string;
  team_id?: string;
  action_url?: string;
  metadata?: any;
}

interface NotificationCenterProps {
  userId?: string;
  teamId?: string;
  className?: string;
  enableRealTime?: boolean;
  maxVisible?: number;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  teamId,
  className = '',
  enableRealTime = true,
  maxVisible = 5
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const currentUserId = userId || user?.id;

  // Fetch notifications from database
  const fetchNotifications = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formattedData: Notification[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        message: item.message,
        notification_type: item.notification_type,
        priority: item.priority || 'normal',
        is_read: item.is_read || false,
        created_at: item.created_at,
        user_id: item.user_id || currentUserId || '',
        team_id: item.team_id,
        action_url: item.action_url,
        metadata: item.metadata || {}
      }));
      
      setNotifications(formattedData);
      setUnreadCount(formattedData.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!enableRealTime || !currentUserId) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as any;
            const formattedNotification: Notification = {
              id: newNotification.id,
              title: newNotification.title,
              message: newNotification.message,
              notification_type: newNotification.notification_type,
              priority: newNotification.priority || 'normal',
              is_read: newNotification.is_read || false,
              created_at: newNotification.created_at,
              user_id: newNotification.user_id || currentUserId || '',
              team_id: newNotification.team_id,
              action_url: newNotification.action_url,
              metadata: newNotification.metadata || {}
            };
            
            setNotifications(prev => [formattedNotification, ...prev]);
            if (!formattedNotification.is_read) {
              setUnreadCount(prev => prev + 1);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as any;
            const formattedNotification: Notification = {
              id: updatedNotification.id,
              title: updatedNotification.title,
              message: updatedNotification.message,
              notification_type: updatedNotification.notification_type,
              priority: updatedNotification.priority || 'normal',
              is_read: updatedNotification.is_read || false,
              created_at: updatedNotification.created_at,
              user_id: updatedNotification.user_id || currentUserId || '',
              team_id: updatedNotification.team_id,
              action_url: updatedNotification.action_url,
              metadata: updatedNotification.metadata || {}
            };
            
            setNotifications(prev => 
              prev.map(n => n.id === formattedNotification.id ? formattedNotification : n)
            );
            
            const oldNotification = payload.old as any;
            if (oldNotification.is_read !== formattedNotification.is_read) {
              setUnreadCount(prev => formattedNotification.is_read ? prev - 1 : prev + 1);
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedNotification = payload.old as any;
            setNotifications(prev => prev.filter(n => n.id !== deletedNotification.id));
            if (!deletedNotification.is_read) {
              setUnreadCount(prev => prev - 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealTime, currentUserId]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [currentUserId, teamId]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUserId)
        .eq('is_read', false);

      if (error) throw error;

      toast({
        title: 'All notifications marked as read',
        description: 'Your notification list has been updated.'
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      toast({
        title: 'Notification deleted',
        description: 'The notification has been removed.'
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
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
      case 'comment_mention': return MessageSquare;
      case 'team_invitation': return UserPlus;
      case 'project_assigned': return Bell;
      case 'role_changed': return Settings;
      case 'security_alert': return AlertTriangle;
      default: return Bell;
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
              {filteredNotifications.slice(0, maxVisible).map((notification) => (
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
                    {React.createElement(getTypeIcon(notification.notification_type), { 
                      className: "h-4 w-4 mt-1 text-muted-foreground" 
                    })}
                    
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