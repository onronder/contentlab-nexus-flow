import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface ErrorInfo {
  id: string;
  error: Error;
  context?: string;
  timestamp: number;
  recovered: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  errorHistory: ErrorInfo[];
}

export function useErrorBoundary() {
  const [errorState, setErrorState] = useState<ErrorBoundaryState>({
    hasError: false,
    error: null,
    errorId: null,
    errorHistory: []
  });

  const captureError = useCallback((error: Error, context?: string) => {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const errorInfo: ErrorInfo = {
      id: errorId,
      error,
      context: context || 'Unknown context',
      timestamp: Date.now(),
      recovered: false
    };

    // Log error for debugging
    console.error(`[ErrorBoundary] ${context || 'Error'}:`, error);

    // Don't show toast for authentication or server sync errors to prevent cascade failures
    const isAuthError = error.message.includes('JWT') || 
                       error.message.includes('auth') ||
                       error.message.includes('team_id') ||
                       error.message.includes('Server sync');

    if (!isAuthError) {
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: context ? `Error in ${context}` : "An unexpected error occurred"
      });
    }

    setErrorState(prev => ({
      hasError: true,
      error,
      errorId,
      errorHistory: [...prev.errorHistory.slice(-9), errorInfo] // Keep last 10 errors
    }));

    return errorId;
  }, []);

  const recoverFromError = useCallback((errorId?: string) => {
    setErrorState(prev => {
      const updatedHistory = prev.errorHistory.map(err => 
        (!errorId || err.id === errorId) ? { ...err, recovered: true } : err
      );

      return {
        hasError: false,
        error: null,
        errorId: null,
        errorHistory: updatedHistory
      };
    });
  }, []);

  const clearErrorHistory = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      errorHistory: []
    }));
  }, []);

  const getRecentErrors = useCallback((minutes: number = 5) => {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return errorState.errorHistory.filter(err => err.timestamp > cutoff);
  }, [errorState.errorHistory]);

  return {
    errorState,
    captureError,
    recoverFromError,
    clearErrorHistory,
    getRecentErrors,
    hasError: errorState.hasError,
    error: errorState.error
  };
}

// Global error boundary hook for critical errors
export function useGlobalErrorHandler() {
  const { captureError } = useErrorBoundary();

  const handleGlobalError = useCallback((error: Error, context: string) => {
    // For critical errors that should not cause UI failures
    try {
      captureError(error, context);
    } catch (handlerError) {
      // Last resort - log to console if error handling itself fails
      console.error('[GlobalErrorHandler] Failed to handle error:', handlerError);
      console.error('[GlobalErrorHandler] Original error:', error);
    }
  }, [captureError]);

  return { handleGlobalError };
}