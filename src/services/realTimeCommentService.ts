import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ResourceType = Database['public']['Enums']['comment_resource_type'];
type ContentFormat = Database['public']['Enums']['content_format'];

export interface ProjectComment {
  id: string;
  parent_id?: string;
  author_id: string;
  team_id: string;
  resource_type: ResourceType;
  resource_id: string;
  content: string;
  content_format: ContentFormat;
  is_internal: boolean;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  mentions: string[];
  attachments: Array<{ name: string; url: string; size: number; type: string }>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  replies?: ProjectComment[];
  author?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

export interface ProjectCommentCreateInput {
  parent_id?: string;
  team_id: string;
  resource_type: ResourceType;
  resource_id: string;
  content: string;
  is_internal?: boolean;
  mentions?: string[];
  attachments?: Array<{ name: string; url: string; size: number; type: string }>;
  metadata?: Record<string, any>;
}

export class RealTimeCommentService {
  static async getComments(resourceType: ResourceType, resourceId: string): Promise<ProjectComment[]> {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          author:profiles!comments_author_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform and fetch replies for each comment
      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: replies, error: repliesError } = await supabase
            .from('comments')
            .select(`
              *,
              author:profiles!comments_author_id_fkey(id, full_name, email, avatar_url)
            `)
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true });

          if (repliesError) {
            console.error('Error fetching replies:', repliesError);
          }

          // Transform the comment data to match our interface
          const transformedComment: ProjectComment = {
            ...comment,
            mentions: Array.isArray(comment.mentions) ? comment.mentions as string[] : [],
            attachments: Array.isArray(comment.attachments) ? comment.attachments as Array<{ name: string; url: string; size: number; type: string }> : [],
            metadata: (comment.metadata as Record<string, any>) || {},
            replies: (replies || []).map(reply => ({
              ...reply,
              mentions: Array.isArray(reply.mentions) ? reply.mentions as string[] : [],
              attachments: Array.isArray(reply.attachments) ? reply.attachments as Array<{ name: string; url: string; size: number; type: string }> : [],
              metadata: (reply.metadata as Record<string, any>) || {},
              author: Array.isArray(reply.author) ? reply.author[0] : reply.author
            })),
            author: Array.isArray(comment.author) ? comment.author[0] : comment.author
          };

          return transformedComment;
        })
      );

      return commentsWithReplies;
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }

  static async createComment(commentData: ProjectCommentCreateInput): Promise<ProjectComment | null> {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          author_id: userId,
          team_id: commentData.team_id,
          resource_type: commentData.resource_type,
          resource_id: commentData.resource_id,
          content: commentData.content,
          parent_id: commentData.parent_id,
          content_format: 'plain_text' as ContentFormat,
          is_internal: commentData.is_internal || false,
          mentions: commentData.mentions || [],
          attachments: commentData.attachments || [],
          metadata: commentData.metadata || {},
          is_resolved: false
        })
        .select(`
          *,
          author:profiles!comments_author_id_fkey(id, full_name, email, avatar_url)
        `)
        .single();

      if (error) throw error;

      return {
        ...data,
        mentions: Array.isArray(data.mentions) ? data.mentions as string[] : [],
        attachments: Array.isArray(data.attachments) ? data.attachments as Array<{ name: string; url: string; size: number; type: string }> : [],
        metadata: (data.metadata as Record<string, any>) || {},
        author: Array.isArray(data.author) ? data.author[0] : data.author,
        replies: []
      };
    } catch (error) {
      console.error('Error creating comment:', error);
      return null;
    }
  }

  static async updateComment(commentId: string, content: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('comments')
        .update({ 
          content,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating comment:', error);
      return false;
    }
  }

  static async deleteComment(commentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      return false;
    }
  }

  static async resolveComment(commentId: string): Promise<boolean> {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('comments')
        .update({
          is_resolved: true,
          resolved_by: userId,
          resolved_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error resolving comment:', error);
      return false;
    }
  }

  static setupRealtimeSubscription(
    resourceType: ResourceType, 
    resourceId: string, 
    onUpdate: () => void
  ) {
    return supabase
      .channel(`comments:${resourceType}:${resourceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `resource_type=eq.${resourceType} AND resource_id=eq.${resourceId}`
      }, () => {
        onUpdate();
      })
      .subscribe();
  }
}