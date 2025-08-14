import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Settings, 
  Shield, 
  Crown, 
  Eye, 
  Edit, 
  Trash2, 
  UserPlus,
  MoreVertical,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeamQueries';

interface WorkspacePermissionManagerProps {
  teamId: string;
  onPermissionChange?: (userId: string, permissions: any) => void;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  level: 'view' | 'edit' | 'admin' | 'owner';
  category: 'content' | 'team' | 'settings' | 'analytics';
}

const permissions: Permission[] = [
  { id: 'view_content', name: 'View Content', description: 'Can view all workspace content', level: 'view', category: 'content' },
  { id: 'edit_content', name: 'Edit Content', description: 'Can create and edit content', level: 'edit', category: 'content' },
  { id: 'delete_content', name: 'Delete Content', description: 'Can delete content items', level: 'admin', category: 'content' },
  { id: 'manage_versions', name: 'Manage Versions', description: 'Can create and restore versions', level: 'edit', category: 'content' },
  { id: 'approve_content', name: 'Approve Content', description: 'Can approve content for publication', level: 'admin', category: 'content' },
  { id: 'view_team', name: 'View Team', description: 'Can view team members', level: 'view', category: 'team' },
  { id: 'invite_members', name: 'Invite Members', description: 'Can invite new team members', level: 'admin', category: 'team' },
  { id: 'manage_roles', name: 'Manage Roles', description: 'Can assign and modify member roles', level: 'admin', category: 'team' },
  { id: 'view_analytics', name: 'View Analytics', description: 'Can view workspace analytics', level: 'view', category: 'analytics' },
  { id: 'export_data', name: 'Export Data', description: 'Can export workspace data', level: 'edit', category: 'analytics' },
  { id: 'manage_settings', name: 'Manage Settings', description: 'Can modify workspace settings', level: 'admin', category: 'settings' },
  { id: 'manage_billing', name: 'Manage Billing', description: 'Can manage billing and subscriptions', level: 'owner', category: 'settings' },
];

export const WorkspacePermissionManager: React.FC<WorkspacePermissionManagerProps> = ({
  teamId,
  onPermissionChange
}) => {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [permissionMatrix, setPermissionMatrix] = useState<Record<string, string[]>>({});
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [bulkAssignRole, setBulkAssignRole] = useState('');

  const { data: teamMembersData, isLoading } = useTeamMembers(teamId);
  const teamMembers = Array.isArray(teamMembersData) ? teamMembersData : teamMembersData?.members || [];

  const handlePermissionToggle = (userId: string, permissionId: string) => {
    setPermissionMatrix(prev => {
      const userPermissions = prev[userId] || [];
      const hasPermission = userPermissions.includes(permissionId);
      
      const updatedPermissions = hasPermission
        ? userPermissions.filter(p => p !== permissionId)
        : [...userPermissions, permissionId];

      const newMatrix = { ...prev, [userId]: updatedPermissions };
      onPermissionChange?.(userId, updatedPermissions);
      return newMatrix;
    });
  };

  const getUserPermissions = (userId: string) => permissionMatrix[userId] || [];

  const getPermissionsByCategory = (category: string) => 
    permissions.filter(p => p.category === category);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-gradient-to-r from-amber-500 to-orange-500';
      case 'admin': return 'bg-gradient-to-r from-red-500 to-pink-500';
      case 'manager': return 'bg-gradient-to-r from-blue-500 to-indigo-500';
      case 'editor': return 'bg-gradient-to-r from-green-500 to-emerald-500';
      case 'viewer': return 'bg-gradient-to-r from-gray-500 to-slate-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading permissions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workspace Permissions</h2>
          <p className="text-muted-foreground">Manage team member access and permissions</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" placeholder="colleague@company.com" />
                </div>
                <div>
                  <Label htmlFor="role">Default Role</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1">Send Invitation</Button>
                  <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Permission Matrix */}
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="members">Members ({teamMembers.length})</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {/* Bulk Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bulk Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div>
                  <Label>Assign Role to Selected Members</Label>
                  <Select value={bulkAssignRole} onValueChange={setBulkAssignRole}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button disabled={!bulkAssignRole}>Apply to Selected</Button>
              </div>
            </CardContent>
          </Card>

          {/* Members List */}
          <div className="grid gap-4">
            {teamMembers.map((member) => (
              <Card key={member.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback>{member.full_name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{member.full_name || member.email}</h3>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`${getRoleColor(member.role?.slug || 'viewer')} text-white`}>
                            {member.role?.name || 'Viewer'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {member.status === 'active' ? (
                              <><CheckCircle className="h-3 w-3 mr-1" />Active</>
                            ) : (
                              <><Clock className="h-3 w-3 mr-1" />Pending</>
                            )}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedMember(selectedMember === member.id ? null : member.id)}
                      >
                        {selectedMember === member.id ? 'Hide Permissions' : 'Manage Permissions'}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Permission Matrix */}
                  {selectedMember === member.id && (
                    <div className="mt-6 space-y-4 border-t pt-4">
                      <h4 className="font-semibold">Permission Details</h4>
                      <Tabs defaultValue="content" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="content">Content</TabsTrigger>
                          <TabsTrigger value="team">Team</TabsTrigger>
                          <TabsTrigger value="analytics">Analytics</TabsTrigger>
                          <TabsTrigger value="settings">Settings</TabsTrigger>
                        </TabsList>
                        
                        {['content', 'team', 'analytics', 'settings'].map(category => (
                          <TabsContent key={category} value={category} className="space-y-2">
                            {getPermissionsByCategory(category).map(permission => (
                              <div key={permission.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                <div>
                                  <div className="font-medium">{permission.name}</div>
                                  <div className="text-sm text-muted-foreground">{permission.description}</div>
                                </div>
                                <Switch
                                  checked={getUserPermissions(member.id).includes(permission.id)}
                                  onCheckedChange={() => handlePermissionToggle(member.id, permission.id)}
                                />
                              </div>
                            ))}
                          </TabsContent>
                        ))}
                      </Tabs>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { name: 'Owner', description: 'Full access to all workspace features', members: 1, color: 'from-amber-500 to-orange-500' },
              { name: 'Admin', description: 'Can manage team and content settings', members: 2, color: 'from-red-500 to-pink-500' },
              { name: 'Manager', description: 'Can oversee projects and approve content', members: 5, color: 'from-blue-500 to-indigo-500' },
              { name: 'Editor', description: 'Can create and edit content', members: 12, color: 'from-green-500 to-emerald-500' },
              { name: 'Viewer', description: 'Can view content and collaborate', members: 8, color: 'from-gray-500 to-slate-500' }
            ].map((role) => (
              <Card key={role.name}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${role.color}`}>
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{role.name}</h3>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{role.members} members</Badge>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold">{teamMembers.length}</div>
                <div className="text-sm text-muted-foreground">Total Members</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold">{teamMembers.filter(m => m.status === 'active').length}</div>
                <div className="text-sm text-muted-foreground">Active Members</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                <div className="text-2xl font-bold">{teamMembers.filter(m => m.status !== 'active').length}</div>
                <div className="text-sm text-muted-foreground">Pending Invites</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Permission Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { user: 'John Doe', action: 'Role changed from Editor to Manager', time: '2 hours ago', type: 'role_change' },
                  { user: 'Jane Smith', action: 'Added to workspace', time: '1 day ago', type: 'member_added' },
                  { user: 'Mike Johnson', action: 'Content deletion permission revoked', time: '2 days ago', type: 'permission_change' },
                  { user: 'Sarah Wilson', action: 'Invited to workspace', time: '3 days ago', type: 'invite_sent' }
                ].map((log, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        log.type === 'role_change' ? 'bg-blue-100 text-blue-600' :
                        log.type === 'member_added' ? 'bg-green-100 text-green-600' :
                        log.type === 'permission_change' ? 'bg-orange-100 text-orange-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {log.type === 'role_change' ? <Settings className="h-4 w-4" /> :
                         log.type === 'member_added' ? <UserPlus className="h-4 w-4" /> :
                         log.type === 'permission_change' ? <Shield className="h-4 w-4" /> :
                         <Users className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-medium">{log.user}</div>
                        <div className="text-sm text-muted-foreground">{log.action}</div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {log.time}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};