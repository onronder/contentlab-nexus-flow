import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type NotificationType = Database['public']['Enums']['notification_type'];
type NotificationPriority = Database['public']['Enums']['notification_priority'];

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id?: string;
  team_id?: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  priority: NotificationPriority;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface NotificationFilters {
  unread?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  limit?: number;
}

export class RealTimeNotificationService {
  static async getUserNotifications(
    userId: string, 
    filters: NotificationFilters = {}
  ): Promise<Notification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select(`
          *,
          sender:profiles!notifications_sender_id_fkey(id, full_name, avatar_url)
        `)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      if (filters.unread) {
        query = query.eq('is_read', false);
      }

      if (filters.type) {
        query = query.eq('notification_type', filters.type);
      }

      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(notification => ({
        ...notification,
        sender: Array.isArray(notification.sender) ? notification.sender[0] : notification.sender
      }));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  static async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  static setupRealtimeSubscription(userId: string, onUpdate: () => void) {
    return supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`
      }, () => {
        onUpdate();
      })
      .subscribe();
  }
}