import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { roleService } from '@/services/roleService';
import { Permission, PermissionContext as IPermissionContext } from '@/types/permissions';

interface PermissionContextValue {
  permissions: Permission[];
  userPermissions: Set<string>;
  loading: boolean;
  error: string | null;
  hasPermission: (permission: string, teamId?: string) => boolean;
  canAccessResource: (resourceType: string, resourceId: string) => Promise<boolean>;
  refreshPermissions: (teamId?: string) => Promise<void>;
  invalidateCache: (teamId?: string) => void;
}

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

interface PermissionProviderProps {
  children: ReactNode;
  teamId?: string;
}

export function PermissionProvider({ children, teamId }: PermissionProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user permissions
  const fetchUserPermissions = async (userId: string, currentTeamId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const userPerms = await roleService.getUserPermissions(userId, currentTeamId);
      const permissionSlugs = new Set(userPerms.map(p => p.slug));
      
      setUserPermissions(permissionSlugs);
      setPermissions(userPerms);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch permissions';
      console.error('Error fetching user permissions:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all available permissions (for UI purposes)
  const fetchAllPermissions = async () => {
    try {
      const allPerms = await roleService.getPermissions();
      setPermissions(allPerms);
    } catch (err) {
      console.error('Error fetching all permissions:', err);
    }
  };

  // Initialize permissions when user or teamId changes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchUserPermissions(user.id, teamId);
    } else {
      setUserPermissions(new Set());
      setPermissions([]);
      setLoading(false);
    }
  }, [user?.id, teamId, isAuthenticated]);

  // Permission checking function
  const hasPermission = (permission: string, currentTeamId?: string): boolean => {
    if (!isAuthenticated || !user?.id) return false;
    
    // If teamId is specified and different from context, we can't reliably check
    // In a real implementation, you might want to fetch permissions for the specific team
    if (currentTeamId && currentTeamId !== teamId) {
      console.warn('Permission check for different team - consider refetching permissions');
    }
    
    return userPermissions.has(permission);
  };

  // Resource access checking
  const canAccessResource = async (resourceType: string, resourceId: string): Promise<boolean> => {
    if (!isAuthenticated || !user?.id) return false;
    
    try {
      const access = await roleService.canAccessResource(user.id, resourceType, resourceId);
      return access.canRead; // Default to read access
    } catch (error) {
      console.error('Error checking resource access:', error);
      return false;
    }
  };

  // Refresh permissions
  const refreshPermissions = async (currentTeamId?: string): Promise<void> => {
    if (user?.id) {
      await fetchUserPermissions(user.id, currentTeamId || teamId);
    }
  };

  // Invalidate cache
  const invalidateCache = (currentTeamId?: string): void => {
    if (user?.id) {
      roleService.invalidateUserPermissions(user.id, currentTeamId || teamId);
    }
  };

  const value: PermissionContextValue = {
    permissions,
    userPermissions,
    loading,
    error,
    hasPermission,
    canAccessResource,
    refreshPermissions,
    invalidateCache
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

// Hook to use permission context
export function usePermissions(): PermissionContextValue {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

// Hook to check specific permission
export function useHasPermission(permission: string, teamId?: string): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(permission, teamId);
}

// Hook to check resource access
export function useCanAccess(resource: string, action: string): boolean {
  const { hasPermission } = usePermissions();
  const permission = `${resource}.${action}`;
  return hasPermission(permission);
}

// Hook for multiple permission checks
export function usePermissionChecks(permissions: string[], teamId?: string): Record<string, boolean> {
  const { hasPermission } = usePermissions();
  
  return React.useMemo(() => {
    return permissions.reduce((acc, permission) => {
      acc[permission] = hasPermission(permission, teamId);
      return acc;
    }, {} as Record<string, boolean>);
  }, [permissions, hasPermission, teamId]);
}