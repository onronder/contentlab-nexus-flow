import { useAuth } from '@/contexts/AuthContext';

// Helper hook for getting current user ID
export function useCurrentUserId(): string | null {
  const { user } = useAuth();
  return user?.id || null;
}

// Helper hook for checking if user is authenticated
export function useIsAuthenticated(): boolean {
  const { isAuthenticated, isLoading } = useAuth();
  return isAuthenticated && !isLoading;
}

// Re-export useAuth for convenience
export { useAuth };

// Re-export project permissions hook
export { useProjectPermissions } from './useProjectPermissions';
export type { ProjectPermissions } from './useProjectPermissions';