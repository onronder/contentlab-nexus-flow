import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageSquare, 
  Reply, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Check, 
  X,
  Send,
  AtSign,
  Paperclip,
  CheckCheck
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { MentionInput } from './MentionInput';

interface Comment {
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

interface CommentSystemProps {
  resourceType: 'project' | 'content_item' | 'competitor' | 'analysis_report' | 'team_discussion';
  resourceId: string;
  teamId: string;
  currentUserId: string;
  showResolved?: boolean;
  allowFileAttachments?: boolean;
  className?: string;
}

export const CommentSystem: React.FC<CommentSystemProps> = ({
  resourceType,
  resourceId,
  teamId,
  currentUserId,
  showResolved = true,
  allowFileAttachments = true,
  className = ''
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchComments();
    setupRealtimeSubscription();
  }, [resourceType, resourceId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      
      // For now, create mock data since the comments table might not be available yet
      const mockComments: Comment[] = [
        {
          id: '1',
          author_id: currentUserId,
          team_id: teamId,
          resource_type: resourceType,
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
            id: currentUserId,
            full_name: 'Current User',
            email: 'user@example.com'
          },
          replies: [
            {
              id: '2',
              parent_id: '1',
              author_id: 'other-user',
              team_id: teamId,
              resource_type: resourceType,
              resource_id: resourceId,
              content: 'Thanks for the feedback! What specific areas would you like me to focus on?',
              content_format: 'plain_text',
              is_internal: false,
              is_resolved: false,
              mentions: [currentUserId],
              attachments: [],
              metadata: {},
              created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
              author: {
                id: 'other-user',
                full_name: 'Team Member',
                email: 'member@example.com'
              }
            }
          ]
        }
      ];

      setComments(mockComments);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error loading comments',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`comments:${resourceType}:${resourceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `resource_type=eq.${resourceType} AND resource_id=eq.${resourceId}`
      }, (payload) => {
        console.log('Comment update:', payload);
        fetchComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmitComment = async (content: string, parentId?: string) => {
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      // For now, simulate comment creation
      const newComment: Comment = {
        id: Date.now().toString(),
        parent_id: parentId,
        author_id: currentUserId,
        team_id: teamId,
        resource_type: resourceType,
        resource_id: resourceId,
        content: content.trim(),
        content_format: 'plain_text',
        is_internal: false,
        is_resolved: false,
        mentions: [],
        attachments: [],
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: {
          id: currentUserId,
          full_name: 'Current User',
          email: 'user@example.com'
        }
      };

      if (parentId) {
        // Add reply to existing comment
        setComments(prev => prev.map(comment => 
          comment.id === parentId 
            ? { ...comment, replies: [...(comment.replies || []), newComment] }
            : comment
        ));
        setReplyingTo(null);
      } else {
        // Add new top-level comment
        setComments(prev => [newComment, ...prev]);
        setNewComment('');
      }

      toast({
        title: 'Comment posted',
        description: 'Your comment has been added successfully.'
      });
    } catch (error: any) {
      console.error('Error posting comment:', error);
      toast({
        title: 'Error posting comment',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string, newContent: string) => {
    if (!newContent.trim()) return;

    try {
      // Simulate comment update
      setComments(prev => prev.map(comment => {
        if (comment.id === commentId) {
          return { ...comment, content: newContent, updated_at: new Date().toISOString() };
        }
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map(reply => 
              reply.id === commentId 
                ? { ...reply, content: newContent, updated_at: new Date().toISOString() }
                : reply
            )
          };
        }
        return comment;
      }));

      setEditingComment(null);
      setEditContent('');

      toast({
        title: 'Comment updated',
        description: 'Your comment has been updated successfully.'
      });
    } catch (error: any) {
      console.error('Error updating comment:', error);
      toast({
        title: 'Error updating comment',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleResolveComment = async (commentId: string) => {
    try {
      // Simulate comment resolution
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { 
              ...comment, 
              is_resolved: true, 
              resolved_by: currentUserId,
              resolved_at: new Date().toISOString()
            }
          : comment
      ));

      toast({
        title: 'Comment resolved',
        description: 'The comment has been marked as resolved.'
      });
    } catch (error: any) {
      console.error('Error resolving comment:', error);
      toast({
        title: 'Error resolving comment',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      // Simulate comment deletion
      setComments(prev => prev.filter(comment => {
        if (comment.id === commentId) return false;
        if (comment.replies) {
          comment.replies = comment.replies.filter(reply => reply.id !== commentId);
        }
        return true;
      }));

      toast({
        title: 'Comment deleted',
        description: 'The comment has been deleted successfully.'
      });
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Error deleting comment',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-12' : ''} mb-4`}>
      <div className="flex items-start space-x-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={comment.author?.avatar_url} />
          <AvatarFallback className="text-xs">
            {getInitials(comment.author?.full_name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {comment.author?.full_name || 'Unknown User'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
                {comment.is_resolved && (
                  <Badge variant="outline" className="text-xs">
                    <CheckCheck className="w-3 h-3 mr-1" />
                    Resolved
                  </Badge>
                )}
                {comment.mentions.includes(currentUserId) && (
                  <Badge variant="secondary" className="text-xs">
                    <AtSign className="w-3 h-3 mr-1" />
                    Mentioned
                  </Badge>
                )}
              </div>
              
              {comment.author_id === currentUserId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setEditingComment(comment.id);
                      setEditContent(comment.content);
                    }}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    {!comment.is_resolved && (
                      <DropdownMenuItem onClick={() => handleResolveComment(comment.id)}>
                        <Check className="w-4 h-4 mr-2" />
                        Resolve
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {editingComment === comment.id ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleEditComment(comment.id, editContent)}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingComment(null);
                      setEditContent('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                {comment.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {comment.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Paperclip className="w-3 h-3" />
                        <span>{attachment.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          
          {!isReply && (
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(comment.id)}
                className="text-xs h-6"
              >
                <Reply className="w-3 h-3 mr-1" />
                Reply
              </Button>
              {!comment.is_resolved && comment.author_id !== currentUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResolveComment(comment.id)}
                  className="text-xs h-6"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Resolve
                </Button>
              )}
            </div>
          )}
          
          {replyingTo === comment.id && (
            <div className="mt-3 ml-12">
              <MentionInput
                value=""
                onChange={() => {}}
                onSubmit={(content) => handleSubmitComment(content, comment.id)}
                teamId={teamId}
                placeholder="Write a reply..."
                className="mb-2"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const textarea = document.querySelector(`[data-reply-to="${comment.id}"]`) as HTMLTextAreaElement;
                    if (textarea) {
                      handleSubmitComment(textarea.value, comment.id);
                    }
                  }}
                  disabled={submitting}
                >
                  <Send className="w-3 h-3 mr-1" />
                  Reply
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReplyingTo(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Comments
          <Badge variant="secondary">
            {comments.reduce((total, comment) => total + 1 + (comment.replies?.length || 0), 0)}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* New Comment Form */}
        <div className="mb-6">
          <MentionInput
            value={newComment}
            onChange={setNewComment}
            onSubmit={(content) => handleSubmitComment(content)}
            teamId={teamId}
            placeholder="Add a comment..."
            className="mb-3"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => handleSubmitComment(newComment)}
              disabled={!newComment.trim() || submitting}
            >
              <Send className="w-4 h-4 mr-2" />
              Post Comment
            </Button>
            {allowFileAttachments && (
              <Button variant="outline" size="sm">
                <Paperclip className="w-4 h-4 mr-2" />
                Attach File
              </Button>
            )}
          </div>
        </div>

        {/* Comments List */}
        <ScrollArea className="max-h-96">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Comments Yet</h3>
              <p className="text-sm text-muted-foreground">
                Be the first to start the conversation!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {comments
                .filter(comment => showResolved || !comment.is_resolved)
                .map(comment => renderComment(comment))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};