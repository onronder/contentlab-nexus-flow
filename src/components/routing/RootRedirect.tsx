import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * Root redirect component that sends users to the appropriate page
 * - Unauthenticated users → /login
 * - Authenticated users → /dashboard
 */
export const RootRedirect: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
};