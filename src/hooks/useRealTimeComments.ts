import { useState, useEffect } from 'react';
import { RealTimeCommentService, ProjectComment } from '@/services/realTimeCommentService';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ResourceType = Database['public']['Enums']['comment_resource_type'];

export function useRealTimeComments(resourceType: ResourceType, resourceId: string, teamId: string) {
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = useCurrentUserId();

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await RealTimeCommentService.getComments(resourceType, resourceId);
      setComments(data);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [resourceType, resourceId]);

  useEffect(() => {
    const channel = RealTimeCommentService.setupRealtimeSubscription(
      resourceType,
      resourceId,
      fetchComments
    );

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resourceType, resourceId]);

  const addComment = async (content: string, parentId?: string) => {
    if (!userId) {
      setError('User not authenticated');
      return false;
    }

    try {
      const comment = await RealTimeCommentService.createComment({
        parent_id: parentId,
        team_id: teamId,
        resource_type: resourceType,
        resource_id: resourceId,
        content: content.trim(),
        is_internal: false,
        mentions: [],
        attachments: [],
        metadata: {}
      });

      if (comment) {
        // Optimistically update local state
        if (parentId) {
          setComments(prev => prev.map(c => 
            c.id === parentId 
              ? { ...c, replies: [...(c.replies || []), comment] }
              : c
          ));
        } else {
          setComments(prev => [comment, ...prev]);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
      return false;
    }
  };

  const updateComment = async (commentId: string, content: string) => {
    try {
      const success = await RealTimeCommentService.updateComment(commentId, content);
      if (success) {
        // Optimistically update local state
        setComments(prev => prev.map(comment => {
          if (comment.id === commentId) {
            return { ...comment, content, updated_at: new Date().toISOString() };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map(reply => 
                reply.id === commentId 
                  ? { ...reply, content, updated_at: new Date().toISOString() }
                  : reply
              )
            };
          }
          return comment;
        }));
      }
      return success;
    } catch (err) {
      console.error('Error updating comment:', err);
      setError('Failed to update comment');
      return false;
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const success = await RealTimeCommentService.deleteComment(commentId);
      if (success) {
        // Optimistically update local state
        setComments(prev => prev.filter(comment => {
          if (comment.id === commentId) return false;
          if (comment.replies) {
            comment.replies = comment.replies.filter(reply => reply.id !== commentId);
          }
          return true;
        }));
      }
      return success;
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Failed to delete comment');
      return false;
    }
  };

  const resolveComment = async (commentId: string) => {
    try {
      const success = await RealTimeCommentService.resolveComment(commentId);
      if (success) {
        // Optimistically update local state
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { 
                ...comment, 
                is_resolved: true, 
                resolved_by: userId,
                resolved_at: new Date().toISOString()
              }
            : comment
        ));
      }
      return success;
    } catch (err) {
      console.error('Error resolving comment:', err);
      setError('Failed to resolve comment');
      return false;
    }
  };

  return {
    comments,
    loading,
    error,
    addComment,
    updateComment,
    deleteComment,
    resolveComment,
    refetch: fetchComments
  };
}