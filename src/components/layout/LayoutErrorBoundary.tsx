import React from 'react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface LayoutErrorBoundaryProps {
  children: React.ReactNode;
}

const LayoutErrorFallback = () => (
  <div className="min-h-screen flex items-center justify-center p-6 bg-background">
    <div className="max-w-md w-full">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Layout Error</AlertTitle>
        <AlertDescription className="mt-2">
          There was an issue loading the page layout. This might be due to a navigation or authentication problem.
        </AlertDescription>
      </Alert>
      
      <div className="mt-6 space-y-3">
        <Button 
          onClick={() => window.location.href = '/dashboard'}
          className="w-full"
        >
          Go to Dashboard
        </Button>
        
        <Button 
          onClick={() => window.location.reload()}
          variant="outline"
          className="w-full"
        >
          Refresh Page
        </Button>
      </div>
    </div>
  </div>
);

export function LayoutErrorBoundary({ children }: LayoutErrorBoundaryProps) {
  return (
    <ErrorBoundary fallback={<LayoutErrorFallback />}>
      {children}
    </ErrorBoundary>
  );
}