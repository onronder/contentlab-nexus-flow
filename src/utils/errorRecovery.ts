// Utility functions for error recovery and resilience

export const errorRecovery = {
  // Check if error is authentication related
  isAuthError: (error: any): boolean => {
    if (!error) return false;
    const message = error.message?.toLowerCase() || '';
    const stack = error.stack?.toLowerCase() || '';
    
    return message.includes('jwt') || 
           message.includes('auth') || 
           message.includes('unauthorized') ||
           message.includes('team_id') ||
           stack.includes('teamcontext') ||
           stack.includes('authentication');
  },

  // Check if error is network related
  isNetworkError: (error: any): boolean => {
    if (!error) return false;
    const message = error.message?.toLowerCase() || '';
    
    return message.includes('network') ||
           message.includes('fetch') ||
           message.includes('timeout') ||
           message.includes('econnreset') ||
           message.includes('enotfound');
  },

  // Check if error is retryable
  isRetryableError: (error: any): boolean => {
    return errorRecovery.isNetworkError(error) && !errorRecovery.isAuthError(error);
  },

  // Safe localStorage operations
  safeLocalStorage: {
    getItem: (key: string): string | null => {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn(`Failed to get localStorage item ${key}:`, error);
        return null;
      }
    },

    setItem: (key: string, value: string): boolean => {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (error) {
        console.warn(`Failed to set localStorage item ${key}:`, error);
        return false;
      }
    },

    removeItem: (key: string): boolean => {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.warn(`Failed to remove localStorage item ${key}:`, error);
        return false;
      }
    }
  },

  // Exponential backoff with jitter
  calculateRetryDelay: (attempt: number, baseDelay: number = 1000, maxDelay: number = 30000): number => {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add up to 10% jitter
    return Math.min(exponentialDelay + jitter, maxDelay);
  },

  // Circuit breaker state management
  circuitBreaker: {
    isOpen: (failures: number, maxFailures: number = 3): boolean => {
      return failures >= maxFailures;
    },

    shouldRetry: (failures: number, lastFailureTime: number, timeout: number = 30000): boolean => {
      const now = Date.now();
      return failures === 0 || (now - lastFailureTime) > timeout;
    }
  },

  // Safe async operation wrapper
  safeAsync: async <T>(
    operation: () => Promise<T>,
    fallback: T,
    errorContext?: string
  ): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Safe async operation failed${errorContext ? ` (${errorContext})` : ''}:`, error);
      return fallback;
    }
  }
};

// Helper function to create resilient operations
export function createResilientOperation<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: any) => boolean;
    onError?: (error: any, attempt: number) => void;
  } = {}
) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = errorRecovery.isRetryableError,
    onError
  } = options;

  return async (...args: T): Promise<R> => {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation(...args);
      } catch (error) {
        lastError = error;
        onError?.(error, attempt);

        // Don't retry on last attempt or non-retryable errors
        if (attempt === maxRetries || !shouldRetry(error)) {
          throw error;
        }

        // Wait before retry
        const delay = errorRecovery.calculateRetryDelay(attempt, baseDelay, maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  };
}