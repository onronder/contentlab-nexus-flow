/**
 * Global console replacement utility
 * This script helps replace all console.* statements with the structured logger
 */

import { productionLogger } from './logger';

// Export logging functions that match console API
export const log = productionLogger.log;
export const warn = productionLogger.warn;
export const error = productionLogger.error;
export const info = productionLogger.log;
export const debug = productionLogger.log;

// Context-specific loggers for different parts of the app
export const logger = {
  analytics: (message: string, ...args: any[]) => productionLogger.analytics(message, ...args),
  auth: (message: string, ...args: any[]) => productionLogger.auth(message, ...args),
  content: (message: string, ...args: any[]) => productionLogger.content(message, ...args),
  project: (message: string, ...args: any[]) => productionLogger.project(message, ...args),
  team: (message: string, ...args: any[]) => productionLogger.team(message, ...args),
  collaboration: (message: string, ...args: any[]) => productionLogger.log(`[COLLABORATION] ${message}`, ...args),
  billing: (message: string, ...args: any[]) => productionLogger.log(`[BILLING] ${message}`, ...args),
  storage: (message: string, ...args: any[]) => productionLogger.log(`[STORAGE] ${message}`, ...args),
  mobile: (message: string, ...args: any[]) => productionLogger.log(`[MOBILE] ${message}`, ...args),
  api: (message: string, ...args: any[]) => productionLogger.log(`[API] ${message}`, ...args),
  ui: (message: string, ...args: any[]) => productionLogger.log(`[UI] ${message}`, ...args),
  error: (error: Error | string, context?: string, metadata?: any) => {
    productionLogger.errorWithContext(error, context || 'Unknown', metadata);
  }
};

// For quick replacement in existing code
export default {
  log,
  warn, 
  error,
  info,
  debug
};