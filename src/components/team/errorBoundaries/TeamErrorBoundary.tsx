import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

export class TeamErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId()
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(36)
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error for monitoring
    this.logError(error, errorInfo);
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  private generateErrorId(): string {
    return `team-error-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private logError(error: Error, errorInfo: React.ErrorInfo): void {
    const errorData = {
      id: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context || 'team-management',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Team Error Boundary - ${this.state.errorId}`);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Context:', this.props.context);
      console.groupEnd();
    }

    // Send to error monitoring service in production
    try {
      // This would typically send to Sentry, LogRocket, etc.
      window.dispatchEvent(new CustomEvent('team-error', {
        detail: errorData
      }));
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId()
    });
  };

  private handleReportBug = (): void => {
    const subject = encodeURIComponent(`Team Management Error - ${this.state.errorId}`);
    const body = encodeURIComponent(`
Error ID: ${this.state.errorId}
Context: ${this.props.context || 'Unknown'}
Error: ${this.state.error?.message}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}

Additional details:
${this.state.error?.stack || 'No stack trace available'}
    `.trim());
    
    window.open(`mailto:support@contentlab.com?subject=${subject}&body=${body}`);
  };

  private getErrorCategory(): 'network' | 'permission' | 'validation' | 'system' | 'unknown' {
    const message = this.state.error?.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'permission';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('chunk') || message.includes('module')) {
      return 'system';
    }
    return 'unknown';
  }

  private getErrorSeverity(): 'low' | 'medium' | 'high' | 'critical' {
    const category = this.getErrorCategory();
    const context = this.props.context || '';
    
    // Critical errors that break core functionality
    if (context.includes('auth') || context.includes('security')) {
      return 'critical';
    }
    
    // High severity for core team operations
    if (category === 'permission' || context.includes('member-management')) {
      return 'high';
    }
    
    // Medium severity for UI/display issues
    if (category === 'network' || category === 'validation') {
      return 'medium';
    }
    
    return 'low';
  }

  private getRecoveryActions(): Array<{ label: string; action: () => void; variant?: any }> {
    const category = this.getErrorCategory();
    const actions = [
      {
        label: 'Try Again',
        action: this.handleRetry,
        variant: 'default'
      }
    ];

    if (category === 'network') {
      actions.push({
        label: 'Check Connection',
        action: () => window.location.reload(),
        variant: 'outline'
      });
    }

    actions.push(
      {
        label: 'Go to Dashboard',
        action: () => window.location.href = '/dashboard',
        variant: 'outline'
      },
      {
        label: 'Report Bug',
        action: this.handleReportBug,
        variant: 'outline'
      }
    );

    return actions;
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const category = this.getErrorCategory();
      const severity = this.getErrorSeverity();
      const actions = this.getRecoveryActions();

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <CardDescription>
                {category === 'network' && 'A network error occurred while loading team data.'}
                {category === 'permission' && 'You may not have permission to access this team feature.'}
                {category === 'validation' && 'Invalid data was encountered in the team management system.'}
                {category === 'system' && 'A system error occurred. Please try refreshing the page.'}
                {category === 'unknown' && 'An unexpected error occurred in the team management system.'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <Alert>
                <Bug className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error ID:</strong> {this.state.errorId}
                  <br />
                  <strong>Context:</strong> {this.props.context || 'Team Management'}
                  <br />
                  <strong>Severity:</strong> {severity.toUpperCase()}
                </AlertDescription>
              </Alert>

              {process.env.NODE_ENV === 'development' && (
                <Alert>
                  <AlertDescription className="font-mono text-xs">
                    {this.state.error?.message}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-2">
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant}
                    onClick={action.action}
                    className="w-full"
                  >
                    {action.label === 'Try Again' && <RefreshCw className="w-4 h-4 mr-2" />}
                    {action.label === 'Go to Dashboard' && <Home className="w-4 h-4 mr-2" />}
                    {action.label === 'Report Bug' && <Bug className="w-4 h-4 mr-2" />}
                    {action.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for easy wrapping of team components
export function withTeamErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  context?: string
) {
  return function WrappedComponent(props: P) {
    return (
      <TeamErrorBoundary context={context}>
        <Component {...props} />
      </TeamErrorBoundary>
    );
  };
}

// Hook for manual error reporting
export function useTeamErrorReporting() {
  const reportError = (error: Error, context?: string) => {
    const errorData = {
      id: `manual-${Date.now().toString(36)}`,
      message: error.message,
      stack: error.stack,
      context: context || 'manual-report',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    window.dispatchEvent(new CustomEvent('team-error', {
      detail: errorData
    }));
  };

  return { reportError };
}