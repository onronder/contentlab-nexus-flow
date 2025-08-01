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
  // Comment Management - Using mock implementation until tables are available
  static async createComment(commentData: CommentCreateInput): Promise<Comment> {
    // Create mock comment for demonstration
    const mockComment: Comment = {
      id: Date.now().toString(),
      parent_id: commentData.parentId,
      author_id: commentData.authorId,
      team_id: commentData.teamId,
      resource_type: commentData.resourceType,
      resource_id: commentData.resourceId,
      content: commentData.content,
      content_format: commentData.contentFormat || 'plain_text',
      is_internal: commentData.isInternal || false,
      is_resolved: false,
      mentions: commentData.mentions || [],
      attachments: commentData.attachments || [],
      metadata: commentData.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: {
        id: commentData.authorId,
        full_name: 'Current User',
        email: 'user@example.com'
      }
    };

    console.log('Comment created:', mockComment);
    return mockComment;
  }

  static async updateComment(
    commentId: string, 
    updates: CommentUpdateInput
  ): Promise<Comment> {
    // Mock implementation
    console.log('Comment updated:', commentId, updates);
    
    // Return mock updated comment
    return {
      id: commentId,
      author_id: 'user-1',
      team_id: 'team-1',
      resource_type: 'project',
      resource_id: 'project-1',
      content: updates.content || 'Updated content',
      content_format: updates.contentFormat || 'plain_text',
      is_internal: false,
      is_resolved: false,
      mentions: [],
      attachments: [],
      metadata: updates.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  static async deleteComment(commentId: string, deletedBy: string): Promise<void> {
    // Mock implementation
    console.log('Comment deleted:', commentId, 'by:', deletedBy);
  }

  static async resolveComment(commentId: string, resolvedBy: string): Promise<void> {
    // Mock implementation
    console.log('Comment resolved:', commentId, 'by:', resolvedBy);
  }

  // Comment Queries - Using mock data until tables are available
  static async getComments(
    resourceType: string, 
    resourceId: string
  ): Promise<Comment[]> {
    // Return mock comments for demonstration
    return this.getMockComments(resourceType, resourceId);
  }

  static async getCommentThread(parentId: string): Promise<Comment[]> {
    // Mock implementation
    return [];
  }

  static async getUserComments(userId: string, teamId: string): Promise<Comment[]> {
    // Mock implementation
    return this.getMockComments('project', 'mock-project').filter(c => c.author_id === userId);
  }

  static async getUnresolvedComments(teamId: string): Promise<Comment[]> {
    // Mock implementation
    return this.getMockComments('project', 'mock-project').filter(c => !c.is_resolved);
  }

  // Mention Handling - Simplified mock implementation
  static async processMentions(content: string, teamId: string): Promise<string[]> {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    // Mock mention processing for demonstration
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(`user-${Math.random().toString(36).substr(2, 9)}`);
    }

    return [...new Set(mentions)]; // Remove duplicates
  }

  static async notifyMentionedUsers(mentions: string[], commentId: string): Promise<void> {
    // Mock implementation for demonstration
    console.log('Notifying mentioned users:', mentions, 'for comment:', commentId);
  }

  static async getMentionSuggestions(teamId: string, query: string): Promise<User[]> {
    // Mock team member suggestions
    const mockUsers: User[] = [
      { id: 'user-1', full_name: 'John Doe', email: 'john@example.com' },
      { id: 'user-2', full_name: 'Jane Smith', email: 'jane@example.com' },
      { id: 'user-3', full_name: 'Mike Johnson', email: 'mike@example.com' }
    ];

    return mockUsers.filter(user =>
      user.full_name?.toLowerCase().includes(query.toLowerCase()) ||
      user.email?.toLowerCase().includes(query.toLowerCase())
    );
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

  // Generate mock comments for demonstration
  private static getMockComments(resourceType: string, resourceId: string): Comment[] {
    return [
      {
        id: '1',
        author_id: 'user-1',
        team_id: 'team-1',
        resource_type: resourceType as any,
        resource_id: resourceId,
        content: 'This looks great! I have a few suggestions for improvements.',
        content_format: 'plain_text',
        is_internal: false,
        is_resolved: false,
        mentions: [],
        attachments: [],
        metadata: {},
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        author: {
          id: 'user-1',
          full_name: 'John Doe',
          email: 'john@example.com'
        },
        replies: [
          {
            id: '2',
            parent_id: '1',
            author_id: 'user-2',
            team_id: 'team-1',
            resource_type: resourceType as any,
            resource_id: resourceId,
            content: 'Thanks for the feedback! What specific areas would you like me to focus on?',
            content_format: 'plain_text',
            is_internal: false,
            is_resolved: false,
            mentions: ['user-1'],
            attachments: [],
            metadata: {},
            created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            author: {
              id: 'user-2',
              full_name: 'Jane Smith',
              email: 'jane@example.com'
            }
          }
        ]
      }
    ];
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