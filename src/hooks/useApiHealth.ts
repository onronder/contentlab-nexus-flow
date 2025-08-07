import { useState, useEffect, useCallback } from 'react';
import { apiHealthService, ApiHealthStatus } from '@/services/apiHealthService';
import { rateLimitService, RateLimitStatus } from '@/services/rateLimitService';

export interface ApiHealthInfo extends ApiHealthStatus {
  rateLimitStatus: RateLimitStatus;
  canMakeRequest: boolean;
  estimatedWaitTime: number;
}

export function useApiHealth() {
  const [healthInfo, setHealthInfo] = useState<ApiHealthInfo>({
    ...apiHealthService.getHealthStatus(),
    rateLimitStatus: rateLimitService.getStatus(),
    canMakeRequest: rateLimitService.canMakeRequest(),
    estimatedWaitTime: rateLimitService.getEstimatedWaitTime()
  });

  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const updateHealthInfo = useCallback(() => {
    const healthStatus = apiHealthService.getHealthStatus();
    const rateLimitStatus = rateLimitService.getStatus();
    
    setHealthInfo({
      ...healthStatus,
      rateLimitStatus,
      canMakeRequest: rateLimitService.canMakeRequest(),
      estimatedWaitTime: rateLimitService.getEstimatedWaitTime()
    });
    setLastUpdate(Date.now());
  }, []);

  const forceHealthCheck = useCallback(async () => {
    try {
      await apiHealthService.forceHealthCheck();
      updateHealthInfo();
      return true;
    } catch (error) {
      console.error('Failed to perform health check:', error);
      return false;
    }
  }, [updateHealthInfo]);

  const getHealthScore = useCallback((): number => {
    if (!healthInfo.isHealthy) return 0;
    if (healthInfo.rateLimitStatus.isThrottled) return 25;
    if (healthInfo.consecutiveFailures > 0) return 50;
    if (healthInfo.errorRate > 0.1) return 75;
    return 100;
  }, [healthInfo]);

  const getStatusColor = useCallback((): string => {
    const score = getHealthScore();
    if (score === 0) return 'hsl(var(--destructive))';
    if (score <= 25) return 'hsl(var(--warning))';
    if (score <= 75) return 'hsl(var(--warning))';
    return 'hsl(var(--success))';
  }, [getHealthScore]);

  const getStatusText = useCallback((): string => {
    const score = getHealthScore();
    if (score === 0) return 'Service Unavailable';
    if (score <= 25) return 'Degraded Performance';
    if (score <= 75) return 'Limited Capacity';
    return 'Fully Operational';
  }, [getHealthScore]);

  const isOperational = useCallback((): boolean => {
    return healthInfo.isHealthy && !healthInfo.rateLimitStatus.isThrottled;
  }, [healthInfo]);

  // Update health info every 10 seconds
  useEffect(() => {
    updateHealthInfo();
    const interval = setInterval(updateHealthInfo, 10000);
    return () => clearInterval(interval);
  }, [updateHealthInfo]);

  return {
    healthInfo,
    lastUpdate,
    updateHealthInfo,
    forceHealthCheck,
    getHealthScore,
    getStatusColor,
    getStatusText,
    isOperational,
    // Convenience getters
    isHealthy: healthInfo.isHealthy,
    isThrottled: healthInfo.rateLimitStatus.isThrottled,
    canMakeRequest: healthInfo.canMakeRequest,
    estimatedWaitTime: healthInfo.estimatedWaitTime,
    responseTime: healthInfo.responseTime,
    errorRate: healthInfo.errorRate,
    tokensAvailable: healthInfo.rateLimitStatus.tokensAvailable,
    maxTokens: healthInfo.rateLimitStatus.maxTokens,
    rateLimitStatus: healthInfo.rateLimitStatus
  };
}