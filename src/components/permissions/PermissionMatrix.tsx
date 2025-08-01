import React, { useState } from 'react';
import { Check, X, Shield, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePermissionMatrix } from '@/hooks/usePermissionQueries';
import { useAssignPermissions } from '@/hooks/usePermissionMutations';
import { Permission, PermissionUtils } from '@/types/permissions';
import { UserRole } from '@/types/team';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface PermissionMatrixProps {
  roleId?: string;
  onPermissionChange?: (roleId: string, permissionIds: string[]) => void;
  readOnly?: boolean;
}

export function PermissionMatrix({ 
  roleId, 
  onPermissionChange,
  readOnly = false 
}: PermissionMatrixProps) {
  const { data, isLoading } = usePermissionMatrix();
  const assignPermissions = useAssignPermissions();
  const [changedPermissions, setChangedPermissions] = useState<Record<string, Set<string>>>({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="md" />
        <span className="ml-3">Loading permission matrix...</span>
      </div>
    );
  }

  if (!data) return null;

  const { permissions, roles, matrix } = data;
  const groupedPermissions = PermissionUtils.groupPermissionsByModule(permissions);
  const filteredRoles = roleId ? roles.filter(r => r.id === roleId) : roles;

  const handlePermissionToggle = (role: UserRole, permission: Permission) => {
    if (readOnly) return;

    const currentPermissions = new Set(matrix[role.id]?.map(p => p.id) || []);
    const roleChanges = changedPermissions[role.id] || new Set();
    
    if (currentPermissions.has(permission.id)) {
      currentPermissions.delete(permission.id);
      roleChanges.delete(permission.id);
    } else {
      currentPermissions.add(permission.id);
      roleChanges.add(permission.id);
    }
    
    setChangedPermissions(prev => ({
      ...prev,
      [role.id]: roleChanges
    }));

    if (onPermissionChange) {
      onPermissionChange(role.id, Array.from(currentPermissions));
    }
  };

  const saveChanges = async (role: UserRole) => {
    const currentPermissions = matrix[role.id]?.map(p => p.id) || [];
    const changes = changedPermissions[role.id];
    
    if (!changes || changes.size === 0) return;

    const finalPermissions = new Set(currentPermissions);
    changes.forEach(permId => {
      if (finalPermissions.has(permId)) {
        finalPermissions.delete(permId);
      } else {
        finalPermissions.add(permId);
      }
    });

    await assignPermissions.mutateAsync({
      roleId: role.id,
      permissionIds: Array.from(finalPermissions)
    });

    setChangedPermissions(prev => {
      const updated = { ...prev };
      delete updated[role.id];
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
        <Card key={module}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 capitalize">
              <Shield className="h-5 w-5" />
              {module} Permissions
            </CardTitle>
            <CardDescription>
              Manage {module} access permissions for each role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Permission</th>
                    {filteredRoles.map(role => (
                      <th key={role.id} className="text-center p-2 min-w-24">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {role.name}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Level {role.hierarchy_level}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modulePermissions.map(permission => (
                    <tr key={permission.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{permission.name}</div>
                          {permission.description && (
                            <div className="text-sm text-muted-foreground">
                              {permission.description}
                            </div>
                          )}
                        </div>
                      </td>
                      {filteredRoles.map(role => {
                        const hasPermission = matrix[role.id]?.some(p => p.id === permission.id) || false;
                        const hasChanges = changedPermissions[role.id]?.size > 0;

                        return (
                          <td key={`${role.id}-${permission.id}`} className="p-2 text-center">
                            {readOnly ? (
                              hasPermission ? (
                                <Check className="h-5 w-5 text-green-600 mx-auto" />
                              ) : (
                                <X className="h-5 w-5 text-gray-300 mx-auto" />
                              )
                            ) : (
                              <Switch
                                checked={hasPermission}
                                onCheckedChange={() => handlePermissionToggle(role, permission)}
                                disabled={assignPermissions.isPending}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!readOnly && filteredRoles.some(role => changedPermissions[role.id]?.size > 0) && (
              <div className="mt-4 flex gap-2">
                {filteredRoles.map(role => {
                  const hasChanges = changedPermissions[role.id]?.size > 0;
                  if (!hasChanges) return null;

                  return (
                    <Button
                      key={role.id}
                      onClick={() => saveChanges(role)}
                      disabled={assignPermissions.isPending}
                      size="sm"
                    >
                      Save {role.name} Changes
                    </Button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}