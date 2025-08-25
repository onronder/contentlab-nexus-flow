import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError } = this.props;
    
    // Log error details
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    
    // Don't show toast for authentication or team switching errors to prevent cascade
    const isAuthError = error.message.includes('JWT') || 
                       error.message.includes('auth') ||
                       error.message.includes('team_id') ||
                       error.stack?.includes('TeamContext');

    if (!isAuthError) {
      // Call the onError callback if provided
      onError?.(error, errorInfo);
    }

    // Auto-retry for certain types of errors
    if (this.shouldAutoRetry(error) && this.state.retryCount < this.maxRetries) {
      this.scheduleRetry();
    }
  }

  shouldAutoRetry = (error: Error): boolean => {
    // Auto-retry for network errors, temporary failures, but not auth errors
    const retryableErrors = [
      'Network Error',
      'Failed to fetch',
      'timeout',
      'ECONNRESET',
      'ENOTFOUND'
    ];
    
    const nonRetryableErrors = [
      'JWT',
      'auth',
      'permission',
      'Unauthorized',
      'team_id'
    ];

    const errorMessage = error.message.toLowerCase();
    const errorStack = error.stack?.toLowerCase() || '';
    
    // Don't retry auth-related errors
    if (nonRetryableErrors.some(term => 
      errorMessage.includes(term.toLowerCase()) || errorStack.includes(term.toLowerCase())
    )) {
      return false;
    }
    
    // Retry network and temporary errors
    return retryableErrors.some(term => 
      errorMessage.includes(term.toLowerCase()) || errorStack.includes(term.toLowerCase())
    );
  };

  scheduleRetry = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 30000); // Max 30 second delay
    
    this.retryTimeoutId = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorId: null,
        retryCount: prevState.retryCount + 1
      }));
    }, delay);
  };

  handleRetry = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
    
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0
    });
  };

  handleGoHome = () => {
    // Clear error state and navigate to home
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0
    });
    
    // Use window.location to ensure complete page refresh
    window.location.href = '/dashboard';
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, retryCount } = this.state;
      const canRetry = retryCount < this.maxRetries;
      const isAuthError = error?.message.includes('JWT') || 
                         error?.message.includes('auth') ||
                         error?.message.includes('team_id');

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full space-y-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription className="mt-2">
                {isAuthError ? (
                  "There was an authentication issue. Please try refreshing the page or logging in again."
                ) : (
                  error?.message || "An unexpected error occurred. Please try again."
                )}
                
                {error && process.env.NODE_ENV === 'development' && (
                  <details className="mt-4 text-xs">
                    <summary className="cursor-pointer">Error Details (Development)</summary>
                    <pre className="mt-2 overflow-auto text-xs bg-muted p-2 rounded">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-3">
              {canRetry && !isAuthError && (
                <Button 
                  onClick={this.handleRetry}
                  variant="default"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                  {retryCount > 0 && ` (${retryCount}/${this.maxRetries})`}
                </Button>
              )}
              
              <Button 
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
              
              {isAuthError && (
                <Button 
                  onClick={() => window.location.reload()}
                  variant="secondary"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
              )}
            </div>

            {retryCount >= this.maxRetries && (
              <Alert>
                <AlertDescription>
                  If the problem persists, please contact support or try refreshing the page.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}