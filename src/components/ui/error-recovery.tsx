import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Wifi } from 'lucide-react';

interface ErrorRecoveryProps {
  error: Error | null;
  onRetry?: () => void;
  onReset?: () => void;
  showConnectionHelp?: boolean;
}

export function ErrorRecovery({ 
  error, 
  onRetry, 
  onReset, 
  showConnectionHelp = false 
}: ErrorRecoveryProps) {
  if (!error) return null;

  const isRateLimitError = error.message.includes('429') || 
                          error.message.includes('rate limit') ||
                          error.message.includes('Too Many Requests');
  
  const isConnectionError = error.message.includes('ERR_CONNECTION') ||
                           error.message.includes('network') ||
                           error.message.includes('offline');

  const getErrorConfig = () => {
    if (isRateLimitError) {
      return {
        title: 'Service Temporarily Unavailable',
        description: 'AI analysis service is rate limited. This is normal and service will resume automatically. Please wait 10 minutes or check your OpenAI API quota.',
        showRetry: false,
        showReset: true,
        variant: 'destructive' as const
      };
    }

    if (isConnectionError) {
      return {
        title: 'Connection Issue',
        description: 'Unable to connect to services. Please check your internet connection.',
        showRetry: true,
        showReset: false,
        variant: 'destructive' as const
      };
    }

    return {
      title: 'Something went wrong',
      description: error.message || 'An unexpected error occurred.',
      showRetry: true,
      showReset: true,
      variant: 'destructive' as const
    };
  };

  const { title, description, showRetry, showReset, variant } = getErrorConfig();

  return (
    <Alert variant={variant} className="my-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">{description}</p>
        
        <div className="flex gap-2 flex-wrap">
          {showRetry && onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
          
          {showReset && onReset && (
            <Button variant="outline" size="sm" onClick={onReset}>
              Reset Service
            </Button>
          )}
          
          {showConnectionHelp && (
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
              <Wifi className="w-4 h-4 mr-2" />
              Reload Page
            </Button>
          )}
        </div>

        {isRateLimitError && (
          <p className="text-sm mt-3 opacity-75">
            💡 Tip: Rate limiting protects against excessive API usage. The service will automatically resume.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}