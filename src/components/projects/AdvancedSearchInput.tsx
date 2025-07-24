import React, { useState, useEffect, useRef } from 'react';
import { Search, History, X, ArrowUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface AdvancedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  searchHistory: string[];
  onClearHistory: () => void;
  placeholder?: string;
  className?: string;
}

export function AdvancedSearchInput({
  value,
  onChange,
  onSearch,
  searchHistory,
  onClearHistory,
  placeholder = "Search projects by name, description, or industry...",
  className
}: AdvancedSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle keyboard navigation in search history
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchHistory.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchHistory.length) {
          const selectedQuery = searchHistory[selectedIndex];
          onChange(selectedQuery);
          onSearch(selectedQuery);
          setIsOpen(false);
          setSelectedIndex(-1);
        } else if (value.trim()) {
          onSearch(value.trim());
          setIsOpen(false);
          setSelectedIndex(-1);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle clicking on search history item
  const handleHistoryClick = (query: string) => {
    onChange(query);
    onSearch(query);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Clear search
  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  // Handle search submission
  const handleSearch = () => {
    if (value.trim()) {
      onSearch(value.trim());
      setIsOpen(false);
    }
  };

  // Reset selected index when history changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchHistory]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showHistory = isOpen && searchHistory.length > 0;

  return (
    <div className={cn("relative", className)}>
      <Popover open={showHistory} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => searchHistory.length > 0 && setIsOpen(true)}
              className="pl-10 pr-20"
              aria-label="Search projects"
              aria-expanded={showHistory}
              aria-autocomplete="list"
              role="combobox"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {value && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted-foreground/20"
                  onClick={handleClear}
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleSearch}
                disabled={!value.trim()}
                aria-label="Search"
              >
                <ArrowUp className="h-3 w-3 rotate-90" />
              </Button>
            </div>
          </div>
        </PopoverTrigger>
        
        {showHistory && (
          <PopoverContent 
            className="w-[var(--radix-popover-trigger-width)] p-0" 
            align="start"
            side="bottom"
          >
            <div className="p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <History className="h-3 w-3" />
                  Recent Searches
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearHistory}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear
                </Button>
              </div>
              <Separator className="mb-2" />
              <ScrollArea className="max-h-48">
                <div className="space-y-1" role="listbox">
                  {searchHistory.map((query, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-sm cursor-pointer transition-colors",
                        selectedIndex === index 
                          ? "bg-accent text-accent-foreground" 
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => handleHistoryClick(query)}
                      role="option"
                      aria-selected={selectedIndex === index}
                    >
                      <span className="text-sm truncate">{query}</span>
                      <Badge variant="outline" className="text-xs ml-2">
                        Recent
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}