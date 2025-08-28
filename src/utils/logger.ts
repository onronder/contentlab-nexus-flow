/**
 * Production console logger
 * This centralized utility replaces all console.log statements throughout the app
 * with production-appropriate logging
 */

import { supabase } from '@/integrations/supabase/client';

const isProduction = () => process.env.NODE_ENV === 'production';
const isDevelopment = () => process.env.NODE_ENV === 'development';

// Development logging functions
const devLog = (...args: any[]) => {
  if (isDevelopment()) {
    console.log(...args);
  }
};

const devWarn = (...args: any[]) => {
  if (isDevelopment()) {
    console.warn(...args);
  }
  // Always log warnings to buffer for debugging
  logToBuffer('warn', args[0], args.slice(1));
};

const logError = (error: Error | string, context?: string) => {
  const message = error instanceof Error ? error.message : error;
  const stack = error instanceof Error ? error.stack : undefined;
  
  // Always log errors to console
  console.error(`[ERROR] ${context ? `${context}: ` : ''}${message}`, stack);
  
  // Log to buffer
  logToBuffer('error', message, { context, stack });
  
  // In production, also log to Supabase (fire and forget)
  if (isProduction()) {
    // Use the correct field names for the error_logs table
    supabase.from('error_logs').insert({
      error_message: message,
      error_stack: stack,
      error_type: 'application_error',
      context: context ? { source: context } : null,
      created_at: new Date().toISOString(),
      user_agent: navigator.userAgent,
      ip_address: null, // Will be set by server
      resolved: false
    });
    // Note: Supabase insert returns a promise-like object, errors are handled internally
  }
};

// Simple in-memory log buffer for debugging
let logBuffer: Array<{ level: string; message: string; data?: any; timestamp: Date }> = [];
const MAX_BUFFER_SIZE = 100;

const logToBuffer = (level: string, message: string, data?: any) => {
  logBuffer.push({ level, message, data, timestamp: new Date() });
  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer = logBuffer.slice(-MAX_BUFFER_SIZE + 10);
  }
};

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