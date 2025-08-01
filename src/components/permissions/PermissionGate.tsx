import React, { ReactNode } from 'react';
import { useHasPermission, usePermissionChecks } from '@/hooks/usePermissionQueries';
import { useAuth } from '@/hooks/useAuth';
import { AccessDenied } from '@/components/ui/access-denied';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

interface PermissionGateProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean; // If true, user must have ALL permissions; if false, user needs ANY permission
  teamId?: string;
  children: ReactNode;
  fallback?: ReactNode;
  showAccessDenied?: boolean;
  accessDeniedMessage?: string;
  loadingComponent?: ReactNode;
}

export function PermissionGate({
  permission,
  permissions = [],
  requireAll = true,
  teamId,
  children,
  fallback,
  showAccessDenied = true,
  accessDeniedMessage = 'You do not have permission to access this content.',
  loadingComponent
}: PermissionGateProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Handle single permission check
  const singlePermissionQuery = useHasPermission(
    permission || '',
    teamId
  );

  // Handle multiple permissions check
  const allPermissions = permission ? [permission, ...permissions] : permissions;
  const multiplePermissionQuery = usePermissionChecks(allPermissions, teamId);

  // Determine which query to use
  const usingMultiplePermissions = allPermissions.length > 1;
  const isLoading = authLoading || 
    (usingMultiplePermissions ? multiplePermissionQuery.isLoading : singlePermissionQuery.isLoading);
  const error = usingMultiplePermissions ? multiplePermissionQuery.error : singlePermissionQuery.error;

  // If not authenticated, don't show anything
  if (!isAuthenticated) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    
    return (
      <div className="flex items-center justify-center p-4">
        <LoadingSpinner size="sm" />
        <span className="ml-2 text-sm text-muted-foreground">Checking permissions...</span>
      </div>
    );
  }

  // Handle errors
  if (error) {
    return (
      <Alert variant="destructive">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Failed to verify permissions. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  // Check permissions
  let hasAccess = false;

  if (usingMultiplePermissions) {
    const permissionResults = multiplePermissionQuery.data || {};
    const grantedPermissions = Object.entries(permissionResults)
      .filter(([_, granted]) => granted)
      .map(([perm]) => perm);

    if (requireAll) {
      // User must have ALL specified permissions
      hasAccess = allPermissions.every(perm => permissionResults[perm] === true);
    } else {
      // User needs ANY of the specified permissions
      hasAccess = allPermissions.some(perm => permissionResults[perm] === true);
    }
  } else {
    // Single permission check
    hasAccess = singlePermissionQuery.data === true;
  }

  // If user has access, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // If fallback is provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show access denied message if enabled
  if (showAccessDenied) {
    return (
      <AccessDenied 
        message={accessDeniedMessage}
        title="Access Restricted"
      />
    );
  }

  // Don't render anything if no access and no fallback
  return null;
}

// Convenience components for common permission patterns
export function RequirePermission({ 
  permission, 
  children, 
  ...props 
}: Omit<PermissionGateProps, 'permissions'> & { permission: string }) {
  return (
    <PermissionGate permission={permission} {...props}>
      {children}
    </PermissionGate>
  );
}

export function RequireAnyPermission({ 
  permissions, 
  children, 
  ...props 
}: Omit<PermissionGateProps, 'permission' | 'requireAll'> & { permissions: string[] }) {
  return (
    <PermissionGate permissions={permissions} requireAll={false} {...props}>
      {children}
    </PermissionGate>
  );
}

export function RequireAllPermissions({ 
  permissions, 
  children, 
  ...props 
}: Omit<PermissionGateProps, 'permission' | 'requireAll'> & { permissions: string[] }) {
  return (
    <PermissionGate permissions={permissions} requireAll={true} {...props}>
      {children}
    </PermissionGate>
  );
}