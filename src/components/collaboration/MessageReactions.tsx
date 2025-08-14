import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Smile, Plus } from 'lucide-react';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';

interface Reaction {
  id: string;
  emoji: string;
  users: string[];
  count: number;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🤔'];

export function MessageReactions({ 
  messageId, 
  reactions, 
  onAddReaction, 
  onRemoveReaction 
}: MessageReactionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const userId = useCurrentUserId();

  const handleReactionClick = (emoji: string) => {
    const existingReaction = reactions.find(r => r.emoji === emoji);
    const userReacted = existingReaction?.users.includes(userId || '');

    if (userReacted) {
      onRemoveReaction(messageId, emoji);
    } else {
      onAddReaction(messageId, emoji);
    }
  };

  const hasUserReacted = (reaction: Reaction) => {
    return reaction.users.includes(userId || '');
  };

  return (
    <div className="flex items-center gap-1 mt-2">
      {reactions.map((reaction) => (
        <Button
          key={reaction.id}
          variant={hasUserReacted(reaction) ? "secondary" : "ghost"}
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => handleReactionClick(reaction.emoji)}
        >
          <span className="mr-1">{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </Button>
      ))}
      
      <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-fit p-2">
          <div className="grid grid-cols-4 gap-1">
            {COMMON_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  handleReactionClick(emoji);
                  setShowEmojiPicker(false);
                }}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}