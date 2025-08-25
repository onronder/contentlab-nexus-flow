import React, { useEffect } from 'react';
import { useGlobalErrorHandler } from '@/hooks/useErrorBoundary';

export function GlobalErrorHandler({ children }: { children: React.ReactNode }) {
  const { handleGlobalError } = useGlobalErrorHandler();

  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[GlobalErrorHandler] Unhandled promise rejection:', event.reason);
      
      // Don't show errors for authentication issues to prevent cascade failures
      const isAuthError = event.reason?.message?.includes('JWT') || 
                         event.reason?.message?.includes('auth') ||
                         event.reason?.message?.includes('team_id');
      
      if (!isAuthError) {
        handleGlobalError(
          new Error(event.reason?.message || 'Unhandled promise rejection'),
          'Unhandled Promise Rejection'
        );
      }
      
      // Prevent the default browser error handling
      event.preventDefault();
    };

    // Handle uncaught JavaScript errors
    const handleError = (event: ErrorEvent) => {
      console.error('[GlobalErrorHandler] Uncaught error:', event.error);
      
      // Don't show errors for authentication issues
      const isAuthError = event.error?.message?.includes('JWT') || 
                         event.error?.message?.includes('auth') ||
                         event.error?.message?.includes('team_id');
      
      if (!isAuthError && event.error) {
        handleGlobalError(event.error, 'Uncaught JavaScript Error');
      }
    };

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [handleGlobalError]);

  return <>{children}</>;
}