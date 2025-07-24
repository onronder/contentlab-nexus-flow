import React, { useState } from 'react';
import { Project, ProjectTeamMember, TEAM_ROLES } from '@/types/projects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserPlus, MoreVertical, Shield, Clock, Mail, User } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ProjectTeamManagementProps {
  project: Project;
  teamMembers: ProjectTeamMember[];
  canManageTeam: boolean;
  currentUserMember?: ProjectTeamMember;
}

export function ProjectTeamManagement({ project, teamMembers, canManageTeam, currentUserMember }: ProjectTeamManagementProps) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<string>('member');
  const { toast } = useToast();

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return;

    // TODO: Implement add member functionality
    toast({
      title: "Invite Sent",
      description: `Invitation sent to ${newMemberEmail}`,
    });

    setNewMemberEmail('');
    setNewMemberRole('member');
    setShowAddMember(false);
  };

  const handleRemoveMember = async (member: ProjectTeamMember) => {
    // TODO: Implement remove member functionality
    toast({
      title: "Member Removed",
      description: `${member.user.name} has been removed from the project`,
      variant: "destructive",
    });
  };

  const handleChangeRole = async (member: ProjectTeamMember, newRole: string) => {
    // TODO: Implement role change functionality
    toast({
      title: "Role Updated",
      description: `${member.user.name}'s role has been changed to ${newRole}`,
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      case 'manager': return 'outline';
      default: return 'secondary';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Team Members ({teamMembers.length})</CardTitle>
          {canManageTeam && (
            <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email Address</label>
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Role</label>
                    <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEAM_ROLES.filter(role => role.value !== 'owner').map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            <div>
                              <div className="font-medium">{role.label}</div>
                              <div className="text-sm text-muted-foreground">{role.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddMember(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddMember} disabled={!newMemberEmail.trim()}>
                      Send Invitation
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.length > 0 ? (
              teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.user.avatar} />
                      <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.user.name}</span>
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {member.role}
                        </Badge>
                        {member.role === 'owner' && (
                          <Shield className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.user.email}
                        </span>
                        {member.joinedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Joined {format(member.joinedAt, 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canManageTeam && member.role !== 'owner' && member.userId !== currentUserMember?.userId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleChangeRole(member, 'admin')}
                          disabled={member.role === 'admin'}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleChangeRole(member, 'member')}
                          disabled={member.role === 'member'}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Make Member
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleRemoveMember(member)}
                          className="text-destructive focus:text-destructive"
                        >
                          Remove from Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No team members yet</h3>
                <p className="text-muted-foreground mb-4">
                  Invite team members to collaborate on this project
                </p>
                {canManageTeam && (
                  <Button onClick={() => setShowAddMember(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add First Member
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Role Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {TEAM_ROLES.map((role) => (
              <div key={role.value} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(role.value)}>
                      {role.label}
                    </Badge>
                    {role.value === 'owner' && (
                      <Shield className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {teamMembers.filter(m => m.role === role.value).length} members
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {role.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Team Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamMembers.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.user.avatar} />
                  <AvatarFallback className="text-xs">{getInitials(member.user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{member.user.name}</span> joined the project
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.joinedAt ? format(member.joinedAt, 'MMM d, yyyy \'at\' h:mm a') : 'Recently'}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {member.role}
                </Badge>
              </div>
            ))}
            {teamMembers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No team activity yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}