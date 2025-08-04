import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, 
  BellRing, 
  Check, 
  Trash2, 
  Settings, 
  MessageSquare,
  UserPlus,
  FileText,
  AlertTriangle,
  Info,
  CheckCheck
} from 'lucide-react';
import { TeamCommunicationService } from '@/services/teamCommunicationService';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';

interface NotificationCenterProps {
  teamId?: string;
  className?: string;
}

const getNotificationIcon = (type: string, category: string) => {
  if (category === 'mention') return MessageSquare;
  if (category === 'message') return MessageSquare;
  if (type === 'team_invitation') return UserPlus;
  if (category === 'task') return CheckCheck;
  if (category === 'project') return FileText;
  if (category === 'system') return Settings;
  return Bell;
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'normal':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'low':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200';
  }
};

const formatNotificationTime = (timestamp: string) => {
  const now = new Date();
  const time = new Date(timestamp);
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

export function NotificationCenter({ teamId, className }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const userId = useCurrentUserId();
  const { toast } = useToast();

  const loadNotifications = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const filters = teamId ? { team_id: teamId } : {};
      const data = await TeamCommunicationService.getUserNotifications(userId, { filters });
      
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    const success = await TeamCommunicationService.markNotificationAsRead(notificationId);
    if (success) {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      toast({
        title: "Notification marked as read",
        description: "The notification has been marked as read."
      });
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    
    const success = await TeamCommunicationService.markAllNotificationsAsRead(userId, teamId);
    if (success) {
      setNotifications(prev => 
        prev.map(notif => ({ 
          ...notif, 
          is_read: true, 
          read_at: new Date().toISOString() 
        }))
      );
      setUnreadCount(0);
      toast({
        title: "All notifications marked as read",
        description: "All notifications have been marked as read."
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const success = await TeamCommunicationService.deleteNotification(notificationId);
    if (success) {
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      toast({
        title: "Notification deleted",
        description: "The notification has been deleted."
      });
    }
  };

  useEffect(() => {
    if (!userId) return;

    loadNotifications();

    // Set up real-time subscription for notifications
    const channel = TeamCommunicationService.subscribeToUserNotifications(userId, () => {
      loadNotifications();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [userId, teamId]);

  const filteredNotifications = notifications.filter(notif => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notif.is_read;
    return notif.category === activeTab;
  });

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading notifications...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button size="sm" variant="outline" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark All Read
              </Button>
            )}
            <Button size="sm" variant="ghost">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
            <TabsTrigger value="mention">Mentions</TabsTrigger>
            <TabsTrigger value="message">Messages</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab}>
            <ScrollArea className="h-[400px]">
              {filteredNotifications.length > 0 ? (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => {
                    const IconComponent = getNotificationIcon(
                      notification.notification_type, 
                      notification.category
                    );
                    const priorityColor = getPriorityColor(notification.priority);
                    
                    return (
                      <div 
                        key={notification.id} 
                        className={`p-4 rounded-lg border transition-colors hover:bg-muted/50 ${
                          !notification.is_read ? 'bg-primary/5 border-primary/20' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${priorityColor}`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {notification.sender && (
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={notification.sender.avatar_url} />
                                  <AvatarFallback className="text-xs">
                                    {notification.sender.full_name?.charAt(0) || 
                                     notification.sender.email?.charAt(0) || '?'}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <h4 className="font-medium text-sm">{notification.title}</h4>
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-primary rounded-full" />
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{formatNotificationTime(notification.created_at)}</span>
                                {notification.channel && (
                                  <>
                                    <span>•</span>
                                    <span>#{notification.channel.name}</span>
                                  </>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {notification.category}
                                </Badge>
                                {notification.priority !== 'normal' && (
                                  <Badge variant="outline" className="text-xs">
                                    {notification.priority}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex gap-1">
                                {!notification.is_read && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => markAsRead(notification.id)}
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteNotification(notification.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {notification.action_url && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="mt-2"
                                onClick={() => window.location.href = notification.action_url}
                              >
                                View Details
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-muted-foreground mb-2">
                    {activeTab === 'unread' ? 'No Unread Notifications' : 'No Notifications'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === 'unread' 
                      ? 'All caught up! No unread notifications.' 
                      : 'You have no notifications at this time.'
                    }
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}