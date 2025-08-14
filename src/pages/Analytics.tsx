import React from 'react';
import { AdvancedAnalyticsDashboard } from '@/components/analytics/AdvancedAnalyticsDashboard';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';

const Analytics = () => {
  const userId = useCurrentUserId();

  return (
    <div className="container mx-auto p-6">
      <AdvancedAnalyticsDashboard userId={userId} />
    </div>
  );
};

export default Analytics;