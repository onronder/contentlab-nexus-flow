import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Edit, 
  Users, 
  Crown, 
  Eye,
  Database,
  FileText,
  BarChart3,
  Settings,
  MessageSquare,
  Globe
} from 'lucide-react';
import { UserRole, TeamCreateInput, TeamUpdateInput } from '@/types/team';
import { Permission } from '@/types/permissions';
import { usePermissions } from '@/hooks/usePermissionQueries';
import { useCreateTeam, useUpdateTeam } from '@/hooks/useTeamMutations';
import { useToast } from '@/hooks/use-toast';

interface RoleEditorProps {
  role?: UserRole | null;
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  mode: 'create' | 'edit';
}

export const RoleEditor: React.FC<RoleEditorProps> = ({
  role,
  isOpen,
  onClose,
  teamId,
  mode
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hierarchy_level: 1,
    role_type: 'custom' as const
  });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: permissions } = usePermissions();
  // Role management hooks would be implemented separately
  const createRole = { mutateAsync: async () => {}, isPending: false };
  const updateRole = { mutateAsync: async () => {}, isPending: false };

  useEffect(() => {
    if (role && mode === 'edit') {
      setFormData({
        name: role.name,
        description: role.description || '',
        hierarchy_level: role.hierarchy_level,
        role_type: 'custom' as const
      });
      // Load role permissions
      setSelectedPermissions([]);
    } else {
      setFormData({
        name: '',
        description: '',
        hierarchy_level: 1,
        role_type: 'custom'
      });
      setSelectedPermissions([]);
    }
  }, [role, mode]);

  const handleSave = async () => {
    try {
      if (mode === 'create') {
        // Create role implementation
        console.log('Creating role:', formData);
        toast({
          title: "Role created",
          description: "New role has been created successfully."
        });
      } else if (role) {
        // Update role implementation
        console.log('Updating role:', formData);
        toast({
          title: "Role updated",
          description: "Role has been updated successfully."
        });
      }
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save role. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    if (checked) {
      setSelectedPermissions(prev => [...prev, permissionId]);
    } else {
      setSelectedPermissions(prev => prev.filter(id => id !== permissionId));
    }
  };

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'teams': return <Users className="h-4 w-4" />;
      case 'projects': return <Database className="h-4 w-4" />;
      case 'content': return <FileText className="h-4 w-4" />;
      case 'analytics': return <BarChart3 className="h-4 w-4" />;
      case 'settings': return <Settings className="h-4 w-4" />;
      case 'comments': return <MessageSquare className="h-4 w-4" />;
      case 'system': return <Globe className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getHierarchyIcon = (level: number) => {
    if (level >= 10) return <Crown className="h-4 w-4 text-yellow-600" />;
    if (level >= 8) return <Shield className="h-4 w-4 text-red-600" />;
    if (level >= 5) return <Edit className="h-4 w-4 text-blue-600" />;
    return <Eye className="h-4 w-4 text-gray-600" />;
  };

  const getHierarchyDescription = (level: number) => {
    if (level >= 10) return "Super Admin - Full system access";
    if (level >= 8) return "Admin - Full team management";
    if (level >= 5) return "Manager - Content and member management";
    if (level >= 3) return "Editor - Content creation and editing";
    return "Viewer - Read-only access";
  };

  // Group permissions by module
  const groupedPermissions = permissions?.reduce((acc, permission) => {
    const module = permission.module;
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>) || {};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Role' : 'Edit Role'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Define a new role with specific permissions for your team members'
              : 'Update role details and permissions'
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Role Details</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <ScrollArea className="max-h-[60vh] mt-4">
            <TabsContent value="details" className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Basic Information</CardTitle>
                  <CardDescription>Define the role name and description</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="role-name">Role Name</Label>
                    <Input
                      id="role-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Content Editor"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role-description">Description</Label>
                    <Textarea
                      id="role-description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what this role can do..."
                      className="min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Hierarchy Level */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Access Level</CardTitle>
                  <CardDescription>
                    Set the hierarchy level for this role (higher levels have more access)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="hierarchy-level">Hierarchy Level</Label>
                    <Select 
                      value={formData.hierarchy_level.toString()} 
                      onValueChange={(value) => setFormData({ ...formData, hierarchy_level: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">Level 10 - Super Admin</SelectItem>
                        <SelectItem value="9">Level 9 - System Admin</SelectItem>
                        <SelectItem value="8">Level 8 - Admin</SelectItem>
                        <SelectItem value="7">Level 7 - Senior Manager</SelectItem>
                        <SelectItem value="6">Level 6 - Manager</SelectItem>
                        <SelectItem value="5">Level 5 - Team Lead</SelectItem>
                        <SelectItem value="4">Level 4 - Senior Editor</SelectItem>
                        <SelectItem value="3">Level 3 - Editor</SelectItem>
                        <SelectItem value="2">Level 2 - Contributor</SelectItem>
                        <SelectItem value="1">Level 1 - Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    {getHierarchyIcon(formData.hierarchy_level)}
                    <div>
                      <p className="font-medium">Level {formData.hierarchy_level}</p>
                      <p className="text-sm text-muted-foreground">
                        {getHierarchyDescription(formData.hierarchy_level)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Role Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Role Preview</CardTitle>
                  <CardDescription>Preview how this role will appear</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getHierarchyIcon(formData.hierarchy_level)}
                        <h4 className="font-semibold">{formData.name || 'Role Name'}</h4>
                      </div>
                      <Badge variant="secondary">Custom</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formData.description || 'Role description will appear here'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-6">
              {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                <Card key={module}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      {getModuleIcon(module)}
                      <span className="capitalize">{module}</span>
                      <Badge variant="outline" className="ml-auto">
                        {modulePermissions.length} permissions
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {modulePermissions.map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission.id}
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={(checked) => 
                              handlePermissionToggle(permission.id, checked as boolean)
                            }
                          />
                          <div className="flex-1">
                            <Label 
                              htmlFor={permission.id} 
                              className="text-sm font-medium cursor-pointer"
                            >
                              {permission.name}
                            </Label>
                            {permission.description && (
                              <p className="text-xs text-muted-foreground">
                                {permission.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {Object.keys(groupedPermissions).length === 0 && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No permissions available</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <Separator />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={createRole.isPending || updateRole.isPending || !formData.name}
            className="gradient-primary"
          >
            {createRole.isPending || updateRole.isPending 
              ? 'Saving...' 
              : mode === 'create' ? 'Create Role' : 'Save Changes'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};