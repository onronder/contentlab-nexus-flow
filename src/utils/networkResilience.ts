/**
 * Network resilience utilities for handling connection issues and API failures
 */

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
}

interface CircuitBreakerOptions {
  failureThreshold?: number;
  recoveryTimeout?: number;
}

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(private options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: 5,
      recoveryTimeout: 30000, // 30 seconds
      ...options
    };
  }
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime < this.options.recoveryTimeout!) {
        throw new Error('Circuit breaker is open');
      }
      this.state = 'half-open';
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.options.failureThreshold!) {
      this.state = 'open';
    }
  }
  
  getState() {
    return this.state;
  }
}

const circuitBreaker = new CircuitBreaker();

export const isNetworkError = (error: any): boolean => {
  return (
    error.name === 'NetworkError' ||
    error.message?.includes('fetch') ||
    error.message?.includes('network') ||
    error.message?.includes('CORS') ||
    error.code === 'NETWORK_ERROR' ||
    !navigator.onLine
  );
};

export const isRetryableError = (error: any): boolean => {
  // Don't retry auth errors or client errors (4xx)
  if (error.status >= 400 && error.status < 500) {
    return false;
  }
  
  return (
    isNetworkError(error) ||
    error.status >= 500 ||
    error.message?.includes('timeout')
  );
};

export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export const calculateBackoffDelay = (
  attempt: number, 
  baseDelay = 1000, 
  maxDelay = 30000,
  backoffFactor = 2
): number => {
  const exponentialDelay = baseDelay * Math.pow(backoffFactor, attempt);
  const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
};

export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    retryCondition = isRetryableError
  } = options;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await circuitBreaker.execute(operation);
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry if this is the last attempt or error is not retryable
      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }
      
      const delayMs = calculateBackoffDelay(attempt, baseDelay, maxDelay, backoffFactor);
      console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms:`, error);
      
      await delay(delayMs);
    }
  }
  
  throw lastError!;
};

export const withTimeout = <T>(
  promise: Promise<T>, 
  timeoutMs: number = 10000
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
};

export const createResilientFetch = (baseOptions: RequestInit = {}) => {
  return async (url: string, options: RequestInit = {}): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await withRetry(
        () => withTimeout(
          fetch(url, {
            ...baseOptions,
            ...options,
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              ...baseOptions.headers,
              ...options.headers
            }
          }),
          10000
        ),
        {
          maxRetries: 3,
          retryCondition: (error) => {
            // Retry on network errors but not on successful HTTP error responses
            return isNetworkError(error) && !error.response;
          }
        }
      );
      
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  };
};

export const networkHealthCheck = async (): Promise<boolean> => {
  try {
    await withTimeout(fetch('/health', { method: 'HEAD' }), 5000);
    return true;
  } catch {
    return false;
  }
};

export { circuitBreaker };