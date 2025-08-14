import React from 'react';
import { ErrorAlert } from '@/components/ui/error-alert';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface SettingsErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface SettingsErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onRetry?: () => void;
}

class SettingsErrorBoundary extends React.Component<SettingsErrorBoundaryProps, SettingsErrorBoundaryState> {
  constructor(props: SettingsErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SettingsErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Settings Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 space-y-4">
          <ErrorAlert
            title="Settings Error"
            message={this.state.error?.message || "Unable to load settings. Please try again."}
            onRetry={this.handleRetry}
            retryLabel="Retry Loading"
          />
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="ml-2"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { SettingsErrorBoundary };