import { useState, useEffect, useCallback } from 'react';
import { structuredLogger, LogEntry, LogFilter } from '@/services/structuredLoggingService';
import { useAuth } from './useAuth';

export function useLoggingManagement() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogFilter>({});
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshLogs = useCallback(() => {
    setIsLoading(true);
    try {
      const filteredLogs = structuredLogger.getLogs(filter);
      setLogs(filteredLogs);
      
      const logAnalytics = structuredLogger.getLogAnalytics(filter.timeRange);
      setAnalytics(logAnalytics);
    } catch (error) {
      structuredLogger.error('Failed to refresh logs', error as Error, {
        component: 'useLoggingManagement',
        userId: user?.id
      });
    } finally {
      setIsLoading(false);
    }
  }, [filter, user?.id]);

  useEffect(() => {
    refreshLogs();
  }, [refreshLogs]);

  const updateFilter = useCallback((newFilter: Partial<LogFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  const clearFilter = useCallback(() => {
    setFilter({});
  }, []);

  const exportLogs = useCallback((format: 'json' | 'csv' = 'json') => {
    try {
      const exportData = structuredLogger.exportLogs(format, filter);
      const blob = new Blob([exportData], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      structuredLogger.info('Logs exported', {
        component: 'useLoggingManagement',
        userId: user?.id,
        metadata: { format, logCount: logs.length }
      });
    } catch (error) {
      structuredLogger.error('Failed to export logs', error as Error, {
        component: 'useLoggingManagement',
        userId: user?.id
      });
    }
  }, [filter, logs.length, user?.id]);

  const clearLogs = useCallback((olderThan?: Date) => {
    try {
      const deletedCount = structuredLogger.clearLogs(olderThan);
      refreshLogs();
      
      structuredLogger.info('Logs cleared', {
        component: 'useLoggingManagement',
        userId: user?.id,
        metadata: { deletedCount, olderThan }
      });

      return deletedCount;
    } catch (error) {
      structuredLogger.error('Failed to clear logs', error as Error, {
        component: 'useLoggingManagement',
        userId: user?.id
      });
      return 0;
    }
  }, [refreshLogs, user?.id]);

  const searchLogs = useCallback((query: string) => {
    updateFilter({ searchQuery: query });
  }, [updateFilter]);

  const filterByLevel = useCallback((levels: LogEntry['level'][]) => {
    updateFilter({ level: levels });
  }, [updateFilter]);

  const filterByComponent = useCallback((components: string[]) => {
    updateFilter({ component: components });
  }, [updateFilter]);

  const filterByTimeRange = useCallback((start: Date, end: Date) => {
    updateFilter({ timeRange: { start, end } });
  }, [updateFilter]);

  // Real-time log subscription
  useEffect(() => {
    const interval = setInterval(() => {
      refreshLogs();
    }, 5000); // Refresh every 5 seconds for real-time feel

    return () => clearInterval(interval);
  }, [refreshLogs]);

  // Auto-cleanup old logs
  useEffect(() => {
    const cleanup = () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      structuredLogger.clearLogs(oneDayAgo);
    };

    const cleanupInterval = setInterval(cleanup, 60 * 60 * 1000); // Every hour
    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    logs,
    filter,
    analytics,
    isLoading,
    updateFilter,
    clearFilter,
    exportLogs,
    clearLogs,
    searchLogs,
    filterByLevel,
    filterByComponent,
    filterByTimeRange,
    refreshLogs
  };
}