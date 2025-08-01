import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Shield, 
  Edit, 
  Users, 
  Clock, 
  Calendar, 
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { TeamMember, UserRole } from '@/types/team';
import { useUpdateMemberRole, useRemoveTeamMember } from '@/hooks/useTeamMutations';
import { useAvailableRoles } from '@/hooks/useTeamQueries';
import { useToast } from '@/hooks/use-toast';

interface EditMemberDialogProps {
  member: TeamMember | null;
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
}

export const EditMemberDialog: React.FC<EditMemberDialogProps> = ({
  member,
  isOpen,
  onClose,
  teamId
}) => {
  const [selectedRole, setSelectedRole] = useState<string>(member?.role?.slug || '');
  const [isActive, setIsActive] = useState<boolean>(member?.is_active || true);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const { data: availableRoles } = useAvailableRoles();
  const updateMemberRole = useUpdateMemberRole();
  const removeMember = useRemoveTeamMember();

  const handleSave = async () => {
    if (!member || !selectedRole) return;

    try {
      await updateMemberRole.mutateAsync({
        teamId,
        userId: member.user_id,
        roleSlug: selectedRole
      });

      toast({
        title: "Member updated",
        description: "Team member role has been updated successfully."
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update team member. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRemove = async () => {
    if (!member) return;

    try {
      await removeMember.mutateAsync({
        teamId,
        userId: member.user_id
      });

      toast({
        title: "Member removed",
        description: "Team member has been removed successfully."
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove team member. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (!member) return null;

  const getRoleIcon = (roleSlug: string) => {
    switch (roleSlug) {
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'editor': return <Edit className="h-4 w-4" />;
      case 'member': return <Users className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Team Member</DialogTitle>
          <DialogDescription>
            Update member role, permissions, and status
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Member Profile */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={member.user?.avatar_url} alt={member.user?.display_name} />
                    <AvatarFallback>
                      {member.user?.display_name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{member.user?.display_name}</h3>
                    <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusIcon(member.status)}
                      <Badge variant="outline" className="text-xs">
                        {member.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Joined {formatDate(member.joined_at || member.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Last active {formatDate(member.last_activity_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Role Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Role & Permissions</CardTitle>
                <CardDescription>Manage member's role and access level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles?.map((role: UserRole) => (
                        <SelectItem key={role.id} value={role.slug}>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(role.slug)}
                            <span>{role.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="active-status">Active Member</Label>
                    <p className="text-sm text-muted-foreground">
                      Inactive members cannot access team resources
                    </p>
                  </div>
                  <Switch
                    id="active-status"
                    checked={isActive}
                    onCheckedChange={(checked) => setIsActive(checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Member Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    No recent activity data available
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Admin Notes</CardTitle>
                <CardDescription>Internal notes about this member (not visible to member)</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add notes about this team member..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px]"
                />
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={removeMember.isPending}
          >
            Remove Member
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateMemberRole.isPending || !selectedRole}
            className="gradient-primary"
          >
            {updateMemberRole.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};