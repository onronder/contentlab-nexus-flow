import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Send, Paperclip, Smile, MoreVertical } from 'lucide-react';
import { useWebSocketCollaboration } from '@/hooks/useWebSocketCollaboration';
import { useTeamCommunication } from '@/hooks/useTeamCommunication';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { TypingIndicator } from './TypingIndicator';
import { MessageReactions } from './MessageReactions';

interface EnhancedRealTimeChatProps {
  teamId: string;
  channelId?: string;
  className?: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  message_type: string;
  metadata?: any;
  attachments?: any[];
  reactions?: any[];
  sender?: {
    full_name: string;
    email: string;
  };
}

export function EnhancedRealTimeChat({ teamId, channelId, className = '' }: EnhancedRealTimeChatProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { channels, loading: communicationLoading } = useTeamCommunication(teamId);
  
  const {
    isConnected,
    typingUsers,
    sendTypingStart,
    sendTypingStop,
    sendMessage: sendWebSocketMessage
  } = useWebSocketCollaboration({
    teamId,
    resourceId: channelId,
    resourceType: 'content',
    onMessage: (wsMessage) => {
      if (wsMessage.type === 'text_change' && wsMessage.data?.message) {
        // Handle real-time message updates
        setMessages(prev => {
          const exists = prev.find(m => m.id === wsMessage.data.message.id);
          if (exists) {
            return prev.map(m => m.id === wsMessage.data.message.id ? wsMessage.data.message : m);
          } else {
            return [...prev, wsMessage.data.message].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          }
        });
        scrollToBottom();
      }
    }
  });

  // Get the current channel or default
  const currentChannel = channels.find(c => c.id === channelId) || channels[0];

  // Load messages for current channel
  useEffect(() => {
    if (currentChannel?.id) {
      // This would typically load messages from the team communication service
      // For now, we'll use placeholder data
      setMessages([]);
    }
  }, [currentChannel?.id]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      sendTypingStart();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingStop();
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !currentChannel) return;

    const messageContent = message.trim();
    setMessage('');

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      sendTypingStop();
    }

    try {
      // Create optimistic message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        content: messageContent,
        sender_id: user?.id || '',
        created_at: new Date().toISOString(),
        message_type: 'text',
        sender: {
          full_name: user?.user_metadata?.full_name || '',
          email: user?.email || ''
        }
      };

      // Add to local state immediately
      setMessages(prev => [...prev, optimisticMessage]);
      scrollToBottom();

      // Send via WebSocket for real-time updates
      sendWebSocketMessage({
        type: 'text_change',
        userId: user?.id,
        teamId,
        resourceId: currentChannel.id,
        resourceType: 'content',
        data: {
          message: optimisticMessage,
          action: 'create'
        }
      });

      // TODO: Also send to backend service for persistence
      // await teamCommunicationService.sendMessage({
      //   channel_id: currentChannel.id,
      //   content: messageContent,
      //   message_type: 'text'
      // });

    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else {
      handleTyping();
    }
  };

  const handleReactionAdd = (messageId: string, emoji: string) => {
    // TODO: Implement reaction handling
    console.log('Add reaction:', messageId, emoji);
  };

  const handleReactionRemove = (messageId: string, emoji: string) => {
    // TODO: Implement reaction removal
    console.log('Remove reaction:', messageId, emoji);
  };

  if (communicationLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading chat...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentChannel) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">No chat channels available</p>
            <p className="text-sm text-muted-foreground">Create a channel to start chatting</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            #{currentChannel.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs">
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {currentChannel.description && (
          <p className="text-sm text-muted-foreground">{currentChannel.description}</p>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground">Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const isConsecutive = prevMessage?.sender_id === msg.sender_id &&
                  new Date(msg.created_at).getTime() - new Date(prevMessage?.created_at || 0).getTime() < 5 * 60 * 1000;

                return (
                  <div key={msg.id} className={`flex gap-3 ${isConsecutive ? 'mt-1' : 'mt-4'}`}>
                    {!isConsecutive && (
                      <Avatar className="w-8 h-8">
                        <AvatarImage 
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender_id}`}
                          alt={msg.sender?.full_name || 'User'} 
                        />
                        <AvatarFallback className="text-xs">
                          {(msg.sender?.full_name || msg.sender?.email || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`flex-1 ${isConsecutive ? 'ml-11' : ''}`}>
                      {!isConsecutive && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {msg.sender?.full_name || msg.sender?.email || 'Unknown User'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      )}
                      
                      <div className="bg-muted/50 rounded-lg px-3 py-2 max-w-md">
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>

                      {/* Message Reactions */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="mt-1">
                          <MessageReactions
                            messageId={msg.id}
                            reactions={msg.reactions}
                            onAddReaction={handleReactionAdd}
                            onRemoveReaction={handleReactionRemove}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="mt-4">
              <TypingIndicator 
                typingUsers={typingUsers.map(userId => ({
                  id: userId,
                  name: 'Someone', // TODO: Get actual names
                  avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
                }))} 
              />
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* Message Input */}
        <div className="p-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message #${currentChannel.name}`}
                className="pr-20"
                disabled={!isConnected}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Paperclip className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Smile className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <Button 
              onClick={handleSendMessage}
              disabled={!message.trim() || !isConnected}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {!isConnected && (
            <p className="text-xs text-muted-foreground mt-1">
              Reconnecting...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}