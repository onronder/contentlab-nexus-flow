import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface KeyboardShortcuts {
  onCreateProject?: () => void;
  onSearch?: () => void;
  onToggleFilters?: () => void;
  onEscape?: () => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
}

/**
 * Hook for managing keyboard shortcuts with accessibility support
 */
export const useKeyboardShortcuts = (shortcuts: KeyboardShortcuts) => {
  const navigate = useNavigate();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in form elements
    const target = event.target as HTMLElement;
    const isInInput = target.tagName === 'INPUT' || 
                     target.tagName === 'TEXTAREA' || 
                     target.contentEditable === 'true' ||
                     target.closest('[role="combobox"]') ||
                     target.closest('[role="textbox"]');

    // Allow Escape key even in form elements
    if (event.key === 'Escape') {
      event.preventDefault();
      shortcuts.onEscape?.();
      return;
    }

    // Skip other shortcuts if in form elements
    if (isInInput) return;

    const isCtrlOrCmd = event.ctrlKey || event.metaKey;

    // Ctrl/Cmd + N: Create new project
    if (isCtrlOrCmd && event.key === 'n') {
      event.preventDefault();
      shortcuts.onCreateProject?.();
    }

    // Ctrl/Cmd + F: Focus search
    if (isCtrlOrCmd && event.key === 'f') {
      event.preventDefault();
      shortcuts.onSearch?.();
    }

    // Ctrl/Cmd + A: Select all (when not in form)
    if (isCtrlOrCmd && event.key === 'a') {
      event.preventDefault();
      shortcuts.onSelectAll?.();
    }

    // Ctrl/Cmd + D: Clear selection
    if (isCtrlOrCmd && event.key === 'd') {
      event.preventDefault();
      shortcuts.onClearSelection?.();
    }

    // F: Toggle filters (when not in form)
    if (!isCtrlOrCmd && event.key === 'f') {
      event.preventDefault();
      shortcuts.onToggleFilters?.();
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Return keyboard shortcut info for screen readers
  const getShortcutAria = () => ({
    'aria-keyshortcuts': 'Control+N Control+F F Escape Control+A Control+D'
  });

  return {
    getShortcutAria
  };
};