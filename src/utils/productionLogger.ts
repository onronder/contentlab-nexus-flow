import { errorMonitoring } from './errorMonitoring';
import { isDevelopment, isProduction } from './production';

/**
 * Production-safe logging utility that replaces all console.* statements
 */
class ProductionLogger {
  private logs: Array<{
    level: 'log' | 'warn' | 'error';
    message: string;
    timestamp: Date;
    context?: any;
  }> = [];

  private maxLogs = 1000;

  /**
   * Log a general message (only in development)
   */
  log(message: string, context?: any) {
    if (isDevelopment()) {
      console.log(message, context);
    }
    this.addToBuffer('log', message, context);
  }

  /**
   * Log a warning (always logged)
   */
  warn(message: string, context?: any) {
    console.warn(message, context);
    this.addToBuffer('warn', message, context);
  }

  /**
   * Log an error (always logged)
   */
  error(message: string, error?: any) {
    console.error(message, error);
    this.addToBuffer('error', message, error);
    
    // Also track in error monitoring if it's an Error object
    if (error instanceof Error) {
      errorMonitoring.logError(error, { action: message });
    }
  }

  /**
   * Log error with detailed context
   */
  errorWithContext(error: Error, context: string, metadata?: any) {
    const message = `${context}: ${error.message}`;
    console.error(message, error, metadata);
    
    this.addToBuffer('error', message, { error, metadata });
    errorMonitoring.logError(error, {
      action: context,
      metadata,
      severity: 'high'
    });
  }

  /**
   * Group logs (only in development)
   */
  group(label: string) {
    if (isDevelopment()) {
      console.group(label);
    }
  }

  /**
   * End log group (only in development)
   */
  groupEnd() {
    if (isDevelopment()) {
      console.groupEnd();
    }
  }

  /**
   * Get recent logs for debugging
   */
  getRecentLogs(count: number = 50) {
    return this.logs.slice(-count);
  }

  /**
   * Clear log buffer
   */
  clearLogs() {
    this.logs = [];
  }

  private addToBuffer(level: 'log' | 'warn' | 'error', message: string, context?: any) {
    this.logs.push({
      level,
      message,
      timestamp: new Date(),
      context
    });

    // Keep buffer size manageable
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs + 100);
    }
  }
}

export const productionLogger = new ProductionLogger();

// Export as default logger replacement
export default productionLogger;
