import React from 'react';
import { roleService } from '@/services/roleService';
import { AuditService } from '@/services/auditService';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// PERMISSION MIDDLEWARE
// ============================================================================

/**
 * Permission check result interface
 */
interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  userId?: string;
}

/**
 * Higher-order component for permission-based access control
 */
export function requirePermission(permission: string, options?: {
  teamId?: string;
  fallback?: React.ComponentType;
  onDenied?: (result: PermissionCheckResult) => void;
}) {
  return function <P extends object>(WrappedComponent: React.ComponentType<P>): React.ComponentType<P> {
    return function PermissionWrapper(props: P) {
      const [checkResult, setCheckResult] = React.useState<PermissionCheckResult | null>(null);
      const [isChecking, setIsChecking] = React.useState(true);

      React.useEffect(() => {
        let isMounted = true;

        async function checkPermission() {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
              const result = { granted: false, reason: 'Not authenticated' };
              if (isMounted) {
                setCheckResult(result);
                setIsChecking(false);
                options?.onDenied?.(result);
              }
              return;
            }

            const granted = await roleService.checkUserPermission(
              user.id, 
              permission, 
              options?.teamId
            );

            const result = { 
              granted, 
              userId: user.id,
              reason: granted ? undefined : 'Insufficient permissions'
            };

            if (isMounted) {
              setCheckResult(result);
              setIsChecking(false);
              
              if (!granted) {
                options?.onDenied?.(result);
              }
            }

            // Log permission check
            await AuditService.logPermissionCheck({
              user_id: user.id,
              permission_slug: permission,
              granted,
              resource_type: 'component',
              team_id: options?.teamId,
              metadata: { component: WrappedComponent.name }
            });

          } catch (error) {
            console.error('Permission check error:', error);
            const result = { 
              granted: false, 
              reason: 'Permission check failed' 
            };
            
            if (isMounted) {
              setCheckResult(result);
              setIsChecking(false);
              options?.onDenied?.(result);
            }
          }
        }

        checkPermission();

        return () => {
          isMounted = false;
        };
      }, [permission, options?.teamId]);

      if (isChecking) {
        return React.createElement('div', { className: "flex items-center justify-center p-4" }, 'Checking permissions...');
      }

      if (!checkResult?.granted) {
        if (options?.fallback) {
          const FallbackComponent = options.fallback;
          return React.createElement(FallbackComponent);
        }
        
        return React.createElement('div', 
          { className: "flex items-center justify-center p-4 text-muted-foreground" },
          `Access denied: ${checkResult?.reason || 'Insufficient permissions'}`
        );
      }

      return React.createElement(WrappedComponent, props);
    };
  };
}

/**
 * Higher-order component for role-based access control
 */
export function requireRole(roleSlug: string, options?: {
  teamId?: string;
  fallback?: React.ComponentType;
  onDenied?: (result: PermissionCheckResult) => void;
}) {
  return function <P extends object>(WrappedComponent: React.ComponentType<P>): React.ComponentType<P> {
    return function RoleWrapper(props: P) {
      const [checkResult, setCheckResult] = React.useState<PermissionCheckResult | null>(null);
      const [isChecking, setIsChecking] = React.useState(true);

      React.useEffect(() => {
        let isMounted = true;

        async function checkRole() {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
              const result = { granted: false, reason: 'Not authenticated' };
              if (isMounted) {
                setCheckResult(result);
                setIsChecking(false);
                options?.onDenied?.(result);
              }
              return;
            }

            const hasRole = await roleService.checkUserRole(user.id, roleSlug, options?.teamId);

            const result = { 
              granted: hasRole, 
              userId: user.id,
              reason: hasRole ? undefined : `Missing required role: ${roleSlug}`
            };

            if (isMounted) {
              setCheckResult(result);
              setIsChecking(false);
              
              if (!hasRole) {
                options?.onDenied?.(result);
              }
            }

            // Log role check
            await AuditService.logPermissionCheck({
              user_id: user.id,
              permission_slug: `role:${roleSlug}`,
              granted: hasRole,
              resource_type: 'component',
              team_id: options?.teamId,
              metadata: { component: WrappedComponent.name, role_check: roleSlug }
            });

          } catch (error) {
            console.error('Role check error:', error);
            const result = { 
              granted: false, 
              reason: 'Role check failed' 
            };
            
            if (isMounted) {
              setCheckResult(result);
              setIsChecking(false);
              options?.onDenied?.(result);
            }
          }
        }

        checkRole();

        return () => {
          isMounted = false;
        };
      }, [roleSlug, options?.teamId]);

      if (isChecking) {
        return React.createElement('div', { className: "flex items-center justify-center p-4" }, 'Checking permissions...');
      }

      if (!checkResult?.granted) {
        if (options?.fallback) {
          const FallbackComponent = options.fallback;
          return React.createElement(FallbackComponent);
        }
        
        return React.createElement('div', 
          { className: "flex items-center justify-center p-4 text-muted-foreground" },
          `Access denied: ${checkResult?.reason || 'Insufficient role permissions'}`
        );
      }

      return React.createElement(WrappedComponent, props);
    };
  };
}

/**
 * Higher-order component for team membership validation
 */
export function requireTeamMembership(teamId: string, options?: {
  fallback?: React.ComponentType;
  onDenied?: (result: PermissionCheckResult) => void;
}) {
  return function <P extends object>(WrappedComponent: React.ComponentType<P>): React.ComponentType<P> {
    return function TeamMembershipWrapper(props: P) {
      const [checkResult, setCheckResult] = React.useState<PermissionCheckResult | null>(null);
      const [isChecking, setIsChecking] = React.useState(true);

      React.useEffect(() => {
        let isMounted = true;

        async function checkMembership() {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
              const result = { granted: false, reason: 'Not authenticated' };
              if (isMounted) {
                setCheckResult(result);
                setIsChecking(false);
                options?.onDenied?.(result);
              }
              return;
            }

            const isMember = await roleService.checkTeamMembership(user.id, teamId);

            const result = { 
              granted: isMember, 
              userId: user.id,
              reason: isMember ? undefined : 'Not a team member'
            };

            if (isMounted) {
              setCheckResult(result);
              setIsChecking(false);
              
              if (!isMember) {
                options?.onDenied?.(result);
              }
            }

            // Log membership check
            await AuditService.logPermissionCheck({
              user_id: user.id,
              permission_slug: 'team:membership',
              granted: isMember,
              resource_type: 'team',
              resource_id: teamId,
              team_id: teamId,
              metadata: { component: WrappedComponent.name }
            });

          } catch (error) {
            console.error('Team membership check error:', error);
            const result = { 
              granted: false, 
              reason: 'Membership check failed' 
            };
            
            if (isMounted) {
              setCheckResult(result);
              setIsChecking(false);
              options?.onDenied?.(result);
            }
          }
        }

        checkMembership();

        return () => {
          isMounted = false;
        };
      }, [teamId]);

      if (isChecking) {
        return React.createElement('div', { className: "flex items-center justify-center p-4" }, 'Checking team membership...');
      }

      if (!checkResult?.granted) {
        if (options?.fallback) {
          const FallbackComponent = options.fallback;
          return React.createElement(FallbackComponent);
        }
        
        return React.createElement('div', 
          { className: "flex items-center justify-center p-4 text-muted-foreground" },
          `Access denied: ${checkResult?.reason || 'Team membership required'}`
        );
      }

      return React.createElement(WrappedComponent, props);
    };
  };
}

/**
 * Hook for checking resource access permissions
 */
export function checkResourceAccess(
  resourceType: string, 
  resourceId: string,
  requiredAccess: 'read' | 'write' | 'delete' | 'manage' = 'read'
) {
  return async (userId: string): Promise<boolean> => {
    try {
      const access = await roleService.canAccessResource(userId, resourceType, resourceId);
      
      switch (requiredAccess) {
        case 'read':
          return access.canRead;
        case 'write':
          return access.canWrite;
        case 'delete':
          return access.canDelete;
        case 'manage':
          return access.canManage;
        default:
          return false;
      }
    } catch (error) {
      console.error('Resource access check error:', error);
      return false;
    }
  };
}

/**
 * Decorator for service methods that require permission checks
 */
export function withPermissionCheck(permission: string, options?: { teamId?: string }) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('Authentication required');
        }

        const granted = await roleService.checkUserPermission(
          user.id, 
          permission, 
          options?.teamId
        );

        if (!granted) {
          await AuditService.logPermissionCheck({
            user_id: user.id,
            permission_slug: permission,
            granted: false,
            resource_type: 'service_method',
            team_id: options?.teamId,
            metadata: { method: `${target.constructor.name}.${propertyName}` }
          });
          
          throw new Error(`Permission denied: ${permission}`);
        }

        // Log successful permission check
        await AuditService.logPermissionCheck({
          user_id: user.id,
          permission_slug: permission,
          granted: true,
          resource_type: 'service_method',
          team_id: options?.teamId,
          metadata: { method: `${target.constructor.name}.${propertyName}` }
        });

        return await method.apply(this, args);
      } catch (error) {
        console.error(`Permission check failed for ${propertyName}:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Server-side API validation helper
 */
export async function validateApiPermissions(
  userId: string,
  permission: string,
  options?: {
    teamId?: string;
    resourceType?: string;
    resourceId?: string;
  }
): Promise<{ granted: boolean; reason?: string }> {
  try {
    const granted = await roleService.checkUserPermission(
      userId, 
      permission, 
      options?.teamId
    );

    // Log API permission check
    await AuditService.logPermissionCheck({
      user_id: userId,
      permission_slug: permission,
      granted,
      resource_type: options?.resourceType || 'api',
      resource_id: options?.resourceId,
      team_id: options?.teamId,
      metadata: { context: 'api_validation' }
    });

    return {
      granted,
      reason: granted ? undefined : `Missing permission: ${permission}`
    };
  } catch (error) {
    console.error('API permission validation error:', error);
    return {
      granted: false,
      reason: 'Permission validation failed'
    };
  }
}