import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Reaction {
  type: string;
  count: number;
  users: string[];
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  currentUserId?: string;
  onReactionToggle?: () => void;
}

const AVAILABLE_REACTIONS = ['👍', '❤️', '😄', '😮', '😢', '😡', '🎉', '👏'];

export function MessageReactions({ messageId, reactions, currentUserId, onReactionToggle }: MessageReactionsProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { toast } = useToast();

  const handleReactionClick = async (reactionType: string) => {
    if (!currentUserId) return;

    try {
      const existingReaction = reactions.find(r => r.type === reactionType);
      const userHasReacted = existingReaction?.users.includes(currentUserId);

      if (userHasReacted) {
        await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', currentUserId)
          .eq('reaction_type', reactionType);
      } else {
        await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: currentUserId,
            reaction_type: reactionType
          });
      }

      onReactionToggle?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex items-center gap-1 mt-1">
      {reactions.map((reaction) => {
        const userHasReacted = currentUserId ? reaction.users.includes(currentUserId) : false;
        
        return (
          <Button
            key={reaction.type}
            variant={userHasReacted ? "secondary" : "ghost"}
            size="sm"
            className="h-6 px-2 py-0 text-xs"
            onClick={() => handleReactionClick(reaction.type)}
          >
            <span className="mr-1">{reaction.type}</span>
            <span>{reaction.count}</span>
          </Button>
        );
      })}

      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">😊</Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="grid grid-cols-4 gap-1">
            {AVAILABLE_REACTIONS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  handleReactionClick(emoji);
                  setIsPopoverOpen(false);
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