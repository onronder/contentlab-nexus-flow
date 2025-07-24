import { useCallback, useRef } from 'react';

type AnnouncementPriority = 'polite' | 'assertive';

/**
 * Hook for making accessible announcements to screen readers
 */
export const useAccessibleAnnouncement = () => {
  const announcementRef = useRef<HTMLDivElement | null>(null);

  /**
   * Announce a message to screen readers
   */
  const announce = useCallback((
    message: string, 
    priority: AnnouncementPriority = 'polite'
  ) => {
    // Create or get existing announcement element
    let announcer = announcementRef.current;
    
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.setAttribute('aria-live', priority);
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      announcer.style.cssText = `
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      `;
      document.body.appendChild(announcer);
      announcementRef.current = announcer;
    }

    // Clear previous message and set new one
    announcer.textContent = '';
    
    // Small delay to ensure screen readers pick up the change
    setTimeout(() => {
      if (announcer) {
        announcer.textContent = message;
      }
    }, 100);
  }, []);

  /**
   * Announce loading state
   */
  const announceLoading = useCallback((resource: string) => {
    announce(`Loading ${resource}`, 'polite');
  }, [announce]);

  /**
   * Announce success message
   */
  const announceSuccess = useCallback((message: string) => {
    announce(`Success: ${message}`, 'polite');
  }, [announce]);

  /**
   * Announce error message
   */
  const announceError = useCallback((message: string) => {
    announce(`Error: ${message}`, 'assertive');
  }, [announce]);

  /**
   * Announce result count for searches/filters
   */
  const announceResultCount = useCallback((count: number, resource: string) => {
    const message = count === 0 
      ? `No ${resource} found`
      : count === 1 
        ? `1 ${resource} found`
        : `${count} ${resource} found`;
    announce(message, 'polite');
  }, [announce]);

  /**
   * Announce page change
   */
  const announcePageChange = useCallback((pageName: string) => {
    announce(`Navigated to ${pageName}`, 'polite');
  }, [announce]);

  /**
   * Announce selection change
   */
  const announceSelectionChange = useCallback((
    selectedCount: number, 
    totalCount: number, 
    resource: string
  ) => {
    const message = selectedCount === 0
      ? `No ${resource} selected`
      : selectedCount === totalCount
        ? `All ${selectedCount} ${resource} selected`
        : `${selectedCount} of ${totalCount} ${resource} selected`;
    announce(message, 'polite');
  }, [announce]);

  return {
    announce,
    announceLoading,
    announceSuccess,
    announceError,
    announceResultCount,
    announcePageChange,
    announceSelectionChange,
  };
};