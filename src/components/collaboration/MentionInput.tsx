import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  teamId: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxLength?: number;
}

export const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  onSubmit,
  teamId,
  placeholder = "Type @ to mention someone...",
  className = '',
  disabled = false,
  maxLength = 500
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Mock team members data - in production, this would come from the team members API
  const mockTeamMembers: User[] = [
    {
      id: 'user-1',
      full_name: 'John Doe',
      email: 'john@example.com',
      avatar_url: undefined
    },
    {
      id: 'user-2',
      full_name: 'Jane Smith',
      email: 'jane@example.com',
      avatar_url: undefined
    },
    {
      id: 'user-3',
      full_name: 'Mike Johnson',
      email: 'mike@example.com',
      avatar_url: undefined
    }
  ];

  useEffect(() => {
    if (mentionQuery && showSuggestions) {
      // Filter suggestions based on query
      const filtered = mockTeamMembers.filter(user =>
        user.full_name?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(mentionQuery.toLowerCase())
      );
      setSuggestions(filtered);
      setSelectedIndex(0);
    }
  }, [mentionQuery, showSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    onChange(newValue);
    
    // Check for @ mentions
    const textBeforeCursor = newValue.slice(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const [fullMatch, query] = mentionMatch;
      setMentionQuery(query);
      setMentionStart(cursorPosition - fullMatch.length);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setMentionQuery('');
      setMentionStart(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev === 0 ? suggestions.length - 1 : prev - 1);
          break;
        case 'Tab':
        case 'Enter':
          if (e.shiftKey && e.key === 'Enter') {
            // Allow line breaks with Shift+Enter
            return;
          }
          e.preventDefault();
          if (showSuggestions) {
            insertMention(suggestions[selectedIndex]);
          } else {
            // Submit the form
            onSubmit(value);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowSuggestions(false);
          break;
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(value);
    }
  };

  const insertMention = (user: User) => {
    if (!textareaRef.current || mentionStart === -1) return;
    
    const textarea = textareaRef.current;
    const beforeMention = value.slice(0, mentionStart);
    const afterCursor = value.slice(textarea.selectionStart);
    const mentionText = `@${user.full_name || user.email} `;
    
    const newValue = beforeMention + mentionText + afterCursor;
    onChange(newValue);
    
    setShowSuggestions(false);
    setMentionQuery('');
    setMentionStart(-1);
    
    // Set cursor position after the mention
    setTimeout(() => {
      const newCursorPosition = mentionStart + mentionText.length;
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      textarea.focus();
    }, 0);
  };

  const handleSuggestionClick = (user: User) => {
    insertMention(user);
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null;

    return (
      <Card className="absolute z-50 w-full max-w-sm mt-1 shadow-lg">
        <CardContent className="p-2">
          <div className="text-xs text-muted-foreground mb-2 px-2">
            Mention someone
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto" ref={suggestionsRef}>
            {suggestions.map((user, index) => (
              <div
                key={user.id}
                className={cn(
                  "flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors",
                  index === selectedIndex ? "bg-accent" : "hover:bg-muted"
                )}
                onClick={() => handleSuggestionClick(user)}
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {user.full_name || 'Unknown User'}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn("relative", className)}>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        className="min-h-[80px] resize-none"
      />
      
      {renderSuggestions()}
      
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>@ to mention</span>
          <span>Shift+Enter for new line</span>
          <span>Enter to submit</span>
        </div>
        <div>
          {value.length}/{maxLength}
        </div>
      </div>
    </div>
  );
};