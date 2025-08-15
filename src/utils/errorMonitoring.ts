/**
 * Centralized error monitoring and reporting system
 */
import { productionLogger } from './logger';
import { shouldLogError, isBrowserExtensionError, cleanErrorMessage } from './errorFiltering';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  teamId?: string;
  projectId?: string;
  fingerprint?: string;
  metadata?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorMetrics {
  errorCount: number;
  errorRate: number;
  lastError?: Date;
  commonErrors: Array<{
    message: string;
    count: number;
    lastOccurred: Date;
  }>;
}

class ErrorMonitoringService {
  private errorBuffer: Array<{
    error: Error;
    context: ErrorContext;
    timestamp: Date;
  }> = [];
  
  private maxBufferSize = 100;
  private errorCounts = new Map<string, number>();
  
  /**
   * Log an error with context for monitoring
   */
  logError(error: Error | string, context: ErrorContext = {}) {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    
    // Skip browser extension errors and other noise
    if (!shouldLogError(errorObj)) {
      return;
    }

    const timestamp = new Date();
    const entry = { error: errorObj, context, timestamp };
    
    // Add to buffer
    this.errorBuffer.push(entry);
    if (this.errorBuffer.length > this.maxBufferSize) {
      this.errorBuffer.shift();
    }
    
    // Update error counts
    const errorKey = this.getErrorKey(errorObj);
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
    
    // Log based on severity
    const severity = context.severity || this.determineSeverity(errorObj, context);
    
    if (severity === 'critical') {
      productionLogger.errorWithContext(
        errorObj,
        'ErrorMonitoring',
        {
          context,
          errorCount: this.errorCounts.get(errorKey)
        }
      );
    } else if (severity === 'high') {
      productionLogger.error(`[HIGH] ${errorObj.message}`);
    } else {
      productionLogger.warn(`[${severity.toUpperCase()}] ${errorObj.message}`);
    }
  }

  /**
   * Get current error metrics
   */
  getErrorMetrics(): ErrorMetrics {
    const now = new Date();
    const last24Hours = now.getTime() - (24 * 60 * 60 * 1000);
    
    const recentErrors = this.errorBuffer.filter(
      entry => entry.timestamp.getTime() > last24Hours
    );
    
    const errorCount = recentErrors.length;
    const errorRate = errorCount / 24; // errors per hour
    
    const commonErrors = Array.from(this.errorCounts.entries())
      .map(([message, count]) => ({
        message,
        count,
        lastOccurred: this.getLastOccurrence(message)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      errorCount,
      errorRate,
      lastError: recentErrors.length > 0 ? recentErrors[recentErrors.length - 1].timestamp : undefined,
      commonErrors
    };
  }

  /**
   * Check if error is related to browser extensions (delegated to errorFiltering module)
   */
  private isBrowserExtensionError(error: Error): boolean {
    return isBrowserExtensionError(error);
  }

  /**
   * Determine error severity based on error type and context
   */
  private determineSeverity(error: Error, context: ErrorContext): 'low' | 'medium' | 'high' | 'critical' {
    // Critical errors
    if (error.message?.includes('permission denied') ||
        error.message?.includes('policy') ||
        error.message?.includes('RLS') ||
        context.component === 'auth') {
      return 'critical';
    }
    
    // High severity errors
    if (error.message?.includes('network') ||
        error.message?.includes('timeout') ||
        error.name === 'TypeError' ||
        context.component === 'database') {
      return 'high';
    }
    
    // Medium severity errors
    if (error.name === 'ReferenceError' ||
        error.message?.includes('undefined') ||
        context.component === 'ui') {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Generate a key for error grouping
   */
  private getErrorKey(error: Error): string {
    // Group similar errors together
    const message = error.message?.replace(/\d+/g, 'N').substring(0, 100);
    return `${error.name}:${message}`;
  }

  /**
   * Get the last occurrence of an error
   */
  private getLastOccurrence(errorKey: string): Date {
    const matches = this.errorBuffer.filter(entry => 
      this.getErrorKey(entry.error) === errorKey
    );
    
    return matches.length > 0 
      ? matches[matches.length - 1].timestamp 
      : new Date();
  }

  /**
   * Clear error buffer (useful for testing)
   */
  clearBuffer() {
    this.errorBuffer = [];
    this.errorCounts.clear();
  }
}

// Export singleton instance
export const errorMonitoring = new ErrorMonitoringService();

// Helper functions for common error types
export const logDatabaseError = (error: Error | string, operation: string, metadata?: any) => {
  errorMonitoring.logError(error, {
    component: 'database',
    action: operation,
    metadata,
    severity: 'high'
  });
};

export const logAuthError = (error: Error | string, action: string, metadata?: any) => {
  errorMonitoring.logError(error, {
    component: 'auth',
    action,
    metadata,
    severity: 'critical'
  });
};

export const logUIError = (error: Error | string, component: string, metadata?: any) => {
  errorMonitoring.logError(error, {
    component: 'ui',
    action: component,
    metadata,
    severity: 'medium'
  });
};

export const logNetworkError = (error: Error | string, endpoint: string, metadata?: any) => {
  errorMonitoring.logError(error, {
    component: 'network',
    action: endpoint,
    metadata,
    severity: 'high'
  });
};