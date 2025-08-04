import React, { ReactNode } from 'react';
import { useTeamContext } from '@/contexts/TeamContext';
import { AccessDenied } from '@/components/ui/access-denied';

interface TeamPermissionGateProps {
  children: ReactNode;
  permission: string;
  fallback?: ReactNode;
  showError?: boolean;
}

/**
 * Component to control access based on team permissions
 * Wraps children with team-based permission checking
 */
export function TeamPermissionGate({ 
  children, 
  permission, 
  fallback, 
  showError = false 
}: TeamPermissionGateProps) {
  const { hasTeamAccess, currentTeam } = useTeamContext();

  // If no team selected, show appropriate message
  if (!currentTeam) {
    if (showError) {
      return <AccessDenied message="Please select a team to access this feature" />;
    }
    return fallback ? <>{fallback}</> : null;
  }

  // Check if user has required permission
  if (!hasTeamAccess(permission)) {
    if (showError) {
      return (
        <AccessDenied 
          message={`You don't have permission to ${permission} in this team`}
          action={{
            label: "Contact team administrator",
            onClick: () => {
              // Could integrate with contact system in future
              console.log("Contact team administrator requested");
            }
          }}
        />
      );
    }
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

// Convenience components for common permissions
export function CanViewTeamData({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <TeamPermissionGate permission="view" fallback={fallback}>
      {children}
    </TeamPermissionGate>
  );
}

export function CanEditTeamData({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <TeamPermissionGate permission="edit" fallback={fallback}>
      {children}
    </TeamPermissionGate>
  );
}

export function CanManageTeamMembers({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <TeamPermissionGate permission="manage_members" fallback={fallback}>
      {children}
    </TeamPermissionGate>
  );
}

export function CanManageTeamProjects({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <TeamPermissionGate permission="manage_projects" fallback={fallback}>
      {children}
    </TeamPermissionGate>
  );
}

export function CanManageTeamSettings({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <TeamPermissionGate permission="manage_settings" fallback={fallback}>
      {children}
    </TeamPermissionGate>
  );
}