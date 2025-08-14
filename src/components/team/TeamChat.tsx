import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Hash, Plus, Send, Megaphone, Search, Paperclip } from 'lucide-react';
import { useTeamCommunication } from '@/hooks/useTeamCommunication';
import { TeamCommunicationService } from '@/services/teamCommunicationService';
import { MentionInput } from '@/components/collaboration/MentionInput';
import { useTeamMembers } from '@/hooks/useTeamQueries';
import { MessageReactions } from '@/components/collaboration/MessageReactions';
import { TypingIndicator } from '@/components/collaboration/TypingIndicator';
import { FileAttachments } from '@/components/collaboration/FileAttachments';

interface TeamChatProps {
  teamId: string;
}

export function TeamChat({ teamId }: TeamChatProps) {
  const { channels, loading, refetch } = useTeamCommunication(teamId);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const [messageReactions, setMessageReactions] = useState<Record<string, any[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { data: membersData } = useTeamMembers(teamId);
  const teamMembers = (membersData?.members || []).map((m: any) => ({
    id: m.user?.id || m.user_id,
    name: m.user?.display_name || m.user?.full_name || m.user?.email || m.user_id,
    avatarUrl: m.user?.avatar_url
  }));

const loadMessages = async (channelId: string) => {
  const data = await TeamCommunicationService.getChannelMessages(channelId);
  setMessages(data.messages);
};

const getMentionedUserIds = (text: string): string[] => {
  if (!text) return [];
  const names = Array.from(text.matchAll(/@([\w\s.\-@]+)/g)).map(m => m[1].trim().toLowerCase());
  const ids = teamMembers
    .filter((u: any) => names.some(n => (u.name || '').toLowerCase().includes(n)))
    .map((u: any) => u.id);
  return Array.from(new Set(ids)).filter(Boolean);
};

const createAnnouncementsChannel = async () => {
  const existing = channels.find((c: any) => c.name === 'announcements' || c.channel_type === 'announcement');
  if (existing) {
    setSelectedChannel(existing.id);
    loadMessages(existing.id);
    return;
  }
  const created = await TeamCommunicationService.createChannel({
    team_id: teamId,
    name: 'announcements',
    description: 'Team-wide announcements',
    channel_type: 'announcement',
    is_private: false,
  });
  await refetch?.();
  const newId = created?.id || channels.find((c: any) => c.name === 'announcements')?.id;
  if (newId) {
    setSelectedChannel(newId);
    loadMessages(newId);
  }
};

const sendMessage = async () => {
  if ((!newMessage.trim() && attachments.length === 0) || !selectedChannel) return;
  setMessageLoading(true);
  const mentions = getMentionedUserIds(newMessage);
  await TeamCommunicationService.sendMessage({
    channel_id: selectedChannel,
    content: newMessage.trim(),
    mentions,
    attachments: attachments.map(att => ({
      name: att.name,
      size: att.size,
      type: att.type,
      url: att.url
    }))
  });
  setNewMessage('');
  setAttachments([]);
  setMessageLoading(false);
  loadMessages(selectedChannel);
  stopTyping();
};

const handleTyping = () => {
  // Clear existing timeout
  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
  }
  
  // Send typing indicator (would be implemented with real-time)
  // TeamCommunicationService.sendTypingIndicator(selectedChannel, true);
  
  // Set timeout to stop typing
  typingTimeoutRef.current = setTimeout(() => {
    stopTyping();
  }, 3000);
};

const stopTyping = () => {
  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
  }
  // TeamCommunicationService.sendTypingIndicator(selectedChannel, false);
};

const handleReactionAdd = (messageId: string, emoji: string) => {
  // This would integrate with your backend
  console.log('Adding reaction:', messageId, emoji);
};

const handleReactionRemove = (messageId: string, emoji: string) => {
  // This would integrate with your backend
  console.log('Removing reaction:', messageId, emoji);
};

const scrollToBottom = () => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
};

useEffect(() => {
  scrollToBottom();
}, [messages]);

useEffect(() => {
  return () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };
}, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading team chat...</div>;
  }

  return (
    <div className="grid grid-cols-4 gap-4 h-[600px]">
      {/* Channels Sidebar */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Channels
<Button size="sm" variant="ghost" onClick={createAnnouncementsChannel} title="Create or open announcements">
  <Plus className="h-4 w-4" />
</Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {channels.map((channel: any) => (
            <Button
              key={channel.id}
              variant={selectedChannel === channel.id ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => {
                setSelectedChannel(channel.id);
                loadMessages(channel.id);
              }}
            >
<Hash className="h-4 w-4 mr-2" />
{channel.name}
<span className="ml-auto flex items-center gap-2">
  {channel.channel_type === 'private' && (
    <Badge variant="outline">Private</Badge>
  )}
  {(channel.channel_type === 'announcement' || channel.name === 'announcements') && (
    <Badge variant="secondary" className="flex items-center gap-1">
      <Megaphone className="h-3 w-3" /> Announcement
    </Badge>
  )}
</span>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>
            {selectedChannel ? 
              `#${channels.find((c: any) => c.id === selectedChannel)?.name || 'Channel'}` : 
              'Select a channel'
            }
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col h-[500px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {selectedChannel ? (
              messages.length > 0 ? (
                <>
                  {messages.map((message: any) => (
                    <div key={message.id} className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{message.sender_id}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                        {message.is_edited && (
                          <Badge variant="outline" className="text-xs">edited</Badge>
                        )}
                      </div>
                      <p className="text-sm mb-2">{message.content}</p>
                      
                      {/* Message attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="space-y-2 mb-2">
                          {message.attachments.map((attachment: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-background rounded border">
                              <Paperclip className="h-4 w-4" />
                              <span className="text-sm">{attachment.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({(attachment.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Message reactions */}
                      <MessageReactions
                        messageId={message.id}
                        reactions={messageReactions[message.id] || []}
                        onAddReaction={handleReactionAdd}
                        onRemoveReaction={handleReactionRemove}
                      />
                    </div>
                  ))}
                  
                  {/* Typing indicator */}
                  <TypingIndicator typingUsers={typingUsers} />
                  
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </div>
              )
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Select a channel to view messages
              </div>
            )}
          </div>

          {/* Message Input */}
          {selectedChannel && (
            <div className="space-y-3">
              {/* File attachments */}
              <FileAttachments
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                maxFiles={3}
                maxSize={5}
              />
              
              <div className="flex flex-col gap-2 w-full">
                <MentionInput
                  value={newMessage}
                  onChange={(value) => {
                    setNewMessage(value);
                    if (value.length > 0) {
                      handleTyping();
                    } else {
                      stopTyping();
                    }
                  }}
                  onSubmit={() => sendMessage()}
                  teamId={teamId}
                  placeholder="Type a message... Use @ to mention"
                  disabled={messageLoading}
                  maxLength={500}
                />
                <div className="flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    {newMessage.length}/500 characters
                  </div>
                  <Button 
                    onClick={sendMessage} 
                    disabled={messageLoading || (!newMessage.trim() && attachments.length === 0)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}