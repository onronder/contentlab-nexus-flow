/**
 * Lazy-loaded components for performance optimization
 * These components are loaded only when needed
 */
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Lazy load heavy dashboard components
export const LazyAdvancedAnalyticsDashboard = lazy(() => 
  import('@/components/analytics/AdvancedAnalyticsDashboard').then(module => ({
    default: module.AdvancedAnalyticsDashboard
  }))
);

export const LazyPredictiveAnalyticsDashboard = lazy(() => 
  import('@/components/analytics/PredictiveAnalyticsDashboard').then(module => ({
    default: module.PredictiveAnalyticsDashboard
  }))
);

export const LazyCollaborationDashboard = lazy(() => 
  import('@/components/collaboration/CollaborationDashboard').then(module => ({
    default: module.CollaborationDashboard
  }))
);

export const LazyTeamPerformanceDashboard = lazy(() => 
  import('@/components/team/TeamPerformanceDashboard').then(module => ({
    default: module.TeamPerformanceDashboard
  }))
);

export const LazySecurityDashboard = lazy(() => 
  import('@/components/security/SecurityDashboard').then(module => ({
    default: module.SecurityDashboard
  }))
);

export const LazyPerformanceDashboard = lazy(() => 
  import('@/components/monitoring/PerformanceDashboard').then(module => ({
    default: module.PerformanceDashboard
  }))
);

export const LazyAICollaborationPanel = lazy(() => 
  import('@/components/ai/AICollaborationPanel').then(module => ({
    default: module.AICollaborationPanel
  }))
);

// Lazy wrapper component with loading fallback
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const LazyWrapper = ({ children, fallback }: LazyWrapperProps) => (
  <Suspense 
    fallback={
      fallback || (
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      )
    }
  >
    {children}
  </Suspense>
);

// Higher-order component for lazy loading
export function withLazyLoading<T extends object>(
  Component: React.ComponentType<T>,
  fallback?: React.ReactNode
) {
  return function LazyComponent(props: T) {
    return (
      <LazyWrapper fallback={fallback}>
        <Component {...props} />
      </LazyWrapper>
    );
  };
}