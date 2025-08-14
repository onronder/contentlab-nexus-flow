import { useCallback } from 'react';
import { useAnalytics } from '@/contexts/AnalyticsContext';

export const useContentTracking = () => {
  const { trackContentView, trackContentEngagement, trackInteraction } = useAnalytics();

  const trackView = useCallback((contentId: string, properties?: Record<string, any>) => {
    trackContentView(contentId, {
      viewed_at: new Date().toISOString(),
      ...properties
    });
  }, [trackContentView]);

  const trackLike = useCallback((contentId: string, properties?: Record<string, any>) => {
    trackContentEngagement(contentId, 'like', {
      liked_at: new Date().toISOString(),
      ...properties
    });
  }, [trackContentEngagement]);

  const trackShare = useCallback((contentId: string, shareMethod?: string, properties?: Record<string, any>) => {
    trackContentEngagement(contentId, 'share', {
      shared_at: new Date().toISOString(),
      share_method: shareMethod,
      ...properties
    });
  }, [trackContentEngagement]);

  const trackComment = useCallback((contentId: string, properties?: Record<string, any>) => {
    trackContentEngagement(contentId, 'comment', {
      commented_at: new Date().toISOString(),
      ...properties
    });
  }, [trackContentEngagement]);

  const trackDownload = useCallback((contentId: string, properties?: Record<string, any>) => {
    trackContentEngagement(contentId, 'download', {
      downloaded_at: new Date().toISOString(),
      ...properties
    });
  }, [trackContentEngagement]);

  const trackContentAction = useCallback((action: string, contentId: string, properties?: Record<string, any>) => {
    trackInteraction('content', action, {
      content_id: contentId,
      action_at: new Date().toISOString(),
      ...properties
    });
  }, [trackInteraction]);

  return {
    trackView,
    trackLike,
    trackShare,
    trackComment,
    trackDownload,
    trackContentAction
  };
};