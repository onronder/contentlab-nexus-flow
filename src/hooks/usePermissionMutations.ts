import { useMutation, useQueryClient } from '@tanstack/react-query';
import { roleService } from '@/services/roleService';
import { RoleCreateInput, RoleUpdateInput } from '@/types/permissions';
import { toast } from 'sonner';

// ============================================================================
// ROLE MUTATIONS
// ============================================================================

export function useCreateRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (roleData: RoleCreateInput) => roleService.createRole(roleData),
    onSuccess: (newRole) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      
      toast.success(`Role "${newRole.name}" created successfully`);
    },
    onError: (error: Error) => {
      console.error('Error creating role:', error);
      toast.error(`Failed to create role: ${error.message}`);
    }
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roleId, updates }: { roleId: string; updates: RoleUpdateInput }) => 
      roleService.updateRole(roleId, updates),
    onSuccess: (updatedRole) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      queryClient.invalidateQueries({ queryKey: ['roleBySlug'] });
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      queryClient.invalidateQueries({ queryKey: ['rolePermissions', updatedRole.id] });
      
      // Invalidate user permissions for all users (since role changed)
      queryClient.invalidateQueries({ queryKey: ['userPermissions'] });
      queryClient.invalidateQueries({ queryKey: ['hasPermission'] });
      queryClient.invalidateQueries({ queryKey: ['permissionChecks'] });
      
      toast.success(`Role "${updatedRole.name}" updated successfully`);
    },
    onError: (error: Error) => {
      console.error('Error updating role:', error);
      toast.error(`Failed to update role: ${error.message}`);
    }
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (roleId: string) => roleService.deleteRole(roleId),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      
      // Invalidate user permissions for all users (since role was deleted)
      queryClient.invalidateQueries({ queryKey: ['userPermissions'] });
      queryClient.invalidateQueries({ queryKey: ['hasPermission'] });
      queryClient.invalidateQueries({ queryKey: ['permissionChecks'] });
      
      toast.success('Role deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Error deleting role:', error);
      toast.error(`Failed to delete role: ${error.message}`);
    }
  });
}

// ============================================================================
// PERMISSION ASSIGNMENT MUTATIONS
// ============================================================================

export function useAssignPermissions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      roleService.assignPermissionsToRole(roleId, permissionIds),
    onSuccess: (_, { roleId }) => {
      // Invalidate role-specific queries
      queryClient.invalidateQueries({ queryKey: ['rolePermissions', roleId] });
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      
      // Invalidate user permissions for all users with this role
      queryClient.invalidateQueries({ queryKey: ['userPermissions'] });
      queryClient.invalidateQueries({ queryKey: ['hasPermission'] });
      queryClient.invalidateQueries({ queryKey: ['permissionChecks'] });
      queryClient.invalidateQueries({ queryKey: ['canAccessResource'] });
      
      toast.success('Permissions updated successfully');
    },
    onError: (error: Error) => {
      console.error('Error assigning permissions:', error);
      toast.error(`Failed to update permissions: ${error.message}`);
    }
  });
}

// ============================================================================
// PERMISSION CACHE MANAGEMENT
// ============================================================================

export function useInvalidateUserPermissions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, teamId }: { userId: string; teamId?: string }) =>
      roleService.invalidateUserPermissions(userId, teamId),
    onSuccess: (_, { userId, teamId }) => {
      // Invalidate specific user's permission queries
      queryClient.invalidateQueries({ 
        queryKey: ['userPermissions', userId, teamId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['hasPermission', userId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['permissionChecks', userId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['canAccessResource', userId] 
      });
    }
  });
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export function useBulkAssignPermissions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assignments: Array<{ roleId: string; permissionIds: string[] }>) => {
      const results = await Promise.allSettled(
        assignments.map(({ roleId, permissionIds }) =>
          roleService.assignPermissionsToRole(roleId, permissionIds)
        )
      );
      
      const failed = results.filter(r => r.status === 'rejected').length;
      const successful = results.length - failed;
      
      return { successful, failed, total: results.length };
    },
    onSuccess: ({ successful, failed, total }) => {
      // Invalidate all permission-related queries
      queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      queryClient.invalidateQueries({ queryKey: ['userPermissions'] });
      queryClient.invalidateQueries({ queryKey: ['hasPermission'] });
      queryClient.invalidateQueries({ queryKey: ['permissionChecks'] });
      queryClient.invalidateQueries({ queryKey: ['canAccessResource'] });
      
      if (failed > 0) {
        toast.warning(`${successful} of ${total} permission assignments completed. ${failed} failed.`);
      } else {
        toast.success(`All ${total} permission assignments completed successfully`);
      }
    },
    onError: (error: Error) => {
      console.error('Error in bulk permission assignment:', error);
      toast.error(`Bulk permission assignment failed: ${error.message}`);
    }
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

export function useRefreshPermissions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, teamId }: { userId?: string; teamId?: string } = {}) => {
      // If specific user/team provided, invalidate only their permissions
      if (userId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['userPermissions', userId, teamId] }),
          queryClient.invalidateQueries({ queryKey: ['hasPermission', userId] }),
          queryClient.invalidateQueries({ queryKey: ['permissionChecks', userId] }),
          queryClient.invalidateQueries({ queryKey: ['canAccessResource', userId] })
        ]);
      } else {
        // Refresh all permission-related data
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['permissions'] }),
          queryClient.invalidateQueries({ queryKey: ['userRoles'] }),
          queryClient.invalidateQueries({ queryKey: ['rolePermissions'] }),
          queryClient.invalidateQueries({ queryKey: ['userPermissions'] }),
          queryClient.invalidateQueries({ queryKey: ['hasPermission'] }),
          queryClient.invalidateQueries({ queryKey: ['permissionChecks'] }),
          queryClient.invalidateQueries({ queryKey: ['canAccessResource'] }),
          queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] })
        ]);
      }
    },
    onSuccess: () => {
      toast.success('Permissions refreshed');
    },
    onError: (error: Error) => {
      console.error('Error refreshing permissions:', error);
      toast.error('Failed to refresh permissions');
    }
  });
}