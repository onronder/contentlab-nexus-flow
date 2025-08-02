/**
 * Production console logger
 * This centralized utility replaces all console.log statements throughout the app
 * with production-appropriate logging
 */

import { logError, devLog, devWarn, isProduction } from '@/utils/productionUtils';

/**
 * Helper function to quickly replace all remaining console logs in components
 */
export const productionLogger = {
  log: devLog,
  warn: devWarn,
  error: logError,
  
  // Component-specific loggers
  auth: (message: string, ...args: any[]) => devLog('[AUTH]', message, ...args),
  project: (message: string, ...args: any[]) => devLog('[PROJECT]', message, ...args),
  team: (message: string, ...args: any[]) => devLog('[TEAM]', message, ...args),
  content: (message: string, ...args: any[]) => devLog('[CONTENT]', message, ...args),
  analytics: (message: string, ...args: any[]) => devLog('[ANALYTICS]', message, ...args),
  
  // Error logging with context
  errorWithContext: (error: Error | string, context: string, metadata?: Record<string, any>) => {
    logError(error, context);
    if (metadata && !isProduction()) {
      devLog(`[${context}] Additional context:`, metadata);
    }
  }
};

// Export shorthand aliases
export const pLog = productionLogger.log;
export const pWarn = productionLogger.warn;
export const pError = productionLogger.error;