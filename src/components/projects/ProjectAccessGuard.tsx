import React from 'react';
import { useProjectPermissions, ProjectPermissions } from '@/hooks/useProjectPermissions';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorAlert } from '@/components/ui/error-alert';
import { AccessDenied } from '@/components/ui/access-denied';

interface ProjectAccessGuardProps {
  projectId: string;
  children: React.ReactNode;
  requiredPermission?: keyof ProjectPermissions;
  fallback?: React.ReactNode;
}

export function ProjectAccessGuard({ 
  projectId, 
  children, 
  requiredPermission = 'canView',
  fallback 
}: ProjectAccessGuardProps) {
  const { permissions, loading, error } = useProjectPermissions(projectId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="md" />
        <span className="ml-3">Checking access permissions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorAlert 
        message={`Failed to verify project access: ${error}`}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!permissions[requiredPermission]) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <AccessDenied 
        message="You don't have permission to access this project."
        action={{
          label: "Request Access",
          onClick: () => {
            // Navigate back to projects list
            window.location.href = '/projects';
          }
        }}
      />
    );
  }

  return <>{children}</>;
}