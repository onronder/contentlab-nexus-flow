import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '@/contexts/AnalyticsContext';

export const usePageTracking = () => {
  const location = useLocation();
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    // Track page view on route change
    trackPageView(location.pathname + location.search, {
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    });
  }, [location, trackPageView]);
};