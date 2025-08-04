import { useState, useEffect, useCallback } from 'react';

interface QueueStatus {
  queueLength: number;
  isProcessing: boolean;
  circuitBreakerOpen: boolean;
  estimatedWaitTime: number;
  consecutiveFailures?: number;
}

export function useCircuitBreakerStatus() {
  const [status, setStatus] = useState<QueueStatus>({
    queueLength: 0,
    isProcessing: false,
    circuitBreakerOpen: false,
    estimatedWaitTime: 0
  });

  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const checkStatus = useCallback(() => {
    try {
      const queueStatus = (window as any).requestQueueService?.getQueueStatus();
      if (queueStatus) {
        setStatus(queueStatus);
        setLastUpdate(Date.now());
      }
    } catch (error) {
      console.warn('Failed to get circuit breaker status:', error);
    }
  }, []);

  const resetCircuitBreaker = useCallback(() => {
    try {
      (window as any).requestQueueService?.clearQueue();
      checkStatus(); // Immediately update status after reset
      return true;
    } catch (error) {
      console.error('Failed to reset circuit breaker:', error);
      return false;
    }
  }, [checkStatus]);

  const getHealthScore = useCallback(() => {
    if (status.circuitBreakerOpen) return 0;
    if (status.queueLength > 10) return 25;
    if (status.queueLength > 5) return 50;
    if (status.isProcessing) return 75;
    return 100;
  }, [status]);

  const isHealthy = useCallback(() => {
    return !status.circuitBreakerOpen && status.queueLength < 5;
  }, [status]);

  // Poll status every 5 seconds
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return {
    status,
    lastUpdate,
    checkStatus,
    resetCircuitBreaker,
    getHealthScore,
    isHealthy,
    isCircuitBreakerOpen: status.circuitBreakerOpen,
    queueLength: status.queueLength,
    isProcessing: status.isProcessing,
    estimatedWaitTime: status.estimatedWaitTime
  };
}