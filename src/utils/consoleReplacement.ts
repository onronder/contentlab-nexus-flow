/**
 * Production-safe logging replacement for all console statements
 * This utility ensures structured logging across the entire application
 */

import { supabase } from '@/integrations/supabase/client';

const isProduction = () => import.meta.env.PROD;
const isDevelopment = () => import.meta.env.DEV;

interface LogEntry {
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  context?: string;
  timestamp: Date;
  metadata?: any;
}

class ConsoleReplacementLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  /**
   * General logging (development only)
   */
  log(message: string, context?: string, metadata?: any) {
    if (isDevelopment()) {
      // Only use console in development
      if (typeof console !== 'undefined') {
        console.log(`[${context || 'APP'}]`, message, metadata);
      }
    }
    this.addToBuffer('log', message, context, metadata);
  }

  /**
   * Warning logging (always logged)
   */
  warn(message: string, context?: string, metadata?: any) {
    if (isDevelopment()) {
      if (typeof console !== 'undefined') {
        console.warn(`[${context || 'WARN'}]`, message, metadata);
      }
    }
    this.addToBuffer('warn', message, context, metadata);
  }

  /**
   * Error logging (always logged with structured data)
   */
  error(message: string, context?: string, metadata?: any) {
    if (isDevelopment()) {
      if (typeof console !== 'undefined') {
        console.error(`[${context || 'ERROR'}]`, message, metadata);
      }
    }
    
    this.addToBuffer('error', message, context, metadata);
    
    // Log to Supabase in production
    if (isProduction()) {
      this.logToSupabase('error', message, context, metadata);
    }
  }

  /**
   * Info logging (development only)
   */
  info(message: string, context?: string, metadata?: any) {
    this.log(message, context, metadata);
  }

  /**
   * Context-specific loggers
   */
  auth(message: string, metadata?: any) {
    this.log(message, 'AUTH', metadata);
  }

  team(message: string, metadata?: any) {
    this.log(message, 'TEAM', metadata);
  }

  analytics(message: string, metadata?: any) {
    this.log(message, 'ANALYTICS', metadata);
  }

  content(message: string, metadata?: any) {
    this.log(message, 'CONTENT', metadata);
  }

  project(message: string, metadata?: any) {
    this.log(message, 'PROJECT', metadata);
  }

  api(message: string, metadata?: any) {
    this.log(message, 'API', metadata);
  }

  ui(message: string, metadata?: any) {
    this.log(message, 'UI', metadata);
  }

  collaboration(message: string, metadata?: any) {
    this.log(message, 'COLLABORATION', metadata);
  }

  private addToBuffer(level: LogEntry['level'], message: string, context?: string, metadata?: any) {
    this.logs.push({
      level,
      message,
      context,
      timestamp: new Date(),
      metadata
    });

    // Keep buffer manageable
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs + 100);
    }
  }

  private async logToSupabase(level: string, message: string, context?: string, metadata?: any) {
    try {
      await supabase.from('error_logs').insert({
        error_message: message,
        error_type: `${level}_${context?.toLowerCase() || 'general'}`,
        context: { context, metadata },
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        resolved: false
      });
    } catch (error) {
      // Fallback: only log to console in development if Supabase logging fails
      if (isDevelopment() && typeof console !== 'undefined') {
        console.error('Failed to log to Supabase:', error);
      }
    }
  }

  /**
   * Get recent logs for debugging
   */
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear log buffer
   */
  clearLogs() {
    this.logs = [];
  }
}

export const logger = new ConsoleReplacementLogger();
export default logger;
