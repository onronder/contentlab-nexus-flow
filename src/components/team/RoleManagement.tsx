import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Shield, 
  Edit, 
  Users, 
  MoreVertical, 
  Copy,
  Trash2,
  Settings,
  Crown,
  Eye
} from 'lucide-react';
import { UserRole } from '@/types/team';
import { useAvailableRoles } from '@/hooks/useTeamQueries';
import { useCreateTeam, useDeleteTeam } from '@/hooks/useTeamMutations';
import { RoleEditor } from './RoleEditor';
import { PermissionMatrix } from '@/components/permissions/PermissionMatrix';

interface RoleManagementProps {
  teamId: string;
}

export const RoleManagement: React.FC<RoleManagementProps> = ({ teamId }) => {
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(false);

  const { data: roles, isLoading } = useAvailableRoles();
  // Role management hooks would be implemented separately
  const createRole = { mutateAsync: async () => {} };
  const deleteRole = { mutateAsync: async () => {} };

  const getRoleIcon = (roleSlug: string, hierarchyLevel: number) => {
    if (hierarchyLevel >= 10) return <Crown className="h-4 w-4 text-yellow-600" />;
    if (hierarchyLevel >= 8) return <Shield className="h-4 w-4 text-red-600" />;
    if (hierarchyLevel >= 5) return <Edit className="h-4 w-4 text-blue-600" />;
    return <Eye className="h-4 w-4 text-gray-600" />;
  };

  const getRoleColor = (hierarchyLevel: number) => {
    if (hierarchyLevel >= 10) return "border-yellow-200 bg-yellow-50";
    if (hierarchyLevel >= 8) return "border-red-200 bg-red-50";
    if (hierarchyLevel >= 5) return "border-blue-200 bg-blue-50";
    return "border-gray-200 bg-gray-50";
  };

  const handleCloneRole = (role: UserRole) => {
    // Create new role with same permissions
    const clonedRole = {
      name: `${role.name} Copy`,
      description: `Cloned from ${role.name}`,
      role_type: 'custom' as const,
      hierarchy_level: role.hierarchy_level
    };
    // Implementation would clone permissions too
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      await deleteRole.mutateAsync();
    } catch (error) {
      // Error handling
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
          <h3 className="text-lg font-semibold">Role Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage team roles and permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowPermissionMatrix(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Permission Matrix
          </Button>
          <Button 
            onClick={() => setShowCreateRole(true)}
            className="gradient-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>
      </div>

      {/* System Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Roles</CardTitle>
          <CardDescription>Built-in roles with predefined permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles?.filter(role => role.is_system_role).map((role) => (
              <Card 
                key={role.id} 
                className={`border-2 ${getRoleColor(role.hierarchy_level)} interactive-lift`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(role.slug, role.hierarchy_level)}
                      <h4 className="font-semibold">{role.name}</h4>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      System
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {role.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>0 members</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingRole(role)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCloneRole(role)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Clone Role
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom Roles</CardTitle>
          <CardDescription>Custom roles created for this team</CardDescription>
        </CardHeader>
        <CardContent>
          {roles?.filter(role => !role.is_system_role).length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No custom roles</h3>
              <p className="text-muted-foreground mb-4">
                Create custom roles to define specific permissions for your team
              </p>
              <Button 
                onClick={() => setShowCreateRole(true)}
                className="gradient-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Role
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles?.filter(role => !role.is_system_role).map((role) => (
                <Card 
                  key={role.id} 
                  className={`border-2 ${getRoleColor(role.hierarchy_level)} interactive-lift`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(role.slug, role.hierarchy_level)}
                        <h4 className="font-semibold">{role.name}</h4>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Custom
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {role.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>0 members</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingRole(role)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Role
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCloneRole(role)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Clone Role
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteRole(role.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Role
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Editor Dialog */}
      <RoleEditor
        role={editingRole}
        isOpen={!!editingRole || showCreateRole}
        onClose={() => {
          setEditingRole(null);
          setShowCreateRole(false);
        }}
        teamId={teamId}
        mode={editingRole ? 'edit' : 'create'}
      />

      {/* Permission Matrix Dialog */}
      <Dialog open={showPermissionMatrix} onOpenChange={setShowPermissionMatrix}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Permission Matrix</DialogTitle>
            <DialogDescription>
              View and compare permissions across all roles
            </DialogDescription>
          </DialogHeader>
          <PermissionMatrix />
        </DialogContent>
      </Dialog>
    </div>
  );
};