import React from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorAlert } from '@/components/ui/error-alert';
import { productionLogger } from '@/utils/logger';
import { errorMonitoring } from '@/utils/errorMonitoring';

interface QueryErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface QueryErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

class QueryErrorBoundaryInner extends React.Component<
  QueryErrorBoundaryProps & { reset: () => void },
  QueryErrorBoundaryState
> {
  constructor(props: QueryErrorBoundaryProps & { reset: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): QueryErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error with centralized monitoring
    errorMonitoring.logError(error, {
      component: 'QueryErrorBoundary',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: 'query'
      }
    });

    // Call custom error handler if provided
    this.props.onError?.(error);

    // Ignore browser extension related errors
    if (error.message?.includes('deref') || 
        error.message?.includes('content_script') ||
        error.message?.includes('extension://') ||
        error.stack?.includes('extension://')) {
      productionLogger.warn('Ignoring browser extension error in QueryErrorBoundary:', error.message);
      this.setState({ hasError: false });
      return;
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.reset();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Don't show error UI for extension-related errors
      if (this.state.error.message?.includes('deref') || 
          this.state.error.message?.includes('content_script') ||
          this.state.error.message?.includes('extension://') ||
          this.state.error.stack?.includes('extension://')) {
        return this.props.children;
      }

      return this.props.fallback || (
        <ErrorAlert
          title="Query Error"
          message={
            this.state.error.message?.includes('permission denied') ||
            this.state.error.message?.includes('policy')
              ? "You don't have permission to access this data."
              : "Failed to load data. Please try again."
          }
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

export function QueryErrorBoundary({ children, fallback, onError }: QueryErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <QueryErrorBoundaryInner reset={reset} fallback={fallback} onError={onError}>
          {children}
        </QueryErrorBoundaryInner>
      )}
    </QueryErrorResetBoundary>
  );
}