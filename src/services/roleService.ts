import { supabase } from '@/integrations/supabase/client';
import { 
  Permission, 
  RolePermission, 
  RoleWithPermissions, 
  RoleCreateInput, 
  RoleUpdateInput,
  PermissionContext,
  ResourceAccess,
  PermissionCache
} from '@/types/permissions';
import { UserRole } from '@/types/team';

class RoleService {
  private permissionCache = new Map<string, PermissionCache>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // ============================================================================
  // ROLE MANAGEMENT
  // ============================================================================

  async getRoles(includeInactive = false): Promise<UserRole[]> {
    try {
      let query = (supabase as any)
        .from('user_roles')
        .select('*')
        .order('hierarchy_level', { ascending: false });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching roles:', error);
        throw new Error(`Failed to fetch roles: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRoles:', error);
      throw error;
    }
  }

  async getRoleBySlug(slug: string): Promise<UserRole | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('user_roles')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching role by slug:', error);
        throw new Error(`Failed to fetch role: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in getRoleBySlug:', error);
      throw error;
    }
  }

  async createRole(roleData: RoleCreateInput): Promise<UserRole> {
    try {
      this.validateRoleData(roleData);

      const { data, error } = await (supabase as any)
        .from('user_roles')
        .insert({
          name: roleData.name,
          slug: roleData.slug,
          description: roleData.description,
          hierarchy_level: roleData.hierarchy_level,
          role_type: roleData.role_type || 'custom',
          is_active: roleData.is_active !== false,
          is_system_role: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating role:', error);
        throw new Error(`Failed to create role: ${error.message}`);
      }

      this.clearPermissionCache();
      return data;
    } catch (error) {
      console.error('Error in createRole:', error);
      throw error;
    }
  }

  async updateRole(roleId: string, updates: RoleUpdateInput): Promise<UserRole> {
    try {
      const { data, error } = await (supabase as any)
        .from('user_roles')
        .update(updates)
        .eq('id', roleId)
        .select()
        .single();

      if (error) {
        console.error('Error updating role:', error);
        throw new Error(`Failed to update role: ${error.message}`);
      }

      this.clearPermissionCache();
      return data;
    } catch (error) {
      console.error('Error in updateRole:', error);
      throw error;
    }
  }

  async deleteRole(roleId: string): Promise<void> {
    try {
      // Soft delete by setting is_active to false
      const { error } = await (supabase as any)
        .from('user_roles')
        .update({ is_active: false })
        .eq('id', roleId);

      if (error) {
        console.error('Error deleting role:', error);
        throw new Error(`Failed to delete role: ${error.message}`);
      }

      this.clearPermissionCache();
    } catch (error) {
      console.error('Error in deleteRole:', error);
      throw error;
    }
  }

  // ============================================================================
  // PERMISSION MANAGEMENT
  // ============================================================================

  async getPermissions(): Promise<Permission[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('permissions')
        .select('*')
        .order('module', { ascending: true })
        .order('action', { ascending: true });

      if (error) {
        console.error('Error fetching permissions:', error);
        throw new Error(`Failed to fetch permissions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPermissions:', error);
      throw error;
    }
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('role_permissions')
        .select(`
          id,
          role_id,
          permission_id,
          granted_by,
          granted_at,
          permission:permissions(*)
        `)
        .eq('role_id', roleId);

      if (error) {
        console.error('Error fetching role permissions:', error);
        throw new Error(`Failed to fetch role permissions: ${error.message}`);
      }

      return (data || [])
        .map((rp: any) => rp.permission)
        .filter(Boolean) as Permission[];
    } catch (error) {
      console.error('Error in getRolePermissions:', error);
      throw error;
    }
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void> {
    try {
      // Remove existing permissions
      await (supabase as any)
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);

      // Add new permissions
      if (permissionIds.length > 0) {
        const rolePermissions = permissionIds.map(permissionId => ({
          role_id: roleId,
          permission_id: permissionId
        }));

        const { error } = await (supabase as any)
          .from('role_permissions')
          .insert(rolePermissions);

        if (error) {
          console.error('Error assigning permissions to role:', error);
          throw new Error(`Failed to assign permissions: ${error.message}`);
        }
      }

      this.clearPermissionCache();
    } catch (error) {
      console.error('Error in assignPermissionsToRole:', error);
      throw error;
    }
  }

  // ============================================================================
  // PERMISSION CHECKING
  // ============================================================================

  async checkUserPermission(
    userId: string, 
    permissionSlug: string, 
    teamId?: string
  ): Promise<boolean> {
    try {
      const cacheKey = `${userId}:${teamId || 'global'}`;
      const cached = this.permissionCache.get(cacheKey);

      if (cached && cached.expiresAt > Date.now()) {
        return cached.permissions.has(permissionSlug);
      }

      const permissions = await this.getUserPermissions(userId, teamId);
      const permissionSlugs = new Set(permissions.map(p => p.slug));

      // Cache the permissions
      this.permissionCache.set(cacheKey, {
        userId,
        teamId,
        permissions: permissionSlugs,
        lastUpdated: Date.now(),
        expiresAt: Date.now() + this.CACHE_TTL
      });

      return permissionSlugs.has(permissionSlug);
    } catch (error) {
      console.error('Error checking user permission:', error);
      return false;
    }
  }

  async getUserPermissions(userId: string, teamId?: string): Promise<Permission[]> {
    try {
      let query = (supabase as any)
        .from('team_members')
        .select(`
          role_id,
          user_roles!inner(
            id,
            slug,
            hierarchy_level,
            is_active
          ),
          role_permissions!inner(
            permission:permissions(*)
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('status', 'active');

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching user permissions:', error);
        throw new Error(`Failed to fetch user permissions: ${error.message}`);
      }

      // Flatten and deduplicate permissions
      const permissions = new Map<string, Permission>();
      
      (data || []).forEach((member: any) => {
        member.role_permissions?.forEach((rp: any) => {
          if (rp.permission) {
            permissions.set(rp.permission.id, rp.permission);
          }
        });
      });

      return Array.from(permissions.values());
    } catch (error) {
      console.error('Error in getUserPermissions:', error);
      return [];
    }
  }

  async hasPermission(
    userId: string, 
    permission: string, 
    context?: PermissionContext
  ): Promise<boolean> {
    try {
      return await this.checkUserPermission(userId, permission, context?.teamId);
    } catch (error) {
      console.error('Error in hasPermission:', error);
      return false;
    }
  }

  async canAccessResource(
    userId: string, 
    resourceType: string, 
    resourceId: string
  ): Promise<ResourceAccess> {
    try {
      const basePermission = resourceType.toLowerCase();
      
      const [canRead, canWrite, canDelete, canManage] = await Promise.all([
        this.checkUserPermission(userId, `${basePermission}.read`),
        this.checkUserPermission(userId, `${basePermission}.update`),
        this.checkUserPermission(userId, `${basePermission}.delete`),
        this.checkUserPermission(userId, `${basePermission}.manage`)
      ]);

      const permissions: string[] = [];
      if (canRead) permissions.push(`${basePermission}.read`);
      if (canWrite) permissions.push(`${basePermission}.update`);
      if (canDelete) permissions.push(`${basePermission}.delete`);
      if (canManage) permissions.push(`${basePermission}.manage`);

      return {
        canRead,
        canWrite,
        canDelete,
        canManage,
        permissions
      };
    } catch (error) {
      console.error('Error in canAccessResource:', error);
      return {
        canRead: false,
        canWrite: false,
        canDelete: false,
        canManage: false,
        permissions: []
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private validateRoleData(roleData: RoleCreateInput): void {
    if (!roleData.name?.trim()) {
      throw new Error('Role name is required');
    }

    if (!roleData.slug?.trim()) {
      throw new Error('Role slug is required');
    }

    if (!/^[a-z0-9-_]+$/.test(roleData.slug)) {
      throw new Error('Role slug must contain only lowercase letters, numbers, hyphens, and underscores');
    }

    if (roleData.hierarchy_level < 0 || roleData.hierarchy_level > 10) {
      throw new Error('Hierarchy level must be between 0 and 10');
    }
  }

  private clearPermissionCache(): void {
    this.permissionCache.clear();
  }

  async invalidateUserPermissions(userId: string, teamId?: string): Promise<void> {
    const cacheKey = `${userId}:${teamId || 'global'}`;
    this.permissionCache.delete(cacheKey);
  }

  // Audit logging method (placeholder for future implementation)
  private async logPermissionCheck(
    userId: string,
    permission: string,
    granted: boolean,
    context?: PermissionContext
  ): Promise<void> {
    // TODO: Implement audit logging
    console.log('Permission check:', { userId, permission, granted, context });
  }
}

export const roleService = new RoleService();