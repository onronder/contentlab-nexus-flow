import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts';

interface UseAuthGuardOptions {
  redirectTo?: string;
  requireAuth?: boolean;
  redirectIfAuthenticated?: boolean;
}

/**
 * Custom hook for route protection and authentication-based redirects
 * 
 * @param options - Configuration options for the auth guard
 * @param options.redirectTo - Where to redirect (default: '/auth' for protected routes, '/' for public routes)
 * @param options.requireAuth - Whether authentication is required (default: true)
 * @param options.redirectIfAuthenticated - Whether to redirect if user is already authenticated (default: false)
 */
export const useAuthGuard = (options: UseAuthGuardOptions = {}) => {
  const {
    redirectTo,
    requireAuth = true,
    redirectIfAuthenticated = false,
  } = options;

  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return;

    if (requireAuth && !isAuthenticated) {
      // User needs to be authenticated but isn't
      navigate(redirectTo || '/auth', { replace: true });
    } else if (redirectIfAuthenticated && isAuthenticated) {
      // User shouldn't be authenticated but is
      navigate(redirectTo || '/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo, requireAuth, redirectIfAuthenticated]);

  return {
    isAuthenticated,
    isLoading,
    shouldRender: isLoading || (requireAuth ? isAuthenticated : !redirectIfAuthenticated || !isAuthenticated),
  };
};