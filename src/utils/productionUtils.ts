/**
 * Production utility functions for optimizing the application
 */

/**
 * Check if the application is running in production mode
 */
export const isProduction = (): boolean => {
  return import.meta.env.PROD;
};

/**
 * Check if the application is running in development mode
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV;
};

/**
 * Conditional logging that only works in development
 */
export const devLog = (...args: any[]): void => {
  if (isDevelopment()) {
    console.log('[DEV]', ...args);
  }
};

/**
 * Conditional warning that only works in development
 */
export const devWarn = (...args: any[]): void => {
  if (isDevelopment()) {
    console.warn('[DEV]', ...args);
  }
};

/**
 * Conditional error logging (works in both dev and prod)
 */
export const logError = (error: Error | string, context?: string): void => {
  const message = typeof error === 'string' ? error : error.message;
  const stack = typeof error === 'string' ? undefined : error.stack;
  
  if (isDevelopment()) {
    console.error(`[ERROR]${context ? ` [${context}]` : ''}`, message, stack);
  } else {
    // In production, you might want to send to an error tracking service
    // For now, we'll just log to console
    console.error(`[ERROR]${context ? ` [${context}]` : ''}`, message);
  }
};

/**
 * Performance monitoring wrapper
 */
export const measurePerformance = <T>(
  name: string,
  fn: () => T
): T => {
  if (isDevelopment()) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`[PERF] ${name}: ${(end - start).toFixed(2)}ms`);
    return result;
  }
  return fn();
};

/**
 * Async performance monitoring wrapper
 */
export const measureAsyncPerformance = async <T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> => {
  if (isDevelopment()) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    console.log(`[PERF] ${name}: ${(end - start).toFixed(2)}ms`);
    return result;
  }
  return fn();
};

/**
 * Sanitize sensitive data for logging
 */
export const sanitizeForLogging = (data: any): any => {
  const sensitiveKeys = ['password', 'token', 'key', 'secret', 'authorization'];
  
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeForLogging);
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Environment-aware configuration
 */
export const getConfig = () => ({
  apiBaseUrl: isProduction() 
    ? 'https://ijvhqqdfthchtittyvnt.supabase.co' 
    : 'https://ijvhqqdfthchtittyvnt.supabase.co',
  enableAnalytics: isProduction(),
  enableDebugMode: isDevelopment(),
  logLevel: isDevelopment() ? 'debug' : 'error',
  cacheDuration: isProduction() ? 1000 * 60 * 5 : 1000 * 30, // 5 min prod, 30 sec dev
});

/**
 * Feature flag system
 */
export const featureFlags = {
  enableBulkOperations: true,
  enableAdvancedSearch: true,
  enableExportFeatures: true,
  enableRealTimeUpdates: isDevelopment(), // Only in dev for now
  enablePerformanceMetrics: isDevelopment(),
};