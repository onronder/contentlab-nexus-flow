import React from 'react';
import { ErrorAlert } from '@/components/ui/error-alert';

interface ContentErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ContentErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

class ContentErrorBoundary extends React.Component<ContentErrorBoundaryProps, ContentErrorBoundaryState> {
  constructor(props: ContentErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ContentErrorBoundaryState {
    console.warn('Content error boundary caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Ignore browser extension related errors
    if (error.message?.includes('deref') || 
        error.message?.includes('content_script') ||
        error.stack?.includes('extension://')) {
      console.warn('Ignoring browser extension error:', error);
      this.setState({ hasError: false });
      return;
    }
    
    console.error('Content error boundary error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Don't show error UI for extension-related errors
      if (this.state.error.message?.includes('deref') || 
          this.state.error.message?.includes('content_script') ||
          this.state.error.stack?.includes('extension://')) {
        return this.props.children;
      }

      return this.props.fallback || (
        <ErrorAlert
          title="Content Error"
          message="Something went wrong loading this content section."
          onRetry={() => this.setState({ hasError: false })}
        />
      );
    }

    return this.props.children;
  }
}

export { ContentErrorBoundary };