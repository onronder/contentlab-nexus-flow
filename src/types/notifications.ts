// Notification Types for ContentLab Nexus

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationCategory = 'general' | 'mention' | 'message' | 'task' | 'project' | 'system';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  priority: NotificationPriority;
  is_read: boolean;
  created_at: string;
  team_id?: string;
  action_url?: string;
  metadata: Record<string, any>;
}

export interface NotificationCreateInput {
  recipient_id: string;
  sender_id?: string;
  team_id?: string;
  notification_type: string;
  title: string;
  message: string;
  action_url?: string;
  priority?: NotificationPriority;
  metadata?: Record<string, any>;
}

export interface NotificationFilters {
  category?: NotificationCategory;
  priority?: NotificationPriority;
  is_read?: boolean;
  team_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}