import React from 'react';
import { useTeamContext } from '@/contexts/TeamContext';
import { Badge } from '@/components/ui/badge';
import { Users, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamDataFilterProps {
  className?: string;
  showMemberCount?: boolean;
  showFilterBadge?: boolean;
}

/**
 * Component to display current team filter status
 * Shows which team's data is currently being displayed
 */
export function TeamDataFilter({ 
  className, 
  showMemberCount = true, 
  showFilterBadge = true 
}: TeamDataFilterProps) {
  const { currentTeam } = useTeamContext();

  if (!currentTeam) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Filter className="h-4 w-4" />
        <span>No team filter active</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showFilterBadge && (
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3 w-3" />
          Team: {currentTeam.name}
        </Badge>
      )}
      
      {showMemberCount && (
        <Badge variant="outline" className="gap-1">
          {currentTeam.current_member_count} members
        </Badge>
      )}
    </div>
  );
}

interface TeamFilterNoticeProps {
  resourceType: string;
  className?: string;
}

/**
 * Notice component to inform users about team filtering
 */
export function TeamFilterNotice({ resourceType, className }: TeamFilterNoticeProps) {
  const { currentTeam } = useTeamContext();

  if (!currentTeam) return null;

  return (
    <div className={cn(
      "bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm",
      className
    )}>
      <div className="flex items-center gap-2 text-primary">
        <Filter className="h-4 w-4" />
        <span className="font-medium">Team Filter Active</span>
      </div>
      <p className="text-muted-foreground mt-1">
        Showing {resourceType} from <strong>{currentTeam.name}</strong> team members only.
        Switch teams to see different data.
      </p>
    </div>
  );
}