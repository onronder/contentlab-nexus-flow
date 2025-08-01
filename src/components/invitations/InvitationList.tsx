import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Copy
} from 'lucide-react';
import { format } from 'date-fns';
import { useTeamInvitations } from '@/hooks/useInvitationQueries';
import { useCancelInvitation, useResendInvitation } from '@/hooks/useInvitationMutations';
import { TeamInvitation, InvitationStatus } from '@/types/invitations';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';

interface InvitationListProps {
  teamId: string;
}

const statusConfig = {
  pending: { 
    label: 'Pending', 
    variant: 'secondary' as const, 
    icon: Clock,
    color: 'text-yellow-600'
  },
  accepted: { 
    label: 'Accepted', 
    variant: 'default' as const, 
    icon: CheckCircle,
    color: 'text-green-600'
  },
  declined: { 
    label: 'Declined', 
    variant: 'destructive' as const, 
    icon: XCircle,
    color: 'text-red-600'
  },
  expired: { 
    label: 'Expired', 
    variant: 'outline' as const, 
    icon: AlertCircle,
    color: 'text-gray-600'
  },
  cancelled: { 
    label: 'Cancelled', 
    variant: 'outline' as const, 
    icon: XCircle,
    color: 'text-gray-600'
  }
};

export function InvitationList({ teamId }: InvitationListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvitationStatus | 'all'>('all');
  
  const { data: invitations = [], isLoading, error } = useTeamInvitations(teamId);
  const cancelInvitation = useCancelInvitation();
  const resendInvitation = useResendInvitation();

  // Filter invitations based on search and status
  const filteredInvitations = invitations.filter(invitation => {
    const matchesSearch = invitation.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invitation.message?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invitation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCopyInviteLink = (invitation: TeamInvitation) => {
    const inviteUrl = `${window.location.origin}/invite/${invitation.invitation_token}`;
    navigator.clipboard.writeText(inviteUrl);
  };

  const handleResend = (invitationId: string) => {
    resendInvitation.mutate({ invitationId });
  };

  const handleCancel = (invitationId: string) => {
    cancelInvitation.mutate({ invitationId });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
          <span className="ml-3">Loading invitations...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState
            icon={AlertCircle}
            title="Failed to Load Invitations"
            description="There was an error loading the team invitations. Please try again."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Team Invitations</h2>
          <p className="text-sm text-muted-foreground">
            Manage pending and sent invitations
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invitations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value as any)}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invitations List */}
      {filteredInvitations.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={Mail}
              title={searchTerm || statusFilter !== 'all' ? 'No Matching Invitations' : 'No Invitations Yet'}
              description={
                searchTerm || statusFilter !== 'all' 
                  ? 'No invitations match your current filters. Try adjusting your search.'
                  : 'Get started by inviting your first team member.'
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredInvitations.map((invitation) => (
            <InvitationCard
              key={invitation.id}
              invitation={invitation}
              onCopyLink={() => handleCopyInviteLink(invitation)}
              onResend={() => handleResend(invitation.id)}
              onCancel={() => handleCancel(invitation.id)}
              isResending={resendInvitation.isPending}
              isCancelling={cancelInvitation.isPending}
            />
          ))}
        </div>
      )}

      {/* Summary */}
      {invitations.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {filteredInvitations.length} of {invitations.length} invitations
          </span>
          <div className="flex gap-4">
            <span>Pending: {invitations.filter(i => i.status === 'pending').length}</span>
            <span>Accepted: {invitations.filter(i => i.status === 'accepted').length}</span>
            <span>Declined: {invitations.filter(i => i.status === 'declined').length}</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface InvitationCardProps {
  invitation: TeamInvitation;
  onCopyLink: () => void;
  onResend: () => void;
  onCancel: () => void;
  isResending: boolean;
  isCancelling: boolean;
}

function InvitationCard({ 
  invitation, 
  onCopyLink, 
  onResend, 
  onCancel, 
  isResending, 
  isCancelling 
}: InvitationCardProps) {
  const config = statusConfig[invitation.status];
  const StatusIcon = config.icon;

  const isExpired = new Date(invitation.expires_at) < new Date();
  const isPending = invitation.status === 'pending' && !isExpired;
  const canResend = isPending;
  const canCancel = isPending;

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Left side - User info and status */}
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${config.color}`} />
              <Badge variant={config.variant} className="text-xs">
                {config.label}
              </Badge>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{invitation.email}</span>
                {invitation.role && (
                  <Badge variant="outline" className="text-xs">
                    {invitation.role.name}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span>
                  Invited {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                </span>
                {invitation.accepted_at && (
                  <span>
                    Accepted {format(new Date(invitation.accepted_at), 'MMM d, yyyy')}
                  </span>
                )}
                <span>
                  Expires {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                </span>
              </div>
              
              {invitation.message && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  &quot;{invitation.message}&quot;
                </p>
              )}
            </div>
          </div>

          {/* Right side - Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onCopyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Invite Link
              </DropdownMenuItem>
              
              {canResend && (
                <DropdownMenuItem 
                  onClick={onResend}
                  disabled={isResending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isResending ? 'animate-spin' : ''}`} />
                  Resend Invitation
                </DropdownMenuItem>
              )}
              
              {canCancel && (
                <DropdownMenuItem 
                  onClick={onCancel}
                  disabled={isCancelling}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancel Invitation
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}