import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useTeamContext } from './TeamContext';
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
  const { currentTeam } = useTeamContext();
  const isInitialized = useRef(false);
  const sessionStartTime = useRef<number>(Date.now());

  // Initialize analytics tracking
  useEffect(() => {
    if (user && !isInitialized.current) {
      initializeAnalytics();
      isInitialized.current = true;
    }
  }, [user]);

  // Track page performance metrics
  useEffect(() => {
    if (!user) return;

    const trackPerformanceMetrics = () => {
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          advancedAnalyticsService.recordSystemMetric({
            metricName: 'page_load_time',
            metricValue: navigation.loadEventEnd - navigation.loadEventStart,
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
    };

    // Track on page load
    if (document.readyState === 'complete') {
      trackPerformanceMetrics();
    } else {
      window.addEventListener('load', trackPerformanceMetrics);
      return () => window.removeEventListener('load', trackPerformanceMetrics);
    }
  }, [user]);

  // Track user session duration
  useEffect(() => {
    if (!user) return;

    const trackSessionEnd = () => {
      const sessionDuration = Date.now() - sessionStartTime.current;
      advancedAnalyticsService.trackUserEvent({
        userId: user.id,
        sessionId: getSessionId(),
        eventType: 'session',
        eventName: 'session_end',
        eventProperties: {
          duration_ms: sessionDuration,
          pages_visited: getVisitedPages(),
          team_id: currentTeam?.id
        },
        pagePath: window.location.pathname
      });
    };

    window.addEventListener('beforeunload', trackSessionEnd);
    return () => window.removeEventListener('beforeunload', trackSessionEnd);
  }, [user, currentTeam]);

  const initializeAnalytics = async () => {
    if (!user) return;

    // Track session start
    await advancedAnalyticsService.trackUserEvent({
      userId: user.id,
      sessionId: getSessionId(),
      eventType: 'session',
      eventName: 'session_start',
      eventProperties: {
        team_id: currentTeam?.id,
        device_type: getDeviceType(),
        browser: getBrowser(),
        user_agent: navigator.userAgent,
        referrer: document.referrer,
        utm_source: new URLSearchParams(window.location.search).get('utm_source'),
        utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
        utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign')
      },
      pagePath: window.location.pathname,
      userAgent: navigator.userAgent,
      deviceType: getDeviceType(),
      browser: getBrowser(),
      referrer: document.referrer
    });
  };

  const trackPageView = async (path: string, properties?: Record<string, any>) => {
    if (!user) return;

    await advancedAnalyticsService.trackPageView(path, {
      userId: user.id,
      eventProperties: {
        team_id: currentTeam?.id,
        ...properties
      }
    });

    // Update visited pages
    updateVisitedPages(path);
  };

  const trackInteraction = async (component: string, action: string, properties?: Record<string, any>) => {
    if (!user) return;

    await advancedAnalyticsService.trackInteraction(component, action, {
      team_id: currentTeam?.id,
      user_id: user.id,
      timestamp: new Date().toISOString(),
      ...properties
    });
  };

  const trackContentView = async (contentId: string, properties?: Record<string, any>) => {
    if (!user) return;

    // Track the view event
    await advancedAnalyticsService.trackCustomEvent({
      teamId: currentTeam?.id,
      userId: user.id,
      eventName: 'content_view',
      eventCategory: 'content',
      entityType: 'content',
      entityId: contentId,
      sourceComponent: 'content_card',
      eventProperties: properties
    });

    // Update content analytics directly
    await updateContentAnalytics(contentId, 'view');
  };

  const trackContentEngagement = async (
    contentId: string, 
    type: 'like' | 'share' | 'comment' | 'download', 
    properties?: Record<string, any>
  ) => {
    if (!user) return;

    // Track the engagement event
    await advancedAnalyticsService.trackCustomEvent({
      teamId: currentTeam?.id,
      userId: user.id,
      eventName: `content_${type}`,
      eventCategory: 'engagement',
      entityType: 'content',
      entityId: contentId,
      sourceComponent: 'content_card',
      eventProperties: properties
    });

    // Update content analytics directly
    await updateContentAnalytics(contentId, type);
  };

  const trackBusinessMetric = async (metric: any) => {
    if (!user) return;

    await advancedAnalyticsService.recordBusinessMetric({
      teamId: currentTeam?.id,
      ...metric
    });
  };

  // Helper function to update content analytics
  const updateContentAnalytics = async (contentId: string, type: string) => {
    try {
      // Get existing analytics or create new
      const { data: existing } = await supabase
        .from('content_analytics')
        .select('*')
        .eq('content_id', contentId)
        .eq('analytics_date', new Date().toISOString().split('T')[0])
        .single();

      const updateData: any = {
        content_id: contentId,
        analytics_date: new Date().toISOString().split('T')[0]
      };

      if (existing) {
        // Update existing record
        switch (type) {
          case 'view':
            updateData.views = (existing.views || 0) + 1;
            break;
          case 'like':
            updateData.likes = (existing.likes || 0) + 1;
            break;
          case 'share':
            updateData.shares = (existing.shares || 0) + 1;
            break;
          case 'comment':
            updateData.comments = (existing.comments || 0) + 1;
            break;
          case 'download':
            updateData.downloads = (existing.downloads || 0) + 1;
            break;
        }

        await supabase
          .from('content_analytics')
          .update(updateData)
          .eq('id', existing.id);
      } else {
        // Create new record
        updateData.views = type === 'view' ? 1 : 0;
        updateData.likes = type === 'like' ? 1 : 0;
        updateData.shares = type === 'share' ? 1 : 0;
        updateData.comments = type === 'comment' ? 1 : 0;
        updateData.downloads = type === 'download' ? 1 : 0;

        await supabase
          .from('content_analytics')
          .insert(updateData);
      }
    } catch (error) {
      console.error('Error updating content analytics:', error);
    }
  };

  // Utility functions
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
    if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
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
    const pages = JSON.parse(sessionStorage.getItem('visited_pages') || '[]');
    if (!pages.includes(path)) {
      pages.push(path);
      sessionStorage.setItem('visited_pages', JSON.stringify(pages));
    }
  };

  const getVisitedPages = (): string[] => {
    return JSON.parse(sessionStorage.getItem('visited_pages') || '[]');
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