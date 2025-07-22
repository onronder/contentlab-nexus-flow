import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthGuard } from '@/hooks';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

/**
 * ProtectedRoute component for authentication-required pages
 * Redirects unauthenticated users to login with return URL preservation
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  redirectTo,
  fallback
}) => {
  const location = useLocation();
  const { isAuthenticated, isLoading, shouldRender } = useAuthGuard({
    requireAuth,
    redirectTo: redirectTo || `/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`
  });

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {fallback || (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Checking authentication...</p>
          </div>
        )}
      </div>
    );
  }

  // Redirect if authentication requirements aren't met
  if (!shouldRender) {
    return (
      <Navigate 
        to={redirectTo || `/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`}
        replace 
      />
    );
  }

  return <>{children}</>;
};

/**
 * PublicRoute component for authentication pages (login, signup, etc.)
 * Redirects authenticated users away from auth pages
 */
export const PublicRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/',
  fallback
}) => {
  const location = useLocation();
  const { isAuthenticated, isLoading, shouldRender } = useAuthGuard({
    requireAuth: false,
    redirectIfAuthenticated: true,
    redirectTo: getRedirectUrl(location, redirectTo)
  });

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {fallback || (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        )}
      </div>
    );
  }

  // Redirect authenticated users away from auth pages
  if (!shouldRender) {
    return <Navigate to={getRedirectUrl(location, redirectTo)} replace />;
  }

  return <>{children}</>;
};

/**
 * LoadingRoute component for handling authentication state loading
 */
export const LoadingRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading application...</p>
        {children}
      </div>
    </div>
  );
};

/**
 * RedirectRoute component for handling various redirect scenarios
 */
interface RedirectRouteProps {
  to: string;
  replace?: boolean;
  condition?: boolean;
  fallback?: React.ReactNode;
  children?: React.ReactNode;
}

export const RedirectRoute: React.FC<RedirectRouteProps> = ({
  to,
  replace = true,
  condition = true,
  fallback,
  children
}) => {
  if (condition) {
    return <Navigate to={to} replace={replace} />;
  }

  return <>{children || fallback}</>;
};

/**
 * Helper function to get redirect URL with return URL handling
 */
function getRedirectUrl(location: any, defaultRedirect: string): string {
  const searchParams = new URLSearchParams(location.search);
  const returnUrl = searchParams.get('returnUrl');
  
  // If there's a return URL, use it; otherwise use default
  if (returnUrl) {
    try {
      // Validate the return URL to prevent open redirects
      const url = new URL(returnUrl, window.location.origin);
      if (url.origin === window.location.origin) {
        return returnUrl;
      }
    } catch {
      // Invalid URL, use default
    }
  }
  
  return defaultRedirect;
}