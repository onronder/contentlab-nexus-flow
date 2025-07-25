import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/contexts';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  fallback?: React.ReactNode;
  timeout?: number; // Authentication timeout in milliseconds
}

/**
 * ProtectedRoute component for authentication-required pages
 * Redirects unauthenticated users to login with return URL preservation
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  redirectTo,
  fallback,
  timeout = 15000 // 15 second timeout for slower connections
}) => {
  const location = useLocation();
  const user = useUser();
  const loading = user === undefined;
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  const isAuthenticated = !!user;
  const isLoading = loading;

  // Add debug logging
  useEffect(() => {
    const log = `[${new Date().toLocaleTimeString()}] Auth state - Loading: ${isLoading}, Authenticated: ${isAuthenticated}`;
    console.log('ProtectedRoute:', log);
    setDebugInfo(prev => [...prev.slice(-4), log]); // Keep last 5 logs
  }, [isLoading, isAuthenticated]);

  // Handle authentication timeout
  useEffect(() => {
    if (!isLoading) {
      setHasTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      console.warn('ProtectedRoute: Authentication check timed out');
      setHasTimedOut(true);
    }, timeout);

    return () => clearTimeout(timer);
  }, [isLoading, timeout]);

  // Generate redirect URL with return path
  const getRedirectUrl = () => {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return redirectTo || `/login?returnUrl=${returnUrl}`;
  };

  // Handle timeout state
  if (hasTimedOut && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md mx-auto text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Authentication Timeout</h2>
            <p className="text-sm text-muted-foreground">
              Authentication check is taking longer than expected.
            </p>
          </div>
          <div className="space-y-2">
            <Button 
              onClick={() => {
                setHasTimedOut(false);
                window.location.reload();
              }}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = getRedirectUrl()}
              className="w-full"
            >
              Go to Login
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details className="text-left">
              <summary className="text-xs text-muted-foreground cursor-pointer">
                Debug Information
              </summary>
              <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                {debugInfo.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }

  // Show loading state while checking authentication
  if (isLoading && !hasTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {fallback || (
          <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Verifying Authentication</p>
              <p className="text-xs text-muted-foreground">
                This should only take a moment...
              </p>
            </div>
            <div className="w-full max-w-xs bg-muted rounded-full h-1">
              <div className="bg-primary h-1 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="text-left w-full">
                <summary className="text-xs text-muted-foreground cursor-pointer">
                  Debug Information
                </summary>
                <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                  {debugInfo.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    );
  }


  // Redirect if authentication requirements aren't met
  if (requireAuth && !isAuthenticated) {
    console.log('ProtectedRoute: Redirecting unauthenticated user to:', getRedirectUrl());
    return <Navigate to={getRedirectUrl()} replace />;
  }

  // Render protected content
  console.log('ProtectedRoute: Rendering protected content');
  return <>{children}</>;
};

/**
 * PublicRoute component for authentication pages (login, signup, etc.)
 * Redirects authenticated users away from auth pages
 */
export const PublicRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/',
  fallback,
  timeout = 10000
}) => {
  const location = useLocation();
  const user = useUser();
  const loading = user === undefined;
  const [hasTimedOut, setHasTimedOut] = useState(false);
  
  const isAuthenticated = !!user;
  const isLoading = loading;

  // Handle authentication timeout
  useEffect(() => {
    if (!isLoading) {
      setHasTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      console.warn('PublicRoute: Authentication check timed out');
      setHasTimedOut(true);
    }, timeout);

    return () => clearTimeout(timer);
  }, [isLoading, timeout]);

  // Handle timeout state
  if (hasTimedOut && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md mx-auto text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Loading Timeout</h2>
            <p className="text-sm text-muted-foreground">
              Authentication check is taking longer than expected.
            </p>
          </div>
          <Button 
            onClick={() => {
              setHasTimedOut(false);
              window.location.reload();
            }}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Show loading state while checking authentication
  if (isLoading && !hasTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {fallback || (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        )}
      </div>
    );
  }


  // Redirect authenticated users away from auth pages
  if (isAuthenticated && !isLoading) {
    const redirectUrl = getRedirectUrl(location, redirectTo);
    console.log('PublicRoute: Redirecting authenticated user to:', redirectUrl);
    return <Navigate to={redirectUrl} replace />;
  }

  // Render public content
  console.log('PublicRoute: Rendering public content');
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