import { supabase } from '@/integrations/supabase/client';

export interface NotificationCreateInput {
  recipientId: string;
  senderId?: string;
  teamId?: string;
  notificationType: 'team_invitation' | 'role_changed' | 'project_assigned' | 'content_shared' | 'comment_mention' | 'approval_request' | 'system_alert' | 'security_alert';
  title: string;
  message: string;
  actionUrl?: string;
  resourceType?: string;
  resourceId?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  deliveryMethod?: { in_app?: boolean; email?: boolean };
  metadata?: Record<string, any>;
  expiresAt?: string;
}

export interface NotificationData {
  recipientId: string;
  title: string;
  message: string;
  type: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id?: string;
  team_id?: string;
  notification_type: string;
  title: string;
  message: string;
  action_url?: string;
  resource_type?: string;
  resource_id?: string;
  priority: string;
  delivery_method: { in_app?: boolean; email?: boolean };
  is_read: boolean;
  read_at?: string;
  email_sent: boolean;
  email_sent_at?: string;
  metadata: Record<string, any>;
  expires_at?: string;
  created_at: string;
  sender?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

export interface NotificationFilters {
  type?: string;
  isRead?: boolean;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export class NotificationService {
  // Notification Management
  static async createNotification(notificationData: NotificationCreateInput): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: notificationData.recipientId,
        sender_id: notificationData.senderId,
        team_id: notificationData.teamId,
        notification_type: notificationData.notificationType,
        title: notificationData.title,
        message: notificationData.message,
        action_url: notificationData.actionUrl,
        resource_type: notificationData.resourceType,
        resource_id: notificationData.resourceId,
        priority: notificationData.priority || 'normal',
        delivery_method: notificationData.deliveryMethod || { in_app: true, email: false },
        metadata: notificationData.metadata || {},
        expires_at: notificationData.expiresAt
      })
      .select(`
        *,
        sender:profiles!sender_id(id, full_name, email, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Send email if required
    if (notificationData.deliveryMethod?.email) {
      await this.sendEmailNotification({
        recipientId: notificationData.recipientId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.notificationType,
        actionUrl: notificationData.actionUrl,
        metadata: notificationData.metadata
      });
    }

    return data;
  }

  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('recipient_id', userId);

    if (error) throw error;
  }

  static async markAllAsRead(userId: string, teamId?: string): Promise<void> {
    let query = supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { error } = await query;
    if (error) throw error;
  }

  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('recipient_id', userId);

    if (error) throw error;
  }

  // Notification Queries
  static async getUserNotifications(
    userId: string, 
    filters?: NotificationFilters
  ): Promise<Notification[]> {
    let query = supabase
      .from('notifications')
      .select(`
        *,
        sender:profiles!sender_id(id, full_name, email, avatar_url)
      `)
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });

    if (filters?.type) {
      query = query.eq('notification_type', filters.type);
    }
    if (filters?.isRead !== undefined) {
      query = query.eq('is_read', filters.isRead);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 20)) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async getUnreadCount(userId: string, teamId?: string): Promise<number> {
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  static async getNotificationsByType(
    userId: string, 
    type: string
  ): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        sender:profiles!sender_id(id, full_name, email, avatar_url)
      `)
      .eq('recipient_id', userId)
      .eq('notification_type', type)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  }

  // Notification Delivery
  static async sendInAppNotification(notificationData: NotificationData): Promise<void> {
    await this.createNotification({
      recipientId: notificationData.recipientId,
      notificationType: notificationData.type as any,
      title: notificationData.title,
      message: notificationData.message,
      actionUrl: notificationData.actionUrl,
      metadata: notificationData.metadata,
      deliveryMethod: { in_app: true, email: false }
    });
  }

  static async sendEmailNotification(notificationData: NotificationData): Promise<void> {
    try {
      // Get recipient email
      const { data: recipient } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', notificationData.recipientId)
        .single();

      if (!recipient?.email) {
        console.warn('No email found for recipient:', notificationData.recipientId);
        return;
      }

      // Call email service
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          to: recipient.email,
          name: recipient.full_name || 'User',
          subject: notificationData.title,
          message: notificationData.message,
          actionUrl: notificationData.actionUrl
        }
      });

      if (error) {
        console.error('Failed to send email notification:', error);
      } else {
        // Mark email as sent
        await supabase
          .from('notifications')
          .update({
            email_sent: true,
            email_sent_at: new Date().toISOString()
          })
          .eq('recipient_id', notificationData.recipientId)
          .eq('title', notificationData.title);
      }
    } catch (error) {
      console.error('Email notification error:', error);
    }
  }

  static async scheduleNotification(
    notificationData: NotificationData, 
    scheduleTime: Date
  ): Promise<void> {
    // For now, create notification with future timestamp
    // In production, you might use a job queue system
    await this.createNotification({
      recipientId: notificationData.recipientId,
      notificationType: notificationData.type as any,
      title: notificationData.title,
      message: notificationData.message,
      actionUrl: notificationData.actionUrl,
      metadata: {
        ...notificationData.metadata,
        scheduled: true,
        scheduled_for: scheduleTime.toISOString()
      }
    });
  }

  // Notification Preferences (to be implemented with user settings)
  static async getUserNotificationPreferences(userId: string): Promise<Record<string, any>> {
    // Default preferences - in production, store in user preferences table
    return {
      email: {
        team_invitation: true,
        role_changed: true,
        project_assigned: true,
        content_shared: false,
        comment_mention: true,
        approval_request: true,
        system_alert: false,
        security_alert: true
      },
      in_app: {
        team_invitation: true,
        role_changed: true,
        project_assigned: true,
        content_shared: true,
        comment_mention: true,
        approval_request: true,
        system_alert: true,
        security_alert: true
      }
    };
  }

  // Real-time subscription for notifications
  static subscribeToUserNotifications(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`
      }, callback)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`
      }, callback)
      .subscribe();
  }

  // Cleanup expired notifications
  static async cleanupExpiredNotifications(): Promise<void> {
    const { error } = await supabase.rpc('cleanup_expired_notifications');
    if (error) {
      console.error('Failed to cleanup expired notifications:', error);
    }
  }

  // Bulk operations
  static async bulkMarkAsRead(notificationIds: string[], userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .in('id', notificationIds)
      .eq('recipient_id', userId);

    if (error) throw error;
  }

  static async bulkDelete(notificationIds: string[], userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .in('id', notificationIds)
      .eq('recipient_id', userId);

    if (error) throw error;
  }
}