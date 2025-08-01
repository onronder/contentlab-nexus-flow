import { supabase } from '@/integrations/supabase/client';

export interface CommentCreateInput {
  parentId?: string;
  authorId: string;
  teamId: string;
  resourceType: 'project' | 'content_item' | 'competitor' | 'analysis_report' | 'team_discussion';
  resourceId: string;
  content: string;
  contentFormat?: 'plain_text' | 'markdown' | 'html';
  isInternal?: boolean;
  mentions?: string[];
  attachments?: Array<{ name: string; url: string; size: number; type: string }>;
  metadata?: Record<string, any>;
}

export interface CommentUpdateInput {
  content?: string;
  contentFormat?: 'plain_text' | 'markdown' | 'html';
  metadata?: Record<string, any>;
}

export interface Comment {
  id: string;
  parent_id?: string;
  author_id: string;
  team_id: string;
  resource_type: string;
  resource_id: string;
  content: string;
  content_format: string;
  is_internal: boolean;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  mentions: string[];
  attachments: Array<{ name: string; url: string; size: number; type: string }>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
  author?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

export interface User {
  id: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
}

export class CommentService {
  // Comment Management
  static async createComment(commentData: CommentCreateInput): Promise<Comment> {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        parent_id: commentData.parentId,
        author_id: commentData.authorId,
        team_id: commentData.teamId,
        resource_type: commentData.resourceType,
        resource_id: commentData.resourceId,
        content: commentData.content,
        content_format: commentData.contentFormat || 'plain_text',
        is_internal: commentData.isInternal || false,
        mentions: commentData.mentions || [],
        attachments: commentData.attachments || [],
        metadata: commentData.metadata || {}
      })
      .select(`
        *,
        author:profiles!author_id(id, full_name, email, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Process mentions and send notifications
    if (commentData.mentions && commentData.mentions.length > 0) {
      await this.notifyMentionedUsers(commentData.mentions, data.id);
    }

    return data;
  }

  static async updateComment(
    commentId: string, 
    updates: CommentUpdateInput
  ): Promise<Comment> {
    const { data, error } = await supabase
      .from('comments')
      .update(updates)
      .eq('id', commentId)
      .select(`
        *,
        author:profiles!author_id(id, full_name, email, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteComment(commentId: string, deletedBy: string): Promise<void> {
    // Soft delete by marking as deleted in metadata
    const { error } = await supabase
      .from('comments')
      .update({
        content: '[Comment deleted]',
        metadata: { deleted: true, deleted_by: deletedBy, deleted_at: new Date().toISOString() }
      })
      .eq('id', commentId);

    if (error) throw error;
  }

  static async resolveComment(commentId: string, resolvedBy: string): Promise<void> {
    const { error } = await supabase.rpc('resolve_comment', {
      p_comment_id: commentId,
      p_resolved_by: resolvedBy
    });

    if (error) throw error;
  }

  // Comment Queries
  static async getComments(
    resourceType: string, 
    resourceId: string
  ): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles!author_id(id, full_name, email, avatar_url),
        replies:comments!parent_id(
          *,
          author:profiles!author_id(id, full_name, email, avatar_url)
        )
      `)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return this.buildCommentTree(data || []);
  }

  static async getCommentThread(parentId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles!author_id(id, full_name, email, avatar_url)
      `)
      .eq('parent_id', parentId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async getUserComments(userId: string, teamId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles!author_id(id, full_name, email, avatar_url)
      `)
      .eq('author_id', userId)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getUnresolvedComments(teamId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles!author_id(id, full_name, email, avatar_url)
      `)
      .eq('team_id', teamId)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Mention Handling
  static async processMentions(content: string, teamId: string): Promise<string[]> {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      const username = match[1];
      
      // Try to find user by email or name
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .or(`email.ilike.%${username}%,full_name.ilike.%${username}%`);

      if (!error && users && users.length > 0) {
        // Check if user is team member
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', teamId)
          .eq('user_id', users[0].id)
          .eq('is_active', true)
          .single();

        if (teamMember) {
          mentions.push(users[0].id);
        }
      }
    }

    return [...new Set(mentions)]; // Remove duplicates
  }

  static async notifyMentionedUsers(mentions: string[], commentId: string): Promise<void> {
    for (const userId of mentions) {
      try {
        // Get comment details for notification
        const { data: comment } = await supabase
          .from('comments')
          .select(`
            *,
            author:profiles!author_id(full_name)
          `)
          .eq('id', commentId)
          .single();

        if (comment) {
          // Create notification
          await supabase
            .from('notifications')
            .insert({
              recipient_id: userId,
              sender_id: comment.author_id,
              team_id: comment.team_id,
              notification_type: 'comment_mention',
              title: 'You were mentioned in a comment',
              message: `${comment.author?.full_name || 'Someone'} mentioned you in a comment: "${comment.content.slice(0, 100)}..."`,
              action_url: `/team/${comment.team_id}/comments/${commentId}`,
              resource_type: 'comment',
              resource_id: commentId,
              priority: 'normal'
            });
        }
      } catch (error) {
        console.error('Failed to notify mentioned user:', error);
      }
    }
  }

  static async getMentionSuggestions(teamId: string, query: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        user_id,
        profiles!user_id(id, full_name, email, avatar_url)
      `)
      .eq('team_id', teamId)
      .eq('is_active', true)
      .eq('status', 'active');

    if (error) throw error;

    const users = (data || [])
      .map(member => member.profiles)
      .filter(profile => profile && (
        profile.full_name?.toLowerCase().includes(query.toLowerCase()) ||
        profile.email?.toLowerCase().includes(query.toLowerCase())
      ))
      .slice(0, 10);

    return users as User[];
  }

  // Helper Methods
  private static buildCommentTree(comments: any[]): Comment[] {
    return comments.map(comment => ({
      ...comment,
      replies: (comment.replies || []).sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }));
  }

  // Real-time subscription for comments
  static subscribeToComments(
    resourceType: string,
    resourceId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`comments:${resourceType}:${resourceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `resource_type=eq.${resourceType} and resource_id=eq.${resourceId}`
      }, callback)
      .subscribe();
  }
}