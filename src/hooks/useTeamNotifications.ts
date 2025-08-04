import { useState, useEffect } from 'react';
import { TeamCommunicationService } from '@/services/teamCommunicationService';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';

export function useTeamNotifications(teamId?: string) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const userId = useCurrentUserId();

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
    }
    return success;
  };

  const markAllAsRead = async () => {
    if (!userId) return false;
    
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
    }
    return success;
  };

  const deleteNotification = async (notificationId: string) => {
    const success = await TeamCommunicationService.deleteNotification(notificationId);
    if (success) {
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    }
    return success;
  };

  const createNotification = async (notificationData: any) => {
    const newNotification = await TeamCommunicationService.createNotification(notificationData);
    if (newNotification) {
      setNotifications(prev => [newNotification, ...prev]);
      if (!newNotification.is_read) {
        setUnreadCount(prev => prev + 1);
      }
    }
    return newNotification;
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

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    refetch: loadNotifications
  };
}