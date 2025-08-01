import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { roleService } from '@/services/roleService';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      then: vi.fn()
    }))
  }
}));

describe('RoleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear permission cache
    (roleService as any).permissionCache.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getRoles', () => {
    it('should fetch active roles by default', async () => {
      const mockRoles = [
        { id: '1', name: 'Admin', slug: 'admin', is_active: true },
        { id: '2', name: 'User', slug: 'user', is_active: true }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockRoles, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await roleService.getRoles();

      expect(supabase.from).toHaveBeenCalledWith('user_roles');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
      expect(result).toEqual(mockRoles);
    });

    it('should include inactive roles when requested', async () => {
      const mockRoles = [
        { id: '1', name: 'Admin', slug: 'admin', is_active: true },
        { id: '2', name: 'Deprecated', slug: 'deprecated', is_active: false }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockRoles, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await roleService.getRoles(true);

      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.order).toHaveBeenCalledWith('hierarchy_level', { ascending: false });
      expect(result).toEqual(mockRoles);
    });

    it('should handle database errors', async () => {
      const mockError = new Error('Database connection failed');
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      await expect(roleService.getRoles()).rejects.toThrow('Failed to fetch roles: Database connection failed');
    });
  });

  describe('createRole', () => {
    it('should create a new role with valid data', async () => {
      const roleData = {
        name: 'Test Role',
        slug: 'test-role',
        description: 'A test role',
        hierarchy_level: 5
      };

      const mockCreatedRole = { id: '123', ...roleData, is_active: true };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCreatedRole, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await roleService.createRole(roleData);

      expect(supabase.from).toHaveBeenCalledWith('user_roles');
      expect(mockQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: roleData.name,
        slug: roleData.slug,
        description: roleData.description,
        hierarchy_level: roleData.hierarchy_level
      }));
      expect(result).toEqual(mockCreatedRole);
    });

    it('should validate role data before creation', async () => {
      const invalidRoleData = {
        name: '', // Invalid: empty name
        slug: 'test'
      };

      await expect(roleService.createRole(invalidRoleData as any)).rejects.toThrow('Role name is required');
    });
  });

  describe('checkUserPermission', () => {
    it('should return cached permission result', async () => {
      const userId = 'user123';
      const permission = 'projects.create';
      
      // Setup cache
      const cache = (roleService as any).permissionCache;
      cache.set(`${userId}:global`, new Set([permission]));

      const result = await roleService.checkUserPermission(userId, permission);

      expect(result).toBe(true);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should fetch permissions when not cached', async () => {
      const userId = 'user123';
      const permission = 'projects.create';
      
      const mockPermissions = [
        { permission_slug: 'projects.create' },
        { permission_slug: 'projects.read' }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        mockResolvedValue: vi.fn().mockResolvedValue({ data: mockPermissions, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      // Mock the complex query
      const complexMockQuery = vi.fn().mockResolvedValue({ data: mockPermissions, error: null });
      mockQuery.select.mockReturnValue({ ...mockQuery, then: complexMockQuery });

      const result = await roleService.checkUserPermission(userId, permission);

      expect(result).toBe(true);
    });

    it('should handle permission check errors gracefully', async () => {
      const userId = 'user123';
      const permission = 'projects.create';
      
      const mockError = new Error('Database error');
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockRejectedValue(mockError)
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await roleService.checkUserPermission(userId, permission);

      expect(result).toBe(false);
    });
  });

  describe('assignPermissionsToRole', () => {
    it('should assign permissions to a role', async () => {
      const roleId = 'role123';
      const permissionIds = ['perm1', 'perm2'];

      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      const mockInsertQuery = {
        insert: vi.fn().mockResolvedValue({ error: null })
      };

      (supabase.from as any)
        .mockReturnValueOnce(mockDeleteQuery)
        .mockReturnValueOnce(mockInsertQuery);

      await roleService.assignPermissionsToRole(roleId, permissionIds);

      expect(mockDeleteQuery.delete).toHaveBeenCalled();
      expect(mockDeleteQuery.eq).toHaveBeenCalledWith('role_id', roleId);
      expect(mockInsertQuery.insert).toHaveBeenCalledWith(
        permissionIds.map(pid => ({ role_id: roleId, permission_id: pid }))
      );
    });

    it('should handle assignment errors', async () => {
      const roleId = 'role123';
      const permissionIds = ['perm1'];

      const mockError = new Error('Assignment failed');
      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      };

      const mockInsertQuery = {
        insert: vi.fn().mockResolvedValue({ error: mockError })
      };

      (supabase.from as any)
        .mockReturnValueOnce(mockDeleteQuery)
        .mockReturnValueOnce(mockInsertQuery);

      await expect(roleService.assignPermissionsToRole(roleId, permissionIds))
        .rejects.toThrow('Failed to assign permissions: Assignment failed');
    });
  });

  describe('canAccessResource', () => {
    it('should return correct resource access permissions', async () => {
      const userId = 'user123';
      const resourceType = 'project';
      const resourceId = 'proj123';

      // Mock the resource access check
      const mockUserPermissions = ['projects.read', 'projects.write'];
      vi.spyOn(roleService, 'getUserPermissions').mockResolvedValue(
        mockUserPermissions.map(slug => ({ slug } as any))
      );

      const result = await roleService.canAccessResource(userId, resourceType, resourceId);

      expect(result).toEqual({
        canRead: true,
        canWrite: true,
        canDelete: false,
        canManage: false,
        permissions: mockUserPermissions
      });
    });

    it('should handle resource access errors', async () => {
      const userId = 'user123';
      const resourceType = 'project';
      const resourceId = 'proj123';

      vi.spyOn(roleService, 'getUserPermissions').mockRejectedValue(new Error('Permission error'));

      const result = await roleService.canAccessResource(userId, resourceType, resourceId);

      expect(result).toEqual({
        canRead: false,
        canWrite: false,
        canDelete: false,
        canManage: false,
        permissions: []
      });
    });
  });
});