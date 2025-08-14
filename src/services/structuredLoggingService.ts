import { productionLogger } from '@/utils/logger';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  correlationId: string;
  userId?: string;
  teamId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  performance?: {
    duration: number;
    memory: number;
  };
  security?: {
    eventType: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface LogFilter {
  level?: LogEntry['level'][];
  component?: string[];
  userId?: string;
  teamId?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

class StructuredLoggingService {
  private logs: LogEntry[] = [];
  private maxLogs = 10000;
  private correlationCounter = 0;

  generateCorrelationId(): string {
    this.correlationCounter++;
    return `${Date.now()}-${this.correlationCounter}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeMetadata(metadata: any): any {
    if (!metadata || typeof metadata !== 'object') return metadata;
    
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];
    const sanitized = { ...metadata };
    
    const sanitizeRecursive = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeRecursive);
      }
      
      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = sanitizeRecursive(value);
          }
        }
        return result;
      }
      
      return obj;
    };
    
    return sanitizeRecursive(sanitized);
  }

  log(entry: Omit<LogEntry, 'id' | 'timestamp' | 'correlationId'> & { correlationId?: string }): LogEntry {
    const logEntry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      correlationId: entry.correlationId || this.generateCorrelationId(),
      ...entry,
      metadata: this.sanitizeMetadata(entry.metadata)
    };

    this.logs.unshift(logEntry);
    
    // Maintain max logs limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Also log to console in development
    const consoleMethod = logEntry.level === 'error' || logEntry.level === 'critical' 
      ? productionLogger.error 
      : logEntry.level === 'warn' 
      ? productionLogger.warn 
      : productionLogger.log;
    
    consoleMethod(`[${logEntry.level.toUpperCase()}] ${logEntry.message}`, {
      correlationId: logEntry.correlationId,
      component: logEntry.component,
      metadata: logEntry.metadata
    });

    return logEntry;
  }

  // Convenience methods
  debug(message: string, options?: Partial<LogEntry>): LogEntry {
    return this.log({ level: 'debug', message, ...options });
  }

  info(message: string, options?: Partial<LogEntry>): LogEntry {
    return this.log({ level: 'info', message, ...options });
  }

  warn(message: string, options?: Partial<LogEntry>): LogEntry {
    return this.log({ level: 'warn', message, ...options });
  }

  error(message: string, error?: Error, options?: Partial<LogEntry>): LogEntry {
    return this.log({
      level: 'error',
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      ...options
    });
  }

  critical(message: string, error?: Error, options?: Partial<LogEntry>): LogEntry {
    return this.log({
      level: 'critical',
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      ...options
    });
  }

  // Security audit logging
  auditSecurity(eventType: string, riskLevel: LogEntry['security']['riskLevel'], message: string, options?: Partial<LogEntry>): LogEntry {
    return this.log({
      level: riskLevel === 'critical' || riskLevel === 'high' ? 'critical' : 'warn',
      message,
      security: { eventType, riskLevel },
      ...options
    });
  }

  // Performance logging
  logPerformance(action: string, duration: number, options?: Partial<LogEntry>): LogEntry {
    const memory = (performance as any).memory?.usedJSHeapSize || 0;
    
    return this.log({
      level: duration > 5000 ? 'warn' : 'info',
      message: `Performance: ${action} completed in ${duration}ms`,
      performance: { duration, memory },
      action,
      ...options
    });
  }

  // Query logs with filtering
  getLogs(filter?: LogFilter): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter?.level?.length) {
      filteredLogs = filteredLogs.filter(log => filter.level!.includes(log.level));
    }

    if (filter?.component?.length) {
      filteredLogs = filteredLogs.filter(log => 
        log.component && filter.component!.includes(log.component)
      );
    }

    if (filter?.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
    }

    if (filter?.teamId) {
      filteredLogs = filteredLogs.filter(log => log.teamId === filter.teamId);
    }

    if (filter?.timeRange) {
      filteredLogs = filteredLogs.filter(log => 
        log.timestamp >= filter.timeRange!.start && 
        log.timestamp <= filter.timeRange!.end
      );
    }

    if (filter?.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      filteredLogs = filteredLogs.filter(log =>
        log.message.toLowerCase().includes(query) ||
        log.component?.toLowerCase().includes(query) ||
        log.action?.toLowerCase().includes(query) ||
        JSON.stringify(log.metadata).toLowerCase().includes(query)
      );
    }

    return filteredLogs;
  }

  // Analytics
  getLogAnalytics(timeRange?: { start: Date; end: Date }) {
    const logs = timeRange ? this.getLogs({ timeRange }) : this.logs;
    
    const levelCounts = logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const componentCounts = logs.reduce((acc, log) => {
      if (log.component) {
        acc[log.component] = (acc[log.component] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const errorPatterns = logs
      .filter(log => log.level === 'error' || log.level === 'critical')
      .reduce((acc, log) => {
        const pattern = log.error?.name || 'Unknown Error';
        acc[pattern] = (acc[pattern] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const securityEvents = logs
      .filter(log => log.security)
      .reduce((acc, log) => {
        const eventType = log.security!.eventType;
        acc[eventType] = (acc[eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalLogs: logs.length,
      levelCounts,
      componentCounts,
      errorPatterns,
      securityEvents,
      avgPerformance: logs
        .filter(log => log.performance)
        .reduce((acc, log) => acc + log.performance!.duration, 0) / 
        logs.filter(log => log.performance).length || 0
    };
  }

  // Export logs for external analysis
  exportLogs(format: 'json' | 'csv' = 'json', filter?: LogFilter): string {
    const logs = this.getLogs(filter);
    
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'message', 'component', 'correlationId', 'userId', 'teamId'];
      const csvRows = logs.map(log => [
        log.timestamp.toISOString(),
        log.level,
        `"${log.message.replace(/"/g, '""')}"`,
        log.component || '',
        log.correlationId,
        log.userId || '',
        log.teamId || ''
      ].join(','));
      
      return [headers.join(','), ...csvRows].join('\n');
    }
    
    return JSON.stringify(logs, null, 2);
  }

  // Clear logs (with retention policy)
  clearLogs(olderThan?: Date): number {
    const initialCount = this.logs.length;
    
    if (olderThan) {
      this.logs = this.logs.filter(log => log.timestamp > olderThan);
    } else {
      this.logs = [];
    }
    
    return initialCount - this.logs.length;
  }
}

export const structuredLogger = new StructuredLoggingService();

// Integration functions for production monitoring
export const sendLogsToDatabase = async (logs: Array<{
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  component?: string;
  module?: string;
  context?: Record<string, any>;
  tags?: string[];
}>) => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const response = await supabase.functions.invoke('log-processor', {
      body: logs
    });

    if (response.error) {
      console.error('Failed to send logs to database:', response.error);
    }

    return response;
  } catch (err) {
    console.error('Log processing failed:', err);
  }
};

export const getLogsFromDatabase = async (filters: {
  level?: string;
  component?: string;
  userId?: string;
  teamId?: string;
  correlationId?: string;
  search?: string;
  hours?: number;
  limit?: number;
} = {}) => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const params = new URLSearchParams();
    if (filters.level) params.append('level', filters.level);
    if (filters.component) params.append('component', filters.component);
    if (filters.userId) params.append('user_id', filters.userId);
    if (filters.teamId) params.append('team_id', filters.teamId);
    if (filters.correlationId) params.append('correlation_id', filters.correlationId);
    if (filters.search) params.append('search', filters.search);
    if (filters.hours) params.append('hours', filters.hours.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await supabase.functions.invoke('log-processor', {
      method: 'GET',
      body: undefined
    });

    return response;
  } catch (err) {
    console.error('Failed to get logs from database:', err);
    return { data: null, error: err };
  }
};