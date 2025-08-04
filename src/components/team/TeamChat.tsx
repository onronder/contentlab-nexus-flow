import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Hash, Plus, Send } from 'lucide-react';
import { useTeamCommunication } from '@/hooks/useTeamCommunication';
import { TeamCommunicationService } from '@/services/teamCommunicationService';

interface TeamChatProps {
  teamId: string;
}

export function TeamChat({ teamId }: TeamChatProps) {
  const { channels, loading } = useTeamCommunication(teamId);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);

  const loadMessages = async (channelId: string) => {
    const data = await TeamCommunicationService.getChannelMessages(channelId);
    setMessages(data.messages);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return;
    
    setMessageLoading(true);
    await TeamCommunicationService.sendMessage({
      channel_id: selectedChannel,
      content: newMessage.trim()
    });
    setNewMessage('');
    setMessageLoading(false);
    loadMessages(selectedChannel);
  };

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
            <Button size="sm" variant="ghost">
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
              {channel.channel_type === 'private' && (
                <Badge variant="outline" className="ml-auto">Private</Badge>
              )}
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
                messages.map((message: any) => (
                  <div key={message.id} className="p-3 rounded-lg bg-muted">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{message.sender_id}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm">{message.content}</p>
                  </div>
                ))
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
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={messageLoading}
              />
              <Button onClick={sendMessage} disabled={messageLoading || !newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}