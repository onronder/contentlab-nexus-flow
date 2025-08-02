import React, { useState, useRef } from 'react';
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
import { useRealTimeComments } from '@/hooks/useRealTimeComments';
import { MentionInput } from './MentionInput';
import type { ProjectComment as CommentType } from '@/services/realTimeCommentService';
import type { Database } from '@/integrations/supabase/types';

type ResourceType = Database['public']['Enums']['comment_resource_type'];

interface CommentSystemProps {
  resourceType: ResourceType;
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
  const {
    comments,
    loading,
    error,
    addComment,
    updateComment,
    deleteComment,
    resolveComment
  } = useRealTimeComments(resourceType, resourceId, teamId);

  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Show error toast if there's an error
  React.useEffect(() => {
    if (error) {
      toast({
        title: 'Error loading comments',
        description: error,
        variant: 'destructive'
      });
    }
  }, [error, toast]);

  const handleSubmitComment = async (content: string, parentId?: string) => {
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const success = await addComment(content, parentId);
      
      if (success) {
        if (parentId) {
          setReplyingTo(null);
        } else {
          setNewComment('');
        }

        toast({
          title: 'Comment posted',
          description: 'Your comment has been added successfully.'
        });
      } else {
        throw new Error('Failed to post comment');
      }
    } catch (error: any) {
      console.error('Error posting comment:', error);
      toast({
        title: 'Error posting comment',
        description: error.message || 'Failed to post comment',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string, newContent: string) => {
    if (!newContent.trim()) return;

    try {
      const success = await updateComment(commentId, newContent);
      
      if (success) {
        setEditingComment(null);
        setEditContent('');

        toast({
          title: 'Comment updated',
          description: 'Your comment has been updated successfully.'
        });
      } else {
        throw new Error('Failed to update comment');
      }
    } catch (error: any) {
      console.error('Error updating comment:', error);
      toast({
        title: 'Error updating comment',
        description: error.message || 'Failed to update comment',
        variant: 'destructive'
      });
    }
  };

  const handleResolveComment = async (commentId: string) => {
    try {
      const success = await resolveComment(commentId);
      
      if (success) {
        toast({
          title: 'Comment resolved',
          description: 'The comment has been marked as resolved.'
        });
      } else {
        throw new Error('Failed to resolve comment');
      }
    } catch (error: any) {
      console.error('Error resolving comment:', error);
      toast({
        title: 'Error resolving comment',
        description: error.message || 'Failed to resolve comment',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const success = await deleteComment(commentId);
      
      if (success) {
        toast({
          title: 'Comment deleted',
          description: 'The comment has been deleted successfully.'
        });
      } else {
        throw new Error('Failed to delete comment');
      }
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Error deleting comment',
        description: error.message || 'Failed to delete comment',
        variant: 'destructive'
      });
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderComment = (comment: CommentType, isReply = false) => (
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