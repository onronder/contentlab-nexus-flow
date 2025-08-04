// Team Communication Types for ContentLab Nexus

export type ChannelType = 'general' | 'project' | 'direct' | 'announcement';
export type MessageType = 'text' | 'file' | 'image' | 'mention' | 'system';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationCategory = 'general' | 'mention' | 'message' | 'task' | 'project' | 'system';

export interface TeamChannel {
  id: string;
  team_id: string;
  name: string;
  description?: string;
  channel_type: ChannelType;
  is_private: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
  is_archived: boolean;
  unread_count?: number;
  last_message?: TeamMessage;
}

export interface TeamMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  reply_to_id?: string;
  mentions: string[];
  attachments: MessageAttachment[];
  reactions: Record<string, string[]>;
  is_edited: boolean;
  edited_at?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
  // Relations
  sender?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
  reply_to?: TeamMessage;
  read_by?: MessageRead[];
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size?: number;
  metadata?: Record<string, any>;
}

export interface MessageRead {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface EnhancedNotification {
  id: string;
  recipient_id: string;
  sender_id?: string;
  team_id?: string;
  channel_id?: string;
  notification_type: string;
  title: string;
  message: string;
  action_url?: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  is_read: boolean;
  read_at?: string;
  delivery_channels: {
    in_app: boolean;
    email: boolean;
    push: boolean;
  };
  scheduled_for?: string;
  expires_at?: string;
  metadata: Record<string, any>;
  created_at: string;
  // Relations
  sender?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
  channel?: TeamChannel;
}

// Input types for creation and updates
export interface ChannelCreateInput {
  team_id: string;
  name: string;
  description?: string;
  channel_type?: ChannelType;
  is_private?: boolean;
  metadata?: Record<string, any>;
}

export interface ChannelUpdateInput {
  name?: string;
  description?: string;
  is_private?: boolean;
  is_archived?: boolean;
  metadata?: Record<string, any>;
}

export interface MessageCreateInput {
  channel_id: string;
  content: string;
  message_type?: MessageType;
  reply_to_id?: string;
  mentions?: string[];
  attachments?: MessageAttachment[];
  metadata?: Record<string, any>;
}

export interface MessageUpdateInput {
  content?: string;
  mentions?: string[];
  attachments?: MessageAttachment[];
  metadata?: Record<string, any>;
}

export interface NotificationCreateInput {
  recipient_id: string;
  sender_id?: string;
  team_id?: string;
  channel_id?: string;
  notification_type: string;
  title: string;
  message: string;
  action_url?: string;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  delivery_channels?: {
    in_app?: boolean;
    email?: boolean;
    push?: boolean;
  };
  scheduled_for?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
}

// API Response types
export interface ChannelsResponse {
  channels: TeamChannel[];
  total: number;
  page: number;
  limit: number;
}

export interface MessagesResponse {
  messages: TeamMessage[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface NotificationsResponse {
  notifications: EnhancedNotification[];
  total: number;
  unread_count: number;
  page: number;
  limit: number;
}

// Query filter types
export interface MessageFilters {
  channel_id?: string;
  sender_id?: string;
  message_type?: MessageType;
  date_from?: string;
  date_to?: string;
  search?: string;
  mentioned_user?: string;
}

export interface NotificationFilters {
  category?: NotificationCategory;
  priority?: NotificationPriority;
  is_read?: boolean;
  team_id?: string;
  channel_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

// Sort options
export interface MessageSortOptions {
  field: 'created_at' | 'updated_at';
  direction: 'asc' | 'desc';
}

export interface NotificationSortOptions {
  field: 'created_at' | 'priority' | 'category';
  direction: 'asc' | 'desc';
}

// Pagination
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

// Combined query options
export interface MessageQueryOptions extends PaginationOptions {
  filters?: MessageFilters;
  sort?: MessageSortOptions;
}

export interface NotificationQueryOptions extends PaginationOptions {
  filters?: NotificationFilters;
  sort?: NotificationSortOptions;
}

// Real-time events
export interface MessageEvent {
  type: 'message_created' | 'message_updated' | 'message_deleted' | 'message_reaction';
  message: TeamMessage;
  channel_id: string;
  team_id: string;
}

export interface ChannelEvent {
  type: 'channel_created' | 'channel_updated' | 'channel_archived';
  channel: TeamChannel;
  team_id: string;
}

export interface NotificationEvent {
  type: 'notification_created' | 'notification_read' | 'notification_deleted';
  notification: EnhancedNotification;
  recipient_id: string;
}

// Typing indicators
export interface TypingIndicator {
  channel_id: string;
  user_id: string;
  user_name: string;
  started_at: string;
}

// Team presence
export interface TeamPresence {
  user_id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_seen_at: string;
  current_channel_id?: string;
}

// Message reactions
export interface MessageReaction {
  emoji: string;
  users: string[];
  count: number;
}

// Error types
export interface TeamCommunicationError {
  code: string;
  message: string;
  field?: string;
}