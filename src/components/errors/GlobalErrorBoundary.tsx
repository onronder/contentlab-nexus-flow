import React from 'react';
import { ErrorAlert } from '@/components/ui/error-alert';
import { logError, isDevelopment } from '@/utils/productionUtils';

interface GlobalErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface GlobalErrorBoundaryProps {
  children: React.ReactNode;
}

class GlobalErrorBoundary extends React.Component<GlobalErrorBoundaryProps, GlobalErrorBoundaryState> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): GlobalErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for monitoring
    logError(error, 'GlobalErrorBoundary');
    
    // Store error info for debugging
    this.setState({ errorInfo });
    
    // In development, log full error details
    if (isDevelopment()) {
      console.group('🚨 Global Error Boundary');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full space-y-4">
            <ErrorAlert
              title="Application Error"
              message={
                this.state.error?.message || 
                "Something went wrong. The application encountered an unexpected error."
              }
              onRetry={this.handleRetry}
              retryLabel="Try Again"
            />
            
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReload}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Reload Page
              </button>
              
              {isDevelopment() && this.state.errorInfo && (
                <details className="mt-4 p-4 bg-muted rounded-md text-xs">
                  <summary className="cursor-pointer font-medium mb-2">
                    Debug Information
                  </summary>
                  <pre className="whitespace-pre-wrap text-muted-foreground">
                    {this.state.error?.stack}
                  </pre>
                  <pre className="whitespace-pre-wrap text-muted-foreground mt-2">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { GlobalErrorBoundary };