import React, { useState, useCallback } from 'react';
import { Project, ProjectTeamMember, TeamRole, TEAM_ROLES } from '@/types/projects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  UserPlus, 
  MoreVertical, 
  Shield, 
  Clock, 
  Mail, 
  User, 
  Search,
  Users,
  Settings,
  Trash2,
  UserCheck,
  UserMinus,
  Crown,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useInviteTeamMember, useUpdateTeamMember, useRemoveTeamMember, useSearchUsers } from '@/hooks/mutations/useTeamMutations';

interface ProjectTeamManagementProps {
  project: Project;
  teamMembers: ProjectTeamMember[];
  canManageTeam: boolean;
  currentUserMember?: ProjectTeamMember;
}

export function ProjectTeamManagement({ project, teamMembers, canManageTeam, currentUserMember }: ProjectTeamManagementProps) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<TeamRole>('member');
  const [invitationMessage, setInvitationMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { toast } = useToast();
  const inviteTeamMember = useInviteTeamMember();
  const updateTeamMember = useUpdateTeamMember();
  const removeTeamMember = useRemoveTeamMember();
  const searchUsers = useSearchUsers();

  const handleSearchUsers = useCallback(async (query: string) => {
    if (query.trim().length > 2) {
      searchUsers.mutate(query);
    }
  }, [searchUsers]);

  const handleAddMember = async () => {
    if (!newMemberEmail.trim() && !selectedUser) {
      toast({
        title: "Email Required",
        description: "Please enter an email address or select a user.",
        variant: "destructive",
      });
      return;
    }

    const email = selectedUser?.email || newMemberEmail;

    try {
      await inviteTeamMember.mutateAsync({
        projectId: project.id,
        email,
        role: newMemberRole,
        message: invitationMessage,
      });

      // Reset form
      setNewMemberEmail('');
      setNewMemberRole('member');
      setInvitationMessage('');
      setSelectedUser(null);
      setSearchQuery('');
      setShowAddMember(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleRemoveMember = async (member: ProjectTeamMember) => {
    try {
      await removeTeamMember.mutateAsync({
        memberId: member.id,
        projectId: project.id,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleChangeRole = async (member: ProjectTeamMember, newRole: TeamRole) => {
    try {
      await updateTeamMember.mutateAsync({
        memberId: member.id,
        role: newRole,
      });
    } catch (error) {
      // Error handled by mutation
    }
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

  const isCurrentUser = (member: ProjectTeamMember) => {
    return member.userId === currentUserMember?.userId;
  };

  const canModifyMember = (member: ProjectTeamMember) => {
    return canManageTeam && 
           member.role !== 'owner' && 
           !isCurrentUser(member);
  };

  return (
    <div className="space-y-6">
      {/* Mobile-optimized Team Overview Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members ({teamMembers.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage project team and permissions
              </p>
            </div>
            {canManageTeam && (
              <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <UserPlus className="h-4 w-4 mr-2" />
                    <span className="sm:inline">Add Member</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md mx-auto" aria-labelledby="add-member-title">
                  <DialogHeader>
                    <DialogTitle id="add-member-title">Invite Team Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* User Search */}
                    <div className="space-y-2">
                      <Label htmlFor="user-search">Search Users</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="user-search"
                          placeholder="Search by name or email..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            handleSearchUsers(e.target.value);
                          }}
                          className="pl-10"
                          aria-describedby="user-search-help"
                        />
                      </div>
                      <p id="user-search-help" className="text-xs text-muted-foreground">
                        Search for existing users in the system
                      </p>
                    </div>

                    {/* Search Results */}
                    {searchUsers.data && searchUsers.data.length > 0 && (
                      <div className="space-y-2">
                        <Label>Search Results</Label>
                        <div className="max-h-32 overflow-y-auto border rounded-md">
                          {searchUsers.data.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => {
                                setSelectedUser(user);
                                setNewMemberEmail(user.email);
                                setSearchQuery('');
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary"
                              aria-label={`Select ${user.name}`}
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar} alt={`${user.name}'s avatar`} />
                                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{user.name}</p>
                                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Email Input */}
                    <div className="space-y-2">
                      <Label htmlFor="member-email">
                        Email Address {selectedUser && <span className="text-green-600">(Selected)</span>}
                      </Label>
                      <Input
                        id="member-email"
                        type="email"
                        placeholder="Enter email address"
                        value={newMemberEmail}
                        onChange={(e) => {
                          setNewMemberEmail(e.target.value);
                          setSelectedUser(null);
                        }}
                        aria-describedby="email-help"
                      />
                      <p id="email-help" className="text-xs text-muted-foreground">
                        Enter the email address of the person you want to invite
                      </p>
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="member-role">Role</Label>
                      <Select value={newMemberRole} onValueChange={(value: TeamRole) => setNewMemberRole(value)}>
                        <SelectTrigger id="member-role" aria-describedby="role-help">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEAM_ROLES.filter(role => role.value !== 'owner').map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              <div className="space-y-1">
                                <div className="font-medium">{role.label}</div>
                                <div className="text-sm text-muted-foreground">{role.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p id="role-help" className="text-xs text-muted-foreground">
                        Choose the appropriate role for this team member
                      </p>
                    </div>

                    {/* Optional Message */}
                    <div className="space-y-2">
                      <Label htmlFor="invitation-message">Personal Message (Optional)</Label>
                      <Textarea
                        id="invitation-message"
                        placeholder="Add a personal message to the invitation..."
                        value={invitationMessage}
                        onChange={(e) => setInvitationMessage(e.target.value)}
                        rows={3}
                        aria-describedby="message-help"
                      />
                      <p id="message-help" className="text-xs text-muted-foreground">
                        Optional personal message to include with the invitation
                      </p>
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="flex flex-col-reverse sm:flex-row gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowAddMember(false)}
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleAddMember} 
                        disabled={(!newMemberEmail.trim() && !selectedUser) || inviteTeamMember.isPending}
                        className="w-full sm:w-auto"
                      >
                        {inviteTeamMember.isPending ? (
                          <>
                            <Activity className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Send Invitation
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>

        {/* Team Members List - Mobile Optimized */}
        <CardContent>
          <div className="space-y-3">
            {teamMembers.length > 0 ? (
              teamMembers.map((member) => (
                <div 
                  key={member.id} 
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Member Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                      <AvatarImage src={member.user.avatar} alt={`${member.user.name}'s avatar`} />
                      <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium truncate">{member.user.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
                            {member.role}
                          </Badge>
                          {member.role === 'owner' && (
                            <Crown className="h-3 w-3 text-yellow-500" aria-label="Project Owner" />
                          )}
                          {isCurrentUser(member) && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{member.user.email}</span>
                        </span>
                        {member.joinedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              Joined {format(member.joinedAt, 'MMM d, yyyy')}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {canModifyMember(member) && (
                    <div className="flex sm:flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            aria-label={`Manage ${member.user.name}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {/* Change Role Options */}
                          <DropdownMenuItem
                            onClick={() => handleChangeRole(member, 'admin')}
                            disabled={member.role === 'admin' || updateTeamMember.isPending}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleChangeRole(member, 'member')}
                            disabled={member.role === 'member' || updateTeamMember.isPending}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Make Member
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleChangeRole(member, 'viewer')}
                            disabled={member.role === 'viewer' || updateTeamMember.isPending}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Make Viewer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          
                          {/* Remove Member */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive focus:text-destructive"
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Remove from Project
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[95vw] max-w-md mx-auto">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-destructive" />
                                  Remove Team Member
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove <strong>{member.user.name}</strong> from this project? 
                                  They will lose access to all project data and won't be able to collaborate anymore.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                                <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveMember(member)}
                                  disabled={removeTeamMember.isPending}
                                  className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
                                >
                                  {removeTeamMember.isPending ? (
                                    <>
                                      <Activity className="h-4 w-4 mr-2 animate-spin" />
                                      Removing...
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Remove Member
                                    </>
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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

      {/* Role Permissions Guide - Mobile Responsive */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Role Permissions Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEAM_ROLES.map((role) => (
              <div key={role.value} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(role.value)}>
                      {role.label}
                    </Badge>
                    {role.value === 'owner' && (
                      <Crown className="h-4 w-4 text-yellow-500" />
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

      {/* Team Activity Summary - Mobile Optimized */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Team Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamMembers.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.user.avatar} alt={`${member.user.name}'s avatar`} />
                  <AvatarFallback className="text-xs">{getInitials(member.user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    <span className="font-medium">{member.user.name}</span> joined the project
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.joinedAt ? format(member.joinedAt, 'MMM d, yyyy \'at\' h:mm a') : 'Recently'}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs flex-shrink-0">
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