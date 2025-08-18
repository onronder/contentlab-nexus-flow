import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TypingUser {
  user_id: string;
  profiles?: {
    full_name: string;
  };
}

interface TypingIndicatorProps {
  channelId: string;
  teamId: string;
  currentUserId?: string;
}

export function TypingIndicator({ channelId, teamId, currentUserId }: TypingIndicatorProps) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    if (!channelId || !teamId) return;

    const fetchTypingUsers = async () => {
      try {
        const { data } = await supabase
          .from('typing_indicators')
          .select(`
            user_id,
            profiles:user_id (full_name)
          `)
          .eq('channel_id', channelId)
          .neq('user_id', currentUserId || '')
          .gt('expires_at', new Date().toISOString());

        setTypingUsers(data || []);
      } catch (error) {
        console.error('Error fetching typing users:', error);
      }
    };

    fetchTypingUsers();

    const channel = supabase
      .channel(`typing-${channelId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'typing_indicators',
        filter: `channel_id=eq.${channelId}`,
      }, fetchTypingUsers)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, teamId, currentUserId]);

  if (typingUsers.length === 0) return null;

  const formatTypingText = () => {
    const names = typingUsers.map(user => user.profiles?.full_name || 'Someone');
    if (names.length === 1) {
      return `${names[0]} is typing...`;
    }
    return `${names[0]} and ${names.length - 1} others are typing...`;
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <div className="flex gap-1">
        <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" />
        <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="italic">{formatTypingText()}</span>
    </div>
  );
}