import { useQuery } from '@tanstack/react-query';
import { roleService } from '@/services/roleService';
import { useAuth } from '@/hooks/useAuth';
import { Permission } from '@/types/permissions';
import { UserRole } from '@/types/team';

// ============================================================================
// PERMISSION QUERIES
// ============================================================================

export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: () => roleService.getPermissions(),
    staleTime: 10 * 60 * 1000, // 10 minutes - permissions don't change often
  });
}

export function useUserRoles(includeInactive = false) {
  return useQuery({
    queryKey: ['userRoles', includeInactive],
    queryFn: () => roleService.getRoles(includeInactive),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRolePermissions(roleId: string) {
  return useQuery({
    queryKey: ['rolePermissions', roleId],
    queryFn: () => roleService.getRolePermissions(roleId),
    enabled: !!roleId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUserPermissions(userId?: string, teamId?: string) {
  const { user } = useAuth();
  const effectiveUserId = userId || user?.id;

  return useQuery({
    queryKey: ['userPermissions', effectiveUserId, teamId],
    queryFn: () => roleService.getUserPermissions(effectiveUserId!, teamId),
    enabled: !!effectiveUserId,
    staleTime: 2 * 60 * 1000, // 2 minutes - user permissions change more frequently
  });
}

export function useHasPermission(permission: string, teamId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['hasPermission', user?.id, permission, teamId],
    queryFn: async () => {
      if (!user?.id) return false;
      return roleService.checkUserPermission(user.id, permission, teamId);
    },
    enabled: !!user?.id && !!permission,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCanAccessResource(resourceType: string, resourceId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['canAccessResource', user?.id, resourceType, resourceId],
    queryFn: async () => {
      if (!user?.id) return {
        canRead: false,
        canWrite: false,
        canDelete: false,
        canManage: false,
        permissions: []
      };
      return roleService.canAccessResource(user.id, resourceType, resourceId);
    },
    enabled: !!user?.id && !!resourceType && !!resourceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Batch permission checking hook
export function usePermissionChecks(permissions: string[], teamId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['permissionChecks', user?.id, permissions, teamId],
    queryFn: async () => {
      if (!user?.id) return {};
      
      const results: Record<string, boolean> = {};
      
      // Check permissions in parallel for better performance
      const checks = await Promise.all(
        permissions.map(async (permission) => ({
          permission,
          granted: await roleService.checkUserPermission(user.id, permission, teamId)
        }))
      );
      
      checks.forEach(({ permission, granted }) => {
        results[permission] = granted;
      });
      
      return results;
    },
    enabled: !!user?.id && permissions.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Role-specific queries
export function useRoleBySlug(slug: string) {
  return useQuery({
    queryKey: ['roleBySlug', slug],
    queryFn: () => roleService.getRoleBySlug(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Combined permission and role data
export function usePermissionMatrix() {
  const permissionsQuery = usePermissions();
  const rolesQuery = useUserRoles();
  
  return useQuery({
    queryKey: ['permissionMatrix'],
    queryFn: async () => {
      const [permissions, roles] = await Promise.all([
        permissionsQuery.refetch().then(r => r.data || []),
        rolesQuery.refetch().then(r => r.data || [])
      ]);
      
      // Build a matrix of role -> permissions
      const matrix: Record<string, Permission[]> = {};
      
      for (const role of roles) {
        try {
          matrix[role.id] = await roleService.getRolePermissions(role.id);
        } catch (error) {
          console.error(`Error fetching permissions for role ${role.slug}:`, error);
          matrix[role.id] = [];
        }
      }
      
      return {
        permissions,
        roles,
        matrix
      };
    },
    enabled: permissionsQuery.isSuccess && rolesQuery.isSuccess,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}