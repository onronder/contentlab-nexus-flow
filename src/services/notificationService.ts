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
  // Notification Management - Using mock implementation until tables are available
  static async createNotification(notificationData: NotificationCreateInput): Promise<Notification> {
    // Create mock notification
    const mockNotification: Notification = {
      id: Date.now().toString(),
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
      is_read: false,
      email_sent: false,
      metadata: notificationData.metadata || {},
      expires_at: notificationData.expiresAt,
      created_at: new Date().toISOString()
    };

    console.log('Notification created:', mockNotification);

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

    return mockNotification;
  }

  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    // Mock implementation
    console.log('Marking notification as read:', notificationId, 'for user:', userId);
  }

  static async markAllAsRead(userId: string, teamId?: string): Promise<void> {
    // Mock implementation
    console.log('Marking all notifications as read for user:', userId, 'team:', teamId);
  }

  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    // Mock implementation
    console.log('Deleting notification:', notificationId, 'for user:', userId);
  }

  // Notification Queries - Using mock data
  static async getUserNotifications(
    userId: string, 
    filters?: NotificationFilters
  ): Promise<Notification[]> {
    // Return mock notifications for demonstration
    return this.getMockNotifications(userId, filters);
  }

  static async getUnreadCount(userId: string, teamId?: string): Promise<number> {
    // Mock implementation - return sample unread count
    return 3;
  }

  static async getNotificationsByType(
    userId: string, 
    type: string
  ): Promise<Notification[]> {
    // Mock implementation
    return this.getMockNotifications(userId).filter(n => n.notification_type === type);
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
        // Mock implementation for marking email as sent
        console.log('Email notification sent successfully to:', recipient.email);
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
    // Mock implementation for now
    console.log('Cleaning up expired notifications...');
  }

  // Helper method to generate mock notifications
  private static getMockNotifications(userId: string, filters?: NotificationFilters): Notification[] {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        recipient_id: userId,
        sender_id: 'sender-1',
        team_id: 'team-1',
        notification_type: 'comment_mention',
        title: 'You were mentioned in a comment',
        message: 'John Doe mentioned you in a comment on Project Alpha',
        action_url: '/projects/alpha/comments/123',
        priority: 'normal',
        is_read: false,
        email_sent: false,
        delivery_method: { in_app: true, email: false },
        metadata: {},
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
        email_sent: false,
        delivery_method: { in_app: true, email: false },
        metadata: {},
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ];

    let filtered = mockNotifications;

    if (filters?.type) {
      filtered = filtered.filter(n => n.notification_type === filters.type);
    }
    if (filters?.isRead !== undefined) {
      filtered = filtered.filter(n => n.is_read === filters.isRead);
    }
    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  // Bulk operations
  static async bulkMarkAsRead(notificationIds: string[], userId: string): Promise<void> {
    // Mock implementation
    console.log('Bulk marking notifications as read:', notificationIds, 'for user:', userId);
  }

  static async bulkDelete(notificationIds: string[], userId: string): Promise<void> {
    // Mock implementation
    console.log('Bulk deleting notifications:', notificationIds, 'for user:', userId);
  }
}