import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  MoreHorizontal, 
  Mail, 
  Shield, 
  UserX, 
  Clock,
  Activity,
  MessageCircle
} from 'lucide-react';
import { TeamMember, UserRole } from '@/types/team';
import { formatDistanceToNow } from 'date-fns';

interface TeamMemberCardProps {
  member: TeamMember & {
    user?: {
      id: string;
      full_name?: string;
      email?: string;
      avatar_url?: string;
    };
    role?: UserRole;
  };
  currentUserRole?: string;
  onEditRole?: (memberId: string) => void;
  onRemoveMember?: (memberId: string) => void;
  onSendMessage?: (memberId: string) => void;
  onViewProfile?: (memberId: string) => void;
  isCurrentUser?: boolean;
}

export function TeamMemberCard({
  member,
  currentUserRole,
  onEditRole,
  onRemoveMember,
  onSendMessage,
  onViewProfile,
  isCurrentUser = false,
}: TeamMemberCardProps) {
  const getRoleColor = (roleSlug?: string) => {
    switch (roleSlug) {
      case 'owner':
        return 'bg-destructive text-destructive-foreground';
      case 'admin':
        return 'bg-warning text-warning-foreground';
      case 'manager':
        return 'bg-primary text-primary-foreground';
      case 'contributor':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success text-success-foreground';
      case 'pending':
        return 'bg-warning text-warning-foreground';
      case 'inactive':
        return 'bg-muted text-muted-foreground';
      case 'suspended':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const canManageMember = currentUserRole === 'owner' || 
    (currentUserRole === 'admin' && member.role?.slug !== 'owner') ||
    (currentUserRole === 'manager' && !['owner', 'admin'].includes(member.role?.slug || ''));

  return (
    <Card className="transition-all duration-200 hover:shadow-elegant hover:-translate-y-1">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={member.user?.avatar_url} alt={member.user?.full_name} />
              <AvatarFallback className="gradient-primary text-primary-foreground">
                {getInitials(member.user?.full_name)}
              </AvatarFallback>
            </Avatar>
            {member.status === 'active' && (
              <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-success border-2 border-background" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-foreground truncate">
                {member.user?.full_name || 'Unknown User'}
              </h3>
              {isCurrentUser && (
                <Badge variant="outline" className="text-xs">
                  You
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground truncate mb-2">
              {member.user?.email}
            </p>

            <div className="flex items-center gap-2 mb-3">
              <Badge className={`text-xs ${getRoleColor(member.role?.slug)}`}>
                <Shield className="h-3 w-3 mr-1" />
                {member.role?.name || 'Unknown Role'}
              </Badge>
              <Badge variant="outline" className={`text-xs ${getStatusColor(member.status)}`}>
                {member.status}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {member.last_activity_at 
                          ? formatDistanceToNow(new Date(member.last_activity_at), { addSuffix: true })
                          : 'Never'
                        }
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Last activity: {member.last_activity_at 
                      ? new Date(member.last_activity_at).toLocaleString()
                      : 'Never'
                    }
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      <span>Joined {formatDistanceToNow(new Date(member.joined_at || member.created_at), { addSuffix: true })}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Joined: {new Date(member.joined_at || member.created_at).toLocaleString()}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!isCurrentUser && member.status === 'active' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSendMessage?.(member.id)}
                      className="h-8 w-8 p-0"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send message</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {(canManageMember || isCurrentUser) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onViewProfile?.(member.id)}>
                    <Activity className="mr-2 h-4 w-4" />
                    View Profile
                  </DropdownMenuItem>
                  
                  {!isCurrentUser && (
                    <>
                      <DropdownMenuItem onClick={() => onSendMessage?.(member.id)}>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Message
                      </DropdownMenuItem>
                      
                      {canManageMember && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onEditRole?.(member.id)}>
                            <Shield className="mr-2 h-4 w-4" />
                            Edit Role
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onRemoveMember?.(member.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Remove Member
                          </DropdownMenuItem>
                        </>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}