import React from 'react';
import { useTeamContext } from '@/contexts/TeamContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamSelectorProps {
  className?: string;
}

export function TeamSelector({ className }: TeamSelectorProps) {
  const { currentTeam, availableTeams, switchTeam, isLoading } = useTeamContext();

  if (isLoading || availableTeams.length === 0) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground", className)}>
        <Users className="h-4 w-4" />
        <span>Loading teams...</span>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Select
      value={currentTeam?.id || ''}
      onValueChange={switchTeam}
    >
      <SelectTrigger className={cn("w-[200px] border-border/40", className)}>
        <div className="flex items-center gap-2 min-w-0">
          {currentTeam ? (
            <>
              <Avatar className="h-6 w-6">
                <AvatarImage src={`https://avatar.vercel.sh/${currentTeam.id}`} />
                <AvatarFallback className="text-xs">
                  {getInitials(currentTeam.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{currentTeam.name}</div>
              </div>
            </>
          ) : (
            <>
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Select team</span>
            </>
          )}
        </div>
        <ChevronDown className="h-4 w-4 opacity-50 ml-auto flex-shrink-0" />
      </SelectTrigger>
      <SelectContent>
        {availableTeams.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            <div className="flex items-center gap-3 w-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={`https://avatar.vercel.sh/${team.id}`} />
                <AvatarFallback className="text-xs">
                  {getInitials(team.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{team.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {team.current_member_count} members
                  </Badge>
                  <span className="text-xs text-muted-foreground capitalize">
                    {team.team_type.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}