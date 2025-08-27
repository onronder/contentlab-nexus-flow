import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { advancedAnalyticsService } from '@/services/advancedAnalyticsService';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsContextType {
  trackPageView: (path: string, properties?: Record<string, any>) => void;
  trackInteraction: (component: string, action: string, properties?: Record<string, any>) => void;
  trackContentView: (contentId: string, properties?: Record<string, any>) => void;
  trackContentEngagement: (contentId: string, type: 'like' | 'share' | 'comment' | 'download', properties?: Record<string, any>) => void;
  trackBusinessMetric: (metric: any) => void;
  isInitialized: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const AnalyticsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  // We'll access team context through hook where needed, not at the provider level
  const isInitialized = useRef(false);
  const sessionStartTime = useRef<number>(Date.now());
  const lastPageView = useRef<string>('');
  const lastPageViewTime = useRef<number>(0);

  // Reduced frequency constants
  const PAGE_VIEW_DEBOUNCE = 2000; // 2 seconds
  const PERFORMANCE_TRACK_INTERVAL = 30000; // 30 seconds
  const SESSION_TRACK_INTERVAL = 60000; // 1 minute

  // Initialize analytics tracking
  useEffect(() => {
    if (user && !isInitialized.current) {
      initializeAnalytics();
      isInitialized.current = true;
    }
  }, [user]);

  // Track page performance metrics with reduced frequency
  useEffect(() => {
    if (!user) return;

    const trackPerformanceMetrics = () => {
      try {
        if ('performance' in window) {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation && navigation.loadEventEnd > 0) {
            // Only track if load time is reasonable (not a cached/instant load)
            const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
            if (loadTime > 100) { // Skip very fast loads
              advancedAnalyticsService.recordSystemMetric({
                metricName: 'page_load_time',
                metricValue: loadTime,
                metricUnit: 'ms',
                dimensions: {
                  page: window.location.pathname,
                  device: getDeviceType(),
                  browser: getBrowser()
                },
                aggregationPeriod: 'hourly',
                periodStart: new Date().toISOString(),
                periodEnd: new Date().toISOString()
              });
            }
          }
        }
      } catch (error) {
        console.error('Performance tracking failed:', error);
      }
    };

    // Track performance with delay to ensure page is fully loaded
    const performanceTimer = setTimeout(trackPerformanceMetrics, PERFORMANCE_TRACK_INTERVAL);
    return () => clearTimeout(performanceTimer);
  }, [user]);

  // Track user session duration with reduced frequency
  useEffect(() => {
    if (!user) return;

    const trackSessionActivity = () => {
      try {
        const sessionDuration = Date.now() - sessionStartTime.current;
        // Only track if session is meaningful (> 10 seconds)
        if (sessionDuration > 10000) {
          advancedAnalyticsService.trackUserEvent({
            userId: user.id,
            sessionId: getSessionId(),
            eventType: 'session',
            eventName: 'session_activity',
            eventProperties: {
              duration_ms: sessionDuration,
              pages_visited: getVisitedPages().length,
              team_id: getCurrentTeamId(),
              is_active: document.visibilityState === 'visible'
            },
            pagePath: window.location.pathname
          });
        }
      } catch (error) {
        console.error('Session activity tracking failed:', error);
      }
    };

    // Track session activity periodically
    const sessionInterval = setInterval(trackSessionActivity, SESSION_TRACK_INTERVAL);

    // Track session end on page unload
    const trackSessionEnd = () => {
      try {
        const sessionDuration = Date.now() - sessionStartTime.current;
        if (sessionDuration > 5000) { // Only track sessions > 5 seconds
          navigator.sendBeacon('/api/analytics/session-end', JSON.stringify({
            userId: user.id,
            sessionId: getSessionId(),
            duration_ms: sessionDuration,
            pages_visited: getVisitedPages().length,
            team_id: getCurrentTeamId()
          }));
        }
      } catch (error) {
        console.error('Session end tracking failed:', error);
      }
    };

    window.addEventListener('beforeunload', trackSessionEnd);
    
    return () => {
      clearInterval(sessionInterval);
      window.removeEventListener('beforeunload', trackSessionEnd);
    };
  }, [user]);

  const initializeAnalytics = async () => {
    if (!user) return;

    try {
      // Track session start with minimal data
      await advancedAnalyticsService.trackUserEvent({
        userId: user.id,
        sessionId: getSessionId(),
        eventType: 'session',
        eventName: 'session_start',
        eventProperties: {
          team_id: getCurrentTeamId(),
          device_type: getDeviceType(),
          browser: getBrowser(),
          referrer: document.referrer,
          utm_source: new URLSearchParams(window.location.search).get('utm_source')
        },
        pagePath: window.location.pathname,
        deviceType: getDeviceType(),
        browser: getBrowser(),
        referrer: document.referrer
      });
    } catch (error) {
      console.error('Analytics initialization failed:', error);
    }
  };

  const trackPageView = async (path: string, properties?: Record<string, any>) => {
    if (!user) return;

    // Debounce page views
    const now = Date.now();
    if (lastPageView.current === path && now - lastPageViewTime.current < PAGE_VIEW_DEBOUNCE) {
      return;
    }

    lastPageView.current = path;
    lastPageViewTime.current = now;

    try {
      await advancedAnalyticsService.trackPageView(path, {
        userId: user.id,
        eventProperties: {
          team_id: getCurrentTeamId(),
          ...properties
        }
      });

      // Update visited pages
      updateVisitedPages(path);
    } catch (error) {
      console.error('Page view tracking failed:', error);
    }
  };

  const trackInteraction = async (component: string, action: string, properties?: Record<string, any>) => {
    if (!user) return;

    try {
      await advancedAnalyticsService.trackInteraction(component, action, {
        team_id: getCurrentTeamId(),
        user_id: user.id,
        timestamp: new Date().toISOString(),
        ...properties
      });
    } catch (error) {
      console.error('Interaction tracking failed:', error);
    }
  };

  const trackContentView = async (contentId: string, properties?: Record<string, any>) => {
    if (!user || !contentId) return;

    try {
      // Track the view event
      await advancedAnalyticsService.trackCustomEvent({
        teamId: getCurrentTeamId(),
        userId: user.id,
        eventName: 'content_view',
        eventCategory: 'content',
        entityType: 'content',
        entityId: contentId,
        sourceComponent: 'content_card',
        eventProperties: properties
      });

      // Update content analytics in background
      updateContentAnalytics(contentId, 'view').catch(error => {
        console.error('Content analytics update failed:', error);
      });
    } catch (error) {
      console.error('Content view tracking failed:', error);
    }
  };

  const trackContentEngagement = async (
    contentId: string, 
    type: 'like' | 'share' | 'comment' | 'download', 
    properties?: Record<string, any>
  ) => {
    if (!user || !contentId) return;

    try {
      // Track the engagement event
      await advancedAnalyticsService.trackCustomEvent({
        teamId: getCurrentTeamId(),
        userId: user.id,
        eventName: `content_${type}`,
        eventCategory: 'engagement',
        entityType: 'content',
        entityId: contentId,
        sourceComponent: 'content_card',
        eventProperties: properties
      });

      // Update content analytics in background
      updateContentAnalytics(contentId, type).catch(error => {
        console.error('Content analytics update failed:', error);
      });
    } catch (error) {
      console.error('Content engagement tracking failed:', error);
    }
  };

  const trackBusinessMetric = async (metric: any) => {
    if (!user) return;

    try {
      await advancedAnalyticsService.recordBusinessMetric({
        teamId: getCurrentTeamId(),
        ...metric
      });
    } catch (error) {
      console.error('Business metric tracking failed:', error);
    }
  };

  // Optimized content analytics update with error handling
  const updateContentAnalytics = async (contentId: string, type: string) => {
    try {
      // Use upsert pattern for better performance
      const updateData: any = {
        content_id: contentId,
        analytics_date: new Date().toISOString().split('T')[0],
        [`${type}s`]: 1 // Will be handled by database with increment
      };

      const { error } = await supabase
        .from('content_analytics')
        .upsert(updateData, {
          onConflict: 'content_id,analytics_date',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Error updating content analytics:', error);
      }
    } catch (error) {
      console.error('Content analytics update failed:', error);
    }
  };

  // Utility functions (simplified and cached)
  const getSessionId = (): string => {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  };

  const getDeviceType = (): string => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|phone/i.test(userAgent)) {
      return 'mobile';
    } else if (/tablet|ipad/i.test(userAgent)) {
      return 'tablet';
    }
    return 'desktop';
  };

  const getBrowser = (): string => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome')) return 'chrome';
    if (userAgent.includes('firefox')) return 'firefox';
    if (userAgent.includes('safari')) return 'safari';
    if (userAgent.includes('edge')) return 'edge';
    return 'unknown';
  };

  const updateVisitedPages = (path: string) => {
    try {
      const pages = JSON.parse(sessionStorage.getItem('visited_pages') || '[]');
      if (!pages.includes(path)) {
        pages.push(path);
        // Limit to last 20 pages to prevent memory issues
        if (pages.length > 20) {
          pages.splice(0, pages.length - 20);
        }
        sessionStorage.setItem('visited_pages', JSON.stringify(pages));
      }
    } catch (error) {
      console.error('Failed to update visited pages:', error);
    }
  };

  const getVisitedPages = (): string[] => {
    try {
      return JSON.parse(sessionStorage.getItem('visited_pages') || '[]');
    } catch {
      return [];
    }
  };

  const getCurrentTeamId = (): string | undefined => {
    try {
      // Access team context safely by checking if it exists in the DOM
      const teamData = sessionStorage.getItem('current_team_id');
      return teamData ? JSON.parse(teamData) : undefined;
    } catch {
      return undefined;
    }
  };

  const value: AnalyticsContextType = {
    trackPageView,
    trackInteraction,
    trackContentView,
    trackContentEngagement,
    trackBusinessMetric,
    isInitialized: isInitialized.current
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};