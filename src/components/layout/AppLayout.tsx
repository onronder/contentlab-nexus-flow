import React from 'react';
import { AppNavigation } from '@/components/navigation';
import { Breadcrumbs } from '@/components/navigation';
import { useAuth } from '@/hooks';

interface AppLayoutProps {
  children: React.ReactNode;
  showBreadcrumbs?: boolean;
  className?: string;
}

/**
 * Main application layout with navigation and breadcrumbs
 * Provides consistent layout structure for all pages
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  showBreadcrumbs = true, 
  className 
}) => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <AppNavigation />
      
      <main className="flex-1">
        {showBreadcrumbs && isAuthenticated && (
          <div className="border-b bg-muted/30">
            <div className="container py-3">
              <Breadcrumbs />
            </div>
          </div>
        )}
        
        <div className={className}>
          {children}
        </div>
      </main>
    </div>
  );
};