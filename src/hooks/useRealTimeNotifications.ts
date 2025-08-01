import { useState, useEffect } from 'react';
import { RealTimeNotificationService, Notification, NotificationFilters } from '@/services/realTimeNotificationService';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { supabase } from '@/integrations/supabase/client';

export function useRealTimeNotifications(filters: NotificationFilters = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = useCurrentUserId();

  const fetchNotifications = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const [data, count] = await Promise.all([
        RealTimeNotificationService.getUserNotifications(userId, filters),
        RealTimeNotificationService.getUnreadCount(userId)
      ]);
      
      setNotifications(data);
      setUnreadCount(count);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId, filters]);

  useEffect(() => {
    if (!userId) return;

    const channel = RealTimeNotificationService.setupRealtimeSubscription(
      userId,
      fetchNotifications
    );

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    try {
      const success = await RealTimeNotificationService.markAsRead(notificationId);
      if (success) {
        setNotifications(prev => prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return success;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError('Failed to mark notification as read');
      return false;
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return false;

    try {
      const success = await RealTimeNotificationService.markAllAsRead(userId);
      if (success) {
        setNotifications(prev => prev.map(notification => ({ 
          ...notification, 
          is_read: true 
        })));
        setUnreadCount(0);
      }
      return success;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError('Failed to mark all notifications as read');
      return false;
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const success = await RealTimeNotificationService.deleteNotification(notificationId);
      if (success) {
        const wasUnread = notifications.find(n => n.id === notificationId)?.is_read === false;
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        if (wasUnread) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
      return success;
    } catch (err) {
      console.error('Error deleting notification:', err);
      setError('Failed to delete notification');
      return false;
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications
  };
}