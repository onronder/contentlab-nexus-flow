import { useEffect, useMemo, useState } from 'react';
import { apiMonitoringService, ApiUsageMetrics, UsageAlert } from '@/services/apiMonitoringService';

export function useApiUsage(pollInterval = 10000) {
  const [metrics, setMetrics] = useState<ApiUsageMetrics>(apiMonitoringService.getUsageMetrics('day'));
  const [alerts, setAlerts] = useState<UsageAlert[]>(apiMonitoringService.getUsageAlerts());

  useEffect(() => {
    const update = () => {
      setMetrics(apiMonitoringService.getUsageMetrics('day'));
      setAlerts(apiMonitoringService.getUsageAlerts());
    };
    update();
    const interval = setInterval(update, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval]);

  const trends = useMemo(() => apiMonitoringService.getUsageTrends(7), []);
  const cost = useMemo(() => apiMonitoringService.getCostBreakdown('day'), []);
  const recentEvents = useMemo(() => apiMonitoringService.getRecentEvents(50), []);

  return {
    metrics,
    alerts,
    trends,
    cost,
    recentEvents,
    exportJson: () => apiMonitoringService.exportUsageData('json'),
    exportCsv: () => apiMonitoringService.exportUsageData('csv'),
    recommendations: apiMonitoringService.getOptimizationRecommendations(),
  };
}
