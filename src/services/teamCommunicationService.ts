import { supabase } from '@/integrations/supabase/client';

export class TeamCommunicationService {
  // ========== CHANNEL MANAGEMENT ==========
  
  static async getTeamChannels(teamId: string) {
    try {
      const { data, error } = await supabase
        .from('team_channels')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_archived', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching team channels:', error);
      return [];
    }
  }

  static async createChannel(channelData: any) {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('team_channels')
        .insert({
          team_id: channelData.team_id,
          name: channelData.name,
          description: channelData.description,
          channel_type: channelData.channel_type || 'general',
          is_private: channelData.is_private || false,
          metadata: channelData.metadata || {},
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating channel:', error);
      return null;
    }
  }

  static async updateChannel(channelId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('team_channels')
        .update(updates)
        .eq('id', channelId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating channel:', error);
      return null;
    }
  }

  static async deleteChannel(channelId: string) {
    try {
      const { error } = await supabase
        .from('team_channels')
        .update({ is_archived: true })
        .eq('id', channelId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting channel:', error);
      return false;
    }
  }

  // ========== MESSAGE MANAGEMENT ==========

  static async getChannelMessages(channelId: string, options: any = {}) {
    try {
      const { page = 1, limit = 50, filters = {} } = options;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('team_messages')
        .select('*')
        .eq('channel_id', channelId)
        .eq('is_deleted', false);

      // Apply filters
      if (filters.sender_id) {
        query = query.eq('sender_id', filters.sender_id);
      }
      if (filters.message_type) {
        query = query.eq('message_type', filters.message_type);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      if (filters.search) {
        query = query.ilike('content', `%${filters.search}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        messages: (data || []).reverse(), // Reverse to show oldest first
        total: count || 0,
        page,
        limit,
        has_more: (count || 0) > offset + limit
      };
    } catch (error) {
      console.error('Error fetching messages:', error);
      return { messages: [], total: 0, page: 1, limit: 50, has_more: false };
    }
  }

  static async sendMessage(messageData: any) {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('team_messages')
        .insert({
          channel_id: messageData.channel_id,
          content: messageData.content,
          message_type: messageData.message_type || 'text',
          reply_to_id: messageData.reply_to_id,
          mentions: messageData.mentions || [],
          attachments: messageData.attachments || [],
          metadata: messageData.metadata || {},
          sender_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Create notifications for mentions
      if (messageData.mentions && messageData.mentions.length > 0) {
        await this.createMentionNotifications(data.id, messageData.mentions, messageData.channel_id);
      }

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  static async updateMessage(messageId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('team_messages')
        .update({
          ...updates,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating message:', error);
      return null;
    }
  }

  static async deleteMessage(messageId: string) {
    try {
      const { error } = await supabase
        .from('team_messages')
        .update({ is_deleted: true })
        .eq('id', messageId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  static async markMessageAsRead(messageId: string) {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return false;

      const { error } = await supabase
        .from('team_message_reads')
        .upsert({
          message_id: messageId,
          user_id: user.id,
          read_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  }

  // ========== NOTIFICATION MANAGEMENT ==========

  static async getUserNotifications(userId: string, options: any = {}) {
    try {
      const { page = 1, limit = 20, filters = {} } = options;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('enhanced_notifications')
        .select('*')
        .eq('recipient_id', userId);

      // Apply filters
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.is_read !== undefined) {
        query = query.eq('is_read', filters.is_read);
      }
      if (filters.team_id) {
        query = query.eq('team_id', filters.team_id);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Get unread count
      const { count: unreadCount } = await supabase
        .from('enhanced_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      return {
        notifications: data || [],
        total: count || 0,
        unread_count: unreadCount || 0,
        page,
        limit
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { notifications: [], total: 0, unread_count: 0, page: 1, limit: 20 };
    }
  }

  static async createNotification(notificationData: any) {
    try {
      const { data, error } = await supabase
        .from('enhanced_notifications')
        .insert(notificationData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  static async markNotificationAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('enhanced_notifications')
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

  static async markAllNotificationsAsRead(userId: string, teamId?: string) {
    try {
      let query = supabase
        .from('enhanced_notifications')
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
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  static async deleteNotification(notificationId: string) {
    try {
      const { error } = await supabase
        .from('enhanced_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  // ========== REAL-TIME SUBSCRIPTIONS ==========

  static subscribeToChannelMessages(channelId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`channel-messages:${channelId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'team_messages',
        filter: `channel_id=eq.${channelId}`
      }, callback)
      .subscribe();
  }

  static subscribeToTeamChannels(teamId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`team-channels:${teamId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'team_channels',
        filter: `team_id=eq.${teamId}`
      }, callback)
      .subscribe();
  }

  static subscribeToUserNotifications(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`user-notifications:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'enhanced_notifications',
        filter: `recipient_id=eq.${userId}`
      }, callback)
      .subscribe();
  }

  // ========== HELPER METHODS ==========

  private static async createMentionNotifications(
    messageId: string,
    mentionedUsers: string[],
    channelId: string
  ) {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      // Get channel and team info
      const { data: channel } = await supabase
        .from('team_channels')
        .select('name, team_id')
        .eq('id', channelId)
        .single();

      if (!channel) return;

      // Create notifications for each mentioned user
      const notifications = mentionedUsers.map(userId => ({
        recipient_id: userId,
        sender_id: user.id,
        team_id: channel.team_id,
        channel_id: channelId,
        notification_type: 'mention',
        title: 'You were mentioned',
        message: `${user.email} mentioned you in #${channel.name}`,
        action_url: `/team/chat/${channelId}?message=${messageId}`,
        priority: 'normal',
        category: 'mention',
        delivery_channels: { in_app: true, email: false, push: false }
      }));

      await supabase
        .from('enhanced_notifications')
        .insert(notifications);
    } catch (error) {
      console.error('Error creating mention notifications:', error);
    }
  }

  static async searchMessages(teamId: string, query: string, options: any = {}) {
    try {
      const { limit = 20, channelId } = options;

      let searchQuery = supabase
        .from('team_messages')
        .select('*')
        .ilike('content', `%${query}%`)
        .eq('is_deleted', false);

      if (channelId) {
        searchQuery = searchQuery.eq('channel_id', channelId);
      } else {
        // Filter by team channels
        const { data: teamChannels } = await supabase
          .from('team_channels')
          .select('id')
          .eq('team_id', teamId);

        if (teamChannels) {
          const channelIds = teamChannels.map(c => c.id);
          searchQuery = searchQuery.in('channel_id', channelIds);
        }
      }

      const { data, error } = await searchQuery
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }
}