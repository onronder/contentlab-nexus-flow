import { useEffect } from 'react';
import { useAnalytics } from '@/contexts/AnalyticsContext';

export const useBusinessMetricsTracking = () => {
  const { trackBusinessMetric } = useAnalytics();

  const trackProjectCreation = (projectData: any) => {
    trackBusinessMetric({
      metricCategory: 'growth',
      metricName: 'project_created',
      metricValue: 1,
      timePeriod: 'daily',
      metricDate: new Date().toISOString().split('T')[0],
      segmentFilters: {
        industry: projectData.industry,
        project_type: projectData.project_type
      }
    });
  };

  const trackTeamActivity = (activityType: string, value: number = 1) => {
    trackBusinessMetric({
      metricCategory: 'engagement',
      metricName: `team_${activityType}`,
      metricValue: value,
      timePeriod: 'daily',
      metricDate: new Date().toISOString().split('T')[0]
    });
  };

  const trackContentPublication = (contentData: any) => {
    trackBusinessMetric({
      metricCategory: 'conversion',
      metricName: 'content_published',
      metricValue: 1,
      timePeriod: 'daily',
      metricDate: new Date().toISOString().split('T')[0],
      segmentFilters: {
        content_type: contentData.content_type,
        file_size_category: contentData.file_size > 10485760 ? 'large' : 'small'
      }
    });
  };

  const trackUserRetention = (sessionDuration: number) => {
    trackBusinessMetric({
      metricCategory: 'engagement',
      metricName: 'session_duration',
      metricValue: sessionDuration,
      timePeriod: 'daily',
      metricDate: new Date().toISOString().split('T')[0]
    });
  };

  const trackConversionEvent = (conversionType: string, value: number) => {
    trackBusinessMetric({
      metricCategory: 'conversion',
      metricName: conversionType,
      metricValue: value,
      timePeriod: 'daily',
      metricDate: new Date().toISOString().split('T')[0]
    });
  };

  return {
    trackProjectCreation,
    trackTeamActivity,
    trackContentPublication,
    trackUserRetention,
    trackConversionEvent
  };
};