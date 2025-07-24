import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook for managing focus in accessible interfaces
 */
export const useFocusManagement = () => {
  const lastFocusedElement = useRef<HTMLElement | null>(null);
  const focusTrapRef = useRef<HTMLElement | null>(null);

  /**
   * Store the currently focused element
   */
  const storeFocus = useCallback(() => {
    lastFocusedElement.current = document.activeElement as HTMLElement;
  }, []);

  /**
   * Restore focus to the last stored element
   */
  const restoreFocus = useCallback(() => {
    if (lastFocusedElement.current && document.contains(lastFocusedElement.current)) {
      lastFocusedElement.current.focus();
    }
  }, []);

  /**
   * Focus the first focusable element in a container
   */
  const focusFirst = useCallback((container?: HTMLElement) => {
    const element = container || document.body;
    const focusable = element.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) {
      focusable.focus();
    }
  }, []);

  /**
   * Set up focus trap for modals and dialogs
   */
  const setupFocusTrap = useCallback((element: HTMLElement | null) => {
    focusTrapRef.current = element;
    
    if (!element) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = element.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab: moving backwards
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    
    // Focus first element
    focusFirst(element);

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusFirst]);

  /**
   * Remove focus trap
   */
  const removeFocusTrap = useCallback(() => {
    focusTrapRef.current = null;
  }, []);

  /**
   * Navigate to next/previous focusable element with arrow keys
   */
  const handleArrowNavigation = useCallback((
    event: React.KeyboardEvent,
    container: HTMLElement,
    orientation: 'horizontal' | 'vertical' = 'vertical'
  ) => {
    const isHorizontal = orientation === 'horizontal';
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';

    if (event.key !== nextKey && event.key !== prevKey) return;

    event.preventDefault();
    
    const focusableElements = Array.from(
      container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    );

    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    let nextIndex: number;

    if (event.key === nextKey) {
      nextIndex = currentIndex + 1;
      if (nextIndex >= focusableElements.length) nextIndex = 0;
    } else {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) nextIndex = focusableElements.length - 1;
    }

    focusableElements[nextIndex]?.focus();
  }, []);

  /**
   * Create accessible button props
   */
  const getButtonProps = useCallback((
    label: string,
    description?: string,
    expanded?: boolean,
    controls?: string
  ) => ({
    'aria-label': label,
    'aria-describedby': description,
    'aria-expanded': expanded,
    'aria-controls': controls,
    type: 'button' as const,
  }), []);

  /**
   * Create accessible link props
   */
  const getLinkProps = useCallback((
    label: string,
    description?: string,
    current?: boolean
  ) => ({
    'aria-label': label,
    'aria-describedby': description,
    'aria-current': current ? 'page' : undefined,
  }), []);

  return {
    storeFocus,
    restoreFocus,
    focusFirst,
    setupFocusTrap,
    removeFocusTrap,
    handleArrowNavigation,
    getButtonProps,
    getLinkProps,
  };
};