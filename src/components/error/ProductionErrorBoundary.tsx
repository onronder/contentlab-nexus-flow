import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { getExtensionCompatibilityReport } from '@/utils/extensionDetection';
import { productionMonitor } from '@/utils/productionMonitoring';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  extensionReport: any;
}

export class ProductionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: '',
      errorInfo: null,
      showDetails: false,
      extensionReport: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Production Error Boundary caught an error:', error, errorInfo);
    
    // Check for extension interference
    const extensionReport = getExtensionCompatibilityReport();
    
    // Log to monitoring system
    productionMonitor.generateHealthReport().then(report => {
      console.log('System health at time of error:', report);
    });

    this.setState({
      errorInfo,
      extensionReport,
      showDetails: false
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Track error for analytics
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        errorId: this.state.errorId,
        extensionIssues: extensionReport.issues.length,
        timestamp: new Date().toISOString()
      };
      
      // Store error for debugging
      sessionStorage.setItem('last_error', JSON.stringify(errorData));
    } catch {
      // Storage might be full, ignore
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorId, extensionReport, showDetails } = this.state;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Something went wrong</CardTitle>
              <p className="text-muted-foreground mt-2">
                We encountered an unexpected error. Don't worry, we're here to help you get back on track.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Error ID for support */}
              <div className="bg-muted p-3 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Error ID for support:</p>
                <code className="text-sm font-mono">{errorId}</code>
              </div>

              {/* Extension Issues Warning */}
              {extensionReport?.issues?.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                    Browser Extension Issues Detected
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                    Some browser extensions may be interfering with the application.
                  </p>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    {extensionReport.recommendations.slice(0, 3).map((rec: string, idx: number) => (
                      <li key={idx}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={this.handleRetry} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="outline" className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
                <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {/* Technical Details Toggle */}
              <div className="border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={this.toggleDetails}
                  className="w-full"
                >
                  {showDetails ? 'Hide' : 'Show'} Technical Details
                </Button>
                
                {showDetails && (
                  <div className="mt-4 space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Error Message:</h4>
                      <p className="text-sm font-mono text-destructive">
                        {error?.message || 'Unknown error'}
                      </p>
                    </div>
                    
                    {error?.stack && (
                      <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Stack Trace:</h4>
                        <pre className="text-xs overflow-auto whitespace-pre-wrap max-h-40">
                          {error.stack}
                        </pre>
                      </div>
                    )}

                    {extensionReport?.issues?.length > 0 && (
                      <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Extension Issues:</h4>
                        <ul className="text-sm space-y-1">
                          {extensionReport.issues.map((issue: any, idx: number) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                issue.severity === 'high' ? 'bg-red-500' :
                                issue.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                              }`} />
                              {issue.name}: {issue.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Support Info */}
              <div className="text-center text-sm text-muted-foreground">
                <p>If this problem persists, please contact support with the error ID above.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}