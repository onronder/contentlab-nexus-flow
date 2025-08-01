// Permission system types
export type PermissionModule = 'projects' | 'content' | 'competitive' | 'analytics' | 'team' | 'settings' | 'billing';
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'approve' | 'export' | 'invite';

export interface Permission {
  id: string;
  name: string;
  slug: string;
  description?: string;
  module: PermissionModule;
  action: PermissionAction;
  resource?: string;
  is_system_permission: boolean;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  granted_by?: string;
  granted_at: string;
  permission?: Permission;
}

// Role types extending existing team types
export interface RoleCreateInput {
  name: string;
  slug: string;
  description?: string;
  hierarchy_level: number;
  role_type?: 'system' | 'custom';
  is_active?: boolean;
}

export interface RoleUpdateInput {
  name?: string;
  description?: string;
  hierarchy_level?: number;
  is_active?: boolean;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  slug: string;
  description?: string;
  hierarchy_level: number;
  role_type: 'system' | 'custom';
  is_system_role: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  permissions: Permission[];
}

// Permission checking types
export interface PermissionCheck {
  permission: string;
  granted: boolean;
  reason?: string;
}

export interface PermissionContext {
  userId: string;
  teamId?: string;
  resourceType?: string;
  resourceId?: string;
}

export interface ResourceAccess {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canManage: boolean;
  permissions: string[];
}

// Permission cache types
export interface PermissionCache {
  userId: string;
  teamId?: string;
  permissions: Set<string>;
  lastUpdated: number;
  expiresAt: number;
}

// Audit logging types
export interface PermissionAuditLog {
  id: string;
  user_id: string;
  action: 'granted' | 'revoked' | 'checked' | 'denied';
  permission_slug: string;
  resource_type?: string;
  resource_id?: string;
  team_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// Default permission mappings
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  'owner': [
    'projects.create', 'projects.read', 'projects.update', 'projects.delete', 'projects.manage',
    'content.create', 'content.read', 'content.update', 'content.delete', 'content.approve',
    'competitive.read', 'competitive.manage', 'competitive.export',
    'analytics.read', 'analytics.export',
    'team.read', 'team.manage', 'team.invite',
    'settings.read', 'settings.manage',
    'billing.read', 'billing.manage'
  ],
  'admin': [
    'projects.create', 'projects.read', 'projects.update', 'projects.delete', 'projects.manage',
    'content.create', 'content.read', 'content.update', 'content.delete', 'content.approve',
    'competitive.read', 'competitive.manage', 'competitive.export',
    'analytics.read', 'analytics.export',
    'team.read', 'team.manage', 'team.invite',
    'settings.read', 'settings.manage'
  ],
  'manager': [
    'projects.create', 'projects.read', 'projects.update', 'projects.manage',
    'content.create', 'content.read', 'content.update', 'content.approve',
    'competitive.read', 'competitive.manage', 'competitive.export',
    'analytics.read', 'analytics.export',
    'team.read', 'team.manage', 'team.invite'
  ],
  'editor': [
    'projects.create', 'projects.read', 'projects.update',
    'content.create', 'content.read', 'content.update',
    'competitive.read',
    'analytics.read'
  ],
  'viewer': [
    'projects.read',
    'content.read',
    'competitive.read',
    'analytics.read',
    'team.read'
  ]
};

// Permission helper utilities
export class PermissionUtils {
  static parsePermission(permission: string): { module: string; action: string } | null {
    const parts = permission.split('.');
    if (parts.length !== 2) return null;
    return { module: parts[0], action: parts[1] };
  }

  static hasHigherHierarchy(userLevel: number, requiredLevel: number): boolean {
    return userLevel >= requiredLevel;
  }

  static isSystemPermission(permission: Permission): boolean {
    return permission.is_system_permission;
  }

  static groupPermissionsByModule(permissions: Permission[]): Record<PermissionModule, Permission[]> {
    return permissions.reduce((groups, permission) => {
      if (!groups[permission.module]) {
        groups[permission.module] = [];
      }
      groups[permission.module].push(permission);
      return groups;
    }, {} as Record<PermissionModule, Permission[]>);
  }

  static formatPermissionName(permission: Permission): string {
    return `${permission.module}.${permission.action}${permission.resource ? `.${permission.resource}` : ''}`;
  }
}